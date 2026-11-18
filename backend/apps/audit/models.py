import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class ActivityLog(models.Model):
    class EventType(models.TextChoices):
        LOGIN = 'LOGIN', _('Login')
        LOGOUT = 'LOGOUT', _('Logout')
        SHIFT_STARTED = 'SHIFT_STARTED', _('Shift Started')
        SHIFT_ENDED = 'SHIFT_ENDED', _('Shift Ended')
        ATTENDANCE_CORRECTION = 'ATTENDANCE_CORRECTION', _('Attendance Correction')
        EVIDENCE_UPLOADED = 'EVIDENCE_UPLOADED', _('Evidence Uploaded')
        REPORT_CREATED = 'REPORT_CREATED', _('Report Created')
        REPORT_SUBMITTED = 'REPORT_SUBMITTED', _('Report Submitted')
        REPORT_EDITED = 'REPORT_EDITED', _('Report Edited')
        FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED', _('Feedback Received')
        FEEDBACK_REPLY = 'FEEDBACK_REPLY', _('Feedback Reply')
        ASSIGNMENT_CHANGED = 'ASSIGNMENT_CHANGED', _('Assignment Changed')
        OTHER = 'OTHER', _('Other')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    customer = models.ForeignKey(
        'customers.CustomerProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    shift_assignment = models.ForeignKey(
        'shifts.ShiftAssignment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        default=EventType.OTHER,
        db_index=True
    )
    action = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=50, db_index=True)
    entity_id = models.CharField(max_length=100)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('Activity Log')
        verbose_name_plural = _('Activity Logs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['employee', 'created_at']),
            models.Index(fields=['customer', 'created_at']),
        ]

    def __str__(self):
        actor = self.user.email if self.user else 'System'
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M')} [{self.action}] {actor}: {self.description}"
