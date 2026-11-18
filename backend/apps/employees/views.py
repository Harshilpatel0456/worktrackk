import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from .models import EmployeeProfile
from .serializers import EmployeeProfileSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = EmployeeProfile.objects.select_related('user').all()
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['employee_code', 'user__first_name', 'user__last_name', 'user__email', 'department']
    filterset_fields = ['status', 'department']
    ordering_fields = ['employee_code', 'user__first_name', 'joining_date']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EmployeeProfile.objects.none()
        if user.role == 'ADMIN' or user.is_staff or user.is_superuser:
            return self.queryset
        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return self.queryset.filter(pk=user.employee_profile.pk)
        return EmployeeProfile.objects.none()

    @action(
        detail=False,
        methods=['get', 'patch', 'put'],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
        permission_classes=[permissions.IsAuthenticated]
    )
    def me(self, request):
        if not hasattr(request.user, 'employee_profile'):
            return Response({'error': 'User has no employee profile.'}, status=status.HTTP_404_NOT_FOUND)
        
        profile = request.user.employee_profile

        if request.method in ('PATCH', 'PUT'):
            user = request.user
            data = request.data

            # Update User personal fields
            first_name = data.get('firstName') or data.get('first_name')
            last_name = data.get('lastName') or data.get('last_name')
            email = data.get('email')

            if first_name is not None:
                user.first_name = first_name.strip()
            if last_name is not None:
                user.last_name = last_name.strip()
            if email is not None and email.strip().lower() != user.email.lower():
                new_email = email.strip().lower()
                from django.contrib.auth import get_user_model
                User = get_user_model()
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    return Response({'email': 'This email address is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = new_email
                user.username = new_email
            user.save()

            # Update EmployeeProfile fields
            phone = data.get('phone')
            address = data.get('address')
            if phone is not None:
                profile.phone = phone.strip()
            if address is not None:
                profile.address = address.strip()

            # Handle Profile Image upload
            if 'profile_image' in request.FILES:
                img_file = request.FILES['profile_image']
                ext = os.path.splitext(img_file.name)[1].lower()
                if ext not in {'.jpg', '.jpeg', '.png', '.webp'}:
                    return Response({'profile_image': 'Allowed formats: JPG, JPEG, PNG, WEBP.'}, status=status.HTTP_400_BAD_REQUEST)
                if img_file.size > 5 * 1024 * 1024:
                    return Response({'profile_image': 'Profile image size must not exceed 5MB.'}, status=status.HTTP_400_BAD_REQUEST)
                profile.profile_image = img_file
            elif data.get('remove_profile_image') in ('true', True, '1'):
                if profile.profile_image:
                    profile.profile_image.delete(save=False)
                    profile.profile_image = None

            profile.save()

        serializer = self.get_serializer(profile, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def toggle_status(self, request, pk=None):
        employee = self.get_object()
        employee.status = (
            EmployeeProfile.Status.INACTIVE
            if employee.status == EmployeeProfile.Status.ACTIVE
            else EmployeeProfile.Status.ACTIVE
        )
        employee.save()
        employee.user.is_active = employee.status == EmployeeProfile.Status.ACTIVE
        employee.user.save(update_fields=['is_active'])
        return Response({'id': str(employee.id), 'status': employee.status})

    def destroy(self, request, *args, **kwargs):
        employee = self.get_object()
        employee.status = EmployeeProfile.Status.INACTIVE
        employee.save(update_fields=['status', 'updated_at'])
        employee.user.is_active = False
        employee.user.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
