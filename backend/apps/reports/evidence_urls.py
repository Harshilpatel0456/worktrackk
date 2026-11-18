from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkEvidenceViewSet

app_name = 'evidence'

router = DefaultRouter()
router.register(r'', WorkEvidenceViewSet, basename='work-evidence')

urlpatterns = [
    path('', include(router.urls)),
]
