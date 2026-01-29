from django.contrib import admin
from .models import UploadedDataset, Equipment


@admin.register(UploadedDataset)
class UploadedDatasetAdmin(admin.ModelAdmin):
    list_display = ['filename', 'upload_date', 'equipment_count', 'avg_flowrate', 'avg_pressure']
    list_filter = ['upload_date']
    search_fields = ['filename']
    readonly_fields = ['avg_flowrate', 'avg_pressure', 'avg_temperature', 'type_distribution']


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'equipment_type', 'flowrate', 'pressure', 'temperature']
    list_filter = ['equipment_type', 'dataset']
    search_fields = ['name']
