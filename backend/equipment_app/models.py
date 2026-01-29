from django.db import models
from django.contrib.auth.models import User
import uuid


class UploadedDataset(models.Model):
    """Store information about uploaded CSV datasets"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    filename = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)
    equipment_count = models.IntegerField(default=0)
    
    # Summary statistics
    avg_flowrate = models.FloatField(null=True, blank=True)
    avg_pressure = models.FloatField(null=True, blank=True)
    avg_temperature = models.FloatField(null=True, blank=True)
    type_distribution = models.JSONField(default=dict, blank=True)
    
    # Raw data
    csv_file = models.FileField(upload_to='uploads/')
    
    class Meta:
        ordering = ['-upload_date']
    
    def __str__(self):
        return f"{self.filename} - {self.upload_date}"


class Equipment(models.Model):
    """Individual equipment records"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(UploadedDataset, on_delete=models.CASCADE, related_name='equipment_items')
    
    name = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=100)
    flowrate = models.FloatField()
    pressure = models.FloatField()
    temperature = models.FloatField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.equipment_type})"
