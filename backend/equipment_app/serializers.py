from rest_framework import serializers
from .models import UploadedDataset, Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['id', 'name', 'equipment_type', 'flowrate', 'pressure', 'temperature', 'created_at']


class UploadedDatasetSerializer(serializers.ModelSerializer):
    equipment_items = EquipmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = UploadedDataset
        fields = ['id', 'filename', 'upload_date', 'equipment_count', 
                  'avg_flowrate', 'avg_pressure', 'avg_temperature', 
                  'type_distribution', 'equipment_items', 'csv_file']
        read_only_fields = ['equipment_count', 'avg_flowrate', 'avg_pressure', 
                           'avg_temperature', 'type_distribution']


class UploadSerializer(serializers.Serializer):
    """Serializer for file upload"""
    csv_file = serializers.FileField()
