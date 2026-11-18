import io
from datetime import time, timedelta
from decimal import Decimal
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.assignments.models import EmployeeCustomerAssignment
from apps.attendance.models import Attendance
from apps.audit.models import ActivityLog
from apps.customers.models import CustomerProfile
from apps.employees.models import EmployeeProfile
from apps.reports.models import DailyReport, WorkEvidence
from apps.shifts.models import Shift, ShiftAssignment


@pytest.mark.django_db
class TestPhase8EvidenceAndActivity:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin8@test.com', username='admin8@test.com', password='pass',
            role=User.Role.ADMIN, is_staff=True,
        )
        self.employee_user = User.objects.create_user(
            email='emp8@test.com', username='emp8@test.com', password='pass',
            role=User.Role.EMPLOYEE, first_name='John', last_name='Doe'
        )
        self.employee = EmployeeProfile.objects.create(
            user=self.employee_user, employee_code='EMP-P8-01',
        )
        self.other_employee_user = User.objects.create_user(
            email='other8@test.com', username='other8@test.com', password='pass',
            role=User.Role.EMPLOYEE, first_name='Jane', last_name='Smith'
        )
        self.other_employee = EmployeeProfile.objects.create(
            user=self.other_employee_user, employee_code='EMP-P8-02',
        )
        self.customer_user = User.objects.create_user(
            email='cust8@test.com', username='cust8@test.com', password='pass',
            role=User.Role.CUSTOMER, first_name='Acme', last_name='Manager'
        )
        self.customer = CustomerProfile.objects.create(
            user=self.customer_user, customer_code='CUST-P8-01',
            company_name='Acme Supercenter #101', timezone='UTC',
        )
        self.other_customer_user = User.objects.create_user(
            email='othercust8@test.com', username='othercust8@test.com', password='pass',
            role=User.Role.CUSTOMER, first_name='Other', last_name='Client'
        )
        self.other_customer = CustomerProfile.objects.create(
            user=self.other_customer_user, customer_code='CUST-P8-02',
            company_name='Beta Retail #202', timezone='UTC',
        )

        self.assignment = EmployeeCustomerAssignment.objects.create(
            employee=self.employee, customer=self.customer, assigned_by=self.admin, status='ACTIVE'
        )
        self.shift = Shift.objects.create(
            name='Day Shift', start_time=time(8), end_time=time(16), grace_period_minutes=15
        )
        self.shift_assignment = ShiftAssignment.objects.create(
            employee_customer_assignment=self.assignment,
            shift=self.shift,
            shift_date=timezone.localdate(),
            assigned_by=self.admin,
        )

    def sample_image(self, name='test_screenshot.png'):
        # 1x1 valid PNG bytes
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00'
            b'\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        return SimpleUploadedFile(name, png_bytes, content_type='image/png')

    def test_employee_can_upload_evidence(self):
        self.client.force_authenticate(user=self.employee_user)
        image = self.sample_image('store_front.png')
        response = self.client.post('/api/v1/evidence/', {
            'shift_assignment_id': str(self.shift_assignment.id),
            'title': 'Front cash register check',
            'description': 'Clean register area and operational POS terminals.',
            'file': image,
        }, format='multipart')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Front cash register check'
        assert response.data['file_name'] == 'store_front.png'
        assert response.data['employee_code'] == 'EMP-P8-01'
        assert response.data['customer_name'] == 'Acme Supercenter #101'

        # Verify activity log was recorded
        log = ActivityLog.objects.filter(
            event_type=ActivityLog.EventType.EVIDENCE_UPLOADED,
            employee=self.employee
        ).first()
        assert log is not None
        assert 'uploaded photographic evidence' in log.description

    def test_unsupported_file_format_rejected(self):
        self.client.force_authenticate(user=self.employee_user)
        fake_exe = SimpleUploadedFile('malicious.exe', b'MZ12345', content_type='application/x-msdownload')
        response = self.client.post('/api/v1/evidence/', {
            'shift_assignment_id': str(self.shift_assignment.id),
            'title': 'Bad file',
            'file': fake_exe,
        }, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'unsupported file format' in response.data['detail'].lower()

    def test_customer_can_view_assigned_evidence_and_download(self):
        # Create evidence
        image = self.sample_image()
        evidence = WorkEvidence.objects.create(
            employee=self.employee,
            customer=self.customer,
            shift_assignment=self.shift_assignment,
            title='Zone Inspection',
            file=image,
            file_name='test.png',
            file_type='image/png',
            file_size=100
        )

        # Customer assigned to this employee can view
        self.client.force_authenticate(user=self.customer_user)
        list_res = self.client.get('/api/v1/evidence/')
        assert list_res.status_code == status.HTTP_200_OK
        results = list_res.data.get('results', list_res.data)
        assert any(item['id'] == str(evidence.id) for item in results)

        # Customer can download
        dl_res = self.client.get(f'/api/v1/evidence/{evidence.id}/download/')
        assert dl_res.status_code == status.HTTP_200_OK

        # Unrelated customer CANNOT see this evidence
        self.client.force_authenticate(user=self.other_customer_user)
        other_list = self.client.get('/api/v1/evidence/')
        assert other_list.status_code == status.HTTP_200_OK
        other_results = other_list.data.get('results', other_list.data)
        assert not any(item['id'] == str(evidence.id) for item in other_results)

        other_dl = self.client.get(f'/api/v1/evidence/{evidence.id}/download/')
        assert other_dl.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

    def test_attach_evidence_to_daily_report(self):
        self.client.force_authenticate(user=self.employee_user)
        evidence = WorkEvidence.objects.create(
            employee=self.employee,
            customer=self.customer,
            shift_assignment=self.shift_assignment,
            title='Shelves Checked',
            file=self.sample_image('shelves.png'),
            file_name='shelves.png',
            file_type='image/png',
            file_size=120
        )

        report = DailyReport.objects.create(
            shift_assignment=self.shift_assignment,
            title='Daily Security & Inventory Summary',
            work_summary='All zones secure.',
            created_by=self.employee_user,
        )

        attach_res = self.client.post(f'/api/v1/reports/{report.id}/attach_evidence/', {
            'evidence_ids': [str(evidence.id)],
        })
        assert attach_res.status_code == status.HTTP_200_OK
        evidence.refresh_from_db()
        assert evidence.daily_report_id == report.id

        # Viewing the report shows attached evidence
        rep_res = self.client.get(f'/api/v1/reports/{report.id}/')
        assert rep_res.status_code == status.HTTP_200_OK
        assert len(rep_res.data['evidence_items']) == 1
        assert rep_res.data['evidence_items'][0]['title'] == 'Shelves Checked'

    def test_activity_log_summary_and_filters(self):
        # Create an attendance record
        Attendance.objects.create(
            shift_assignment=self.shift_assignment,
            check_in=timezone.now() - timedelta(hours=8),
            check_out=timezone.now(),
            attendance_status=Attendance.Status.PRESENT,
            duration_hours=Decimal('8.00'),
        )
        DailyReport.objects.create(
            shift_assignment=self.shift_assignment,
            title='Final Shift Report',
            work_summary='Tasks done.',
            status=DailyReport.Status.SUBMITTED,
            created_by=self.employee_user,
        )
        WorkEvidence.objects.create(
            employee=self.employee,
            customer=self.customer,
            shift_assignment=self.shift_assignment,
            title='Photo 1',
            file=self.sample_image('p1.png'),
            file_name='p1.png',
            file_type='image/png',
            file_size=50
        )

        self.client.force_authenticate(user=self.employee_user)
        summary_res = self.client.get('/api/v1/logs/summary/')
        assert summary_res.status_code == status.HTTP_200_OK
        assert summary_res.data['total_shifts'] == 1
        assert summary_res.data['total_working_hours'] == 8.0
        assert summary_res.data['reports_submitted'] == 1
        assert summary_res.data['evidence_uploaded'] == 1
