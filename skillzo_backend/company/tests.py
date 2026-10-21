from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from company.models import Company, LeaderProfile, CompanyCandidate, LiveInterviewInvite, AuditLog
from company.services import normalize_phone_e164

User = get_user_model()


class CompanyMultiTenancyTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Company A
        self.company_a = Company.objects.create(name="Company Alpha", slug="alpha")
        self.leader_a_admin = User.objects.create_user(
            username="leader_a",
            email="leader_a@alpha.com",
            password="Password@123"
        )
        self.profile_a_admin = LeaderProfile.objects.create(
            user=self.leader_a_admin,
            company=self.company_a,
            role="admin",
            is_owner=True
        )

        self.leader_a_viewer = User.objects.create_user(
            username="viewer_a",
            email="viewer_a@alpha.com",
            password="Password@123"
        )
        self.profile_a_viewer = LeaderProfile.objects.create(
            user=self.leader_a_viewer,
            company=self.company_a,
            role="viewer"
        )

        # Company B
        self.company_b = Company.objects.create(name="Company Beta", slug="beta")
        self.leader_b = User.objects.create_user(
            username="leader_b",
            email="leader_b@beta.com",
            password="Password@123"
        )
        self.profile_b = LeaderProfile.objects.create(
            user=self.leader_b,
            company=self.company_b,
            role="admin"
        )

        # Candidates
        self.cand_a = User.objects.create_user(
            username="candidate_a",
            email="cand_a@test.com",
            password="Password@123",
            phone="9876543210"
        )
        self.enrollment_a = CompanyCandidate.objects.create(
            company=self.company_a,
            candidate=self.cand_a,
            target_role="Backend Developer",
            status="new",
            shares_with_company=True
        )

        self.cand_b = User.objects.create_user(
            username="candidate_b",
            email="cand_b@test.com",
            password="Password@123"
        )
        self.enrollment_b = CompanyCandidate.objects.create(
            company=self.company_b,
            candidate=self.cand_b,
            target_role="Frontend Developer",
            status="new"
        )

    def test_phone_normalization_e164(self):
        """Phone normalization standardizes Indian mobile numbers and strips whitespace."""
        self.assertEqual(normalize_phone_e164("9876543210"), "+919876543210")
        self.assertEqual(normalize_phone_e164("+91 98765 43210"), "+919876543210")
        self.assertEqual(normalize_phone_e164("09876543210"), "+919876543210")

        with self.assertRaises(ValueError):
            normalize_phone_e164("123")  # Too short

    def test_multi_tenancy_cross_company_idor_blocked(self):
        """Leader A accessing Company B candidate returns 404 (not 403) to prevent IDOR."""
        self.client.force_authenticate(user=self.leader_a_admin)
        res = self.client.get(f"/api/company/candidates/{self.enrollment_b.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_blocked_from_admin_status_update(self):
        """Viewer in Company A cannot edit candidate status (returns 403 Forbidden)."""
        self.client.force_authenticate(user=self.leader_a_viewer)
        res = self.client.post(
            f"/api/company/candidates/{self.enrollment_a.id}/status/",
            {"status": "shortlisted", "version": self.enrollment_a.version}
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_status_and_audit_log_created(self):
        """Admin can update status, version increments, and AuditLog is created."""
        self.client.force_authenticate(user=self.leader_a_admin)
        res = self.client.post(
            f"/api/company/candidates/{self.enrollment_a.id}/status/",
            {"status": "shortlisted", "remark": "Excellent interview", "version": self.enrollment_a.version}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.enrollment_a.refresh_from_db()
        self.assertEqual(self.enrollment_a.status, "shortlisted")
        self.assertEqual(self.enrollment_a.version, 2)

        # Check AuditLog
        audit = AuditLog.objects.filter(company=self.company_a, candidate=self.cand_a).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, "CANDIDATE_STATUS_UPDATE")

    def test_candidate_consent_check(self):
        """When shares_with_company is False, detailed interview report is omitted."""
        self.enrollment_a.shares_with_company = False
        self.enrollment_a.save()

        self.client.force_authenticate(user=self.leader_a_admin)
        res = self.client.get(f"/api/company/candidates/{self.enrollment_a.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['shares_with_company'])
        self.assertEqual(res.data['sessions'], [])

    def test_verify_token_flow(self):
        """Live interview invite token verification works and expires correctly."""
        token = LiveInterviewInvite.generate_token()
        scheduled_at = timezone.now() + timedelta(days=1)
        invite = LiveInterviewInvite.objects.create(
            company=self.company_a,
            candidate=self.cand_a,
            scheduled_at=scheduled_at,
            token=token,
            expires_at=scheduled_at + timedelta(days=1),
            status="Sent"
        )

        res = self.client.get(f"/api/company/invite/verify/{token}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['valid'])
        self.assertEqual(res.data['candidate_email'], self.cand_a.email)

        # Test cancelled token
        invite.status = "Cancelled"
        invite.save()
        res_cancelled = self.client.get(f"/api/company/invite/verify/{token}/")
        self.assertEqual(res_cancelled.status_code, status.HTTP_410_GONE)
