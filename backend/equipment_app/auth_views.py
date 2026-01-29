from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from rest_framework.authentication import TokenAuthentication
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from datetime import datetime

from .models import UploadedDataset


class AuthViewSet(viewsets.ViewSet):
    """
    Authentication endpoints
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new user"""
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.create_user(username=username, password=password, email=email)
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'user_id': user.id,
                'username': user.username,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Login user"""
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user_id': user.id,
            'username': user.username,
            'token': token.key
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """Logout user"""
        request.user.auth_token.delete()
        return Response({'message': 'Logged out successfully'})


class PDFReportViewSet(viewsets.ViewSet):
    """
    Generate PDF reports
    """
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF report for a dataset"""
        try:
            dataset = UploadedDataset.objects.get(id=pk)
        except UploadedDataset.DoesNotExist:
            return Response(
                {'error': 'Dataset not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=30,
            alignment=1
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#764ba2'),
            spaceAfter=12,
            spaceBefore=12
        )

        # Title
        elements.append(Paragraph('Chemical Equipment Analysis Report', title_style))
        elements.append(Spacer(1, 0.3*inch))

        # Dataset info
        elements.append(Paragraph(f'Dataset: {dataset.filename}', heading_style))
        elements.append(Spacer(1, 0.1*inch))

        info_data = [
            ['Field', 'Value'],
            ['Total Equipment', str(dataset.equipment_count)],
            ['Average Flowrate', f'{dataset.avg_flowrate:.2f}'],
            ['Average Pressure', f'{dataset.avg_pressure:.2f}'],
            ['Average Temperature', f'{dataset.avg_temperature:.2f}'],
            ['Upload Date', str(dataset.upload_date)],
        ]

        info_table = Table(info_data, colWidths=[2*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Type distribution
        elements.append(Paragraph('Equipment Type Distribution', heading_style))
        elements.append(Spacer(1, 0.1*inch))

        type_data = [['Equipment Type', 'Count']]
        for eq_type, count in dataset.type_distribution.items():
            type_data.append([eq_type, str(count)])

        type_table = Table(type_data, colWidths=[3*inch, 1.5*inch])
        type_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))

        elements.append(type_table)
        elements.append(Spacer(1, 0.3*inch))

        # Equipment details
        elements.append(PageBreak())
        elements.append(Paragraph('Equipment Details', heading_style))
        elements.append(Spacer(1, 0.1*inch))

        equipment_items = dataset.equipment_items.all()
        equip_data = [['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']]

        for equipment in equipment_items:
            equip_data.append([
                equipment.name,
                equipment.equipment_type,
                f'{equipment.flowrate:.2f}',
                f'{equipment.pressure:.2f}',
                f'{equipment.temperature:.2f}',
            ])

        equip_table = Table(equip_data, colWidths=[1.5*inch, 1.2*inch, 1*inch, 1*inch, 1.3*inch])
        equip_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))

        elements.append(equip_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        return Response(
            buffer.getvalue(),
            content_type='application/pdf',
            headers={'Content-Disposition': 'attachment; filename="report.pdf"'}
        )
