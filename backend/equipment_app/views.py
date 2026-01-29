from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
import csv
import json
from io import StringIO

from .models import UploadedDataset, Equipment
from .serializers import UploadedDatasetSerializer, EquipmentSerializer, UploadSerializer


class UploadedDatasetViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing uploaded datasets
    """
    queryset = UploadedDataset.objects.all()
    serializer_class = UploadedDatasetSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Filter datasets by user if authenticated"""
        # For admin - return all datasets without limit
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return UploadedDataset.objects.all().order_by('-upload_date')
        
        # For list action, limit to 5 most recent
        # For other actions (retrieve, update, destroy), return all
        if self.action == 'list':
            if self.request.user.is_authenticated:
                return UploadedDataset.objects.filter(user=self.request.user).order_by('-upload_date')[:5]
            return UploadedDataset.objects.all().order_by('-upload_date')[:5]
        
        # For detail actions, don't limit
        if self.request.user.is_authenticated:
            return UploadedDataset.objects.filter(user=self.request.user)
        return UploadedDataset.objects.all()
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get ALL datasets (for admin panel)"""
        datasets = UploadedDataset.objects.all().order_by('-upload_date')
        serializer = UploadedDatasetSerializer(datasets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Handle CSV file upload and processing"""
        try:
            # Check if file is present
            if 'csv_file' not in request.FILES:
                return Response(
                    {'error': 'No file uploaded. Please select a CSV file.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            csv_file = request.FILES['csv_file']
            
            # Validate file extension
            if not csv_file.name.endswith('.csv'):
                return Response(
                    {'error': 'Invalid file type. Please upload a CSV file.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Read and decode the file
            try:
                file_content = csv_file.read()
                decoded_file = file_content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    decoded_file = file_content.decode('latin-1')
                except Exception:
                    return Response(
                        {'error': 'Unable to decode file. Please ensure it is a valid CSV file.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(decoded_file))
            rows = list(csv_reader)
            
            # Validate file has data
            if not rows:
                return Response(
                    {'error': 'CSV file is empty. Please upload a file with data.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate required columns
            required_columns = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']
            actual_columns = list(rows[0].keys())
            missing_columns = [col for col in required_columns if col not in actual_columns]
            
            if missing_columns:
                return Response(
                    {'error': f'Missing required columns: {missing_columns}. Expected: {required_columns}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate and calculate statistics
            equipment_count = len(rows)
            flowrates = []
            pressures = []
            temperatures = []
            
            for idx, row in enumerate(rows, start=1):
                try:
                    flowrates.append(float(row['Flowrate']))
                    pressures.append(float(row['Pressure']))
                    temperatures.append(float(row['Temperature']))
                except (ValueError, KeyError) as e:
                    return Response(
                        {'error': f'Invalid numeric value in row {idx}: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            avg_flowrate = sum(flowrates) / len(flowrates) if flowrates else 0
            avg_pressure = sum(pressures) / len(pressures) if pressures else 0
            avg_temperature = sum(temperatures) / len(temperatures) if temperatures else 0
            
            # Type distribution
            type_counts = {}
            for row in rows:
                eq_type = row['Type'].strip()
                type_counts[eq_type] = type_counts.get(eq_type, 0) + 1
            
            # Create new file object from the content
            from django.core.files.base import ContentFile
            new_file = ContentFile(file_content, name=csv_file.name)
            
            # Create dataset record
            dataset = UploadedDataset.objects.create(
                filename=csv_file.name,
                user=request.user if request.user.is_authenticated else None,
                csv_file=new_file,
                equipment_count=equipment_count,
                avg_flowrate=avg_flowrate,
                avg_pressure=avg_pressure,
                avg_temperature=avg_temperature,
                type_distribution=type_counts
            )
            
            # Create equipment records
            equipment_list = []
            for row in rows:
                equipment = Equipment(
                    dataset=dataset,
                    name=row['Equipment Name'].strip(),
                    equipment_type=row['Type'].strip(),
                    flowrate=float(row['Flowrate']),
                    pressure=float(row['Pressure']),
                    temperature=float(row['Temperature'])
                )
                equipment_list.append(equipment)
            
            Equipment.objects.bulk_create(equipment_list)
            
            serializer = UploadedDatasetSerializer(dataset)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Upload error: {error_details}")  # Log to console
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of all datasets (last 5)"""
        datasets = self.get_queryset()
        
        total_equipment = sum(d.equipment_count for d in datasets)
        
        summary = {
            'total_datasets': datasets.count(),
            'total_equipment': total_equipment,
            'datasets': UploadedDatasetSerializer(datasets, many=True).data
        }
        
        return Response(summary)
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed information about a specific dataset"""
        dataset = self.get_object()
        equipment = dataset.equipment_items.all()
        
        return Response({
            'dataset': UploadedDatasetSerializer(dataset).data,
            'equipment': EquipmentSerializer(equipment, many=True).data,
            'total_equipment': len(equipment)
        })


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing equipment records
    """
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    
    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get ALL equipment (for admin panel)"""
        equipment = Equipment.objects.all()
        serializer = self.get_serializer(equipment, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get aggregated statistics for all equipment"""
        from django.db.models import Avg, Count
        
        equipment = Equipment.objects.all()
        total = equipment.count()
        
        if total == 0:
            return Response({
                'total_equipment': 0,
                'avg_flowrate': 0,
                'avg_pressure': 0,
                'avg_temperature': 0,
                'type_distribution': {}
            })
        
        # Calculate averages
        aggregates = equipment.aggregate(
            avg_flowrate=Avg('flowrate'),
            avg_pressure=Avg('pressure'),
            avg_temperature=Avg('temperature')
        )
        
        # Type distribution
        type_counts = equipment.values('equipment_type').annotate(count=Count('id'))
        type_distribution = {item['equipment_type']: item['count'] for item in type_counts}
        
        return Response({
            'total_equipment': total,
            'avg_flowrate': round(aggregates['avg_flowrate'] or 0, 2),
            'avg_pressure': round(aggregates['avg_pressure'] or 0, 2),
            'avg_temperature': round(aggregates['avg_temperature'] or 0, 2),
            'type_distribution': type_distribution
        })
    
    @action(detail=False, methods=['get'])
    def by_dataset(self, request):
        """Get equipment filtered by dataset_id"""
        dataset_id = request.query_params.get('dataset_id')
        
        if not dataset_id:
            return Response(
                {'error': 'dataset_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            equipment = Equipment.objects.filter(dataset_id=dataset_id)
            serializer = self.get_serializer(equipment, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
