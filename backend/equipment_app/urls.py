from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UploadedDatasetViewSet, EquipmentViewSet
from .auth_views import AuthViewSet, PDFReportViewSet

router = DefaultRouter()
router.register(r'datasets', UploadedDatasetViewSet, basename='dataset')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'reports', PDFReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]
