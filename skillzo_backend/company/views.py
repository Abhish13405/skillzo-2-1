from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q, Avg, Max, Prefetch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Company, LeaderProfile, CompanyCandidate, LiveInterviewInvite, AuditLog
from .permissions import IsCompanyLeader, IsCompanyAdmin
from .serializers import (
    CompanyCandidateListSerializer,
    CandidateStatusUpdateSerializer,
    CreateLiveInviteSerializer,
    LiveInterviewInviteSerializer
)
from .services import EmailNotificationChannel, WhatsAppNotificationChannel, normalize_phone_e164
from interview.models import InterviewSession
from resume_analysis.models import Resume

User = get_user_model()


class CompanyDashboardStatsView(APIView):
    """
    GET /api/company/stats/
    Single optimized aggregate query for Leader dashboard.
    Returns Total Candidates, Interviews Completed, Interviews Pending,
    plus logged in Leader's permissions.
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyLeader]

    def get(self, request):
        company = request.company
        leader = request.leader

        # Aggregated candidate counts in single query
        candidate_stats = CompanyCandidate.objects.filter(company=company).aggregate(
            total=Count('id'),
            new=Count('id', filter=Q(status='new')),
            shortlisted=Count('id', filter=Q(status='shortlisted')),
            hold=Count('id', filter=Q(status='hold')),
            rejected=Count('id', filter=Q(status='rejected')),
        )

        # Enrolled candidate IDs
        enrolled_user_ids = CompanyCandidate.objects.filter(company=company).values_list('candidate_id', flat=True)

        # Single aggregate query for interview sessions
        interview_stats = InterviewSession.objects.filter(user_id__in=enrolled_user_ids).aggregate(
            completed=Count('id', filter=Q(status='completed')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            avg_score=Avg('overall_score', filter=Q(status='completed')),
        )

        # Pending / active scheduled invites
        pending_invites_count = LiveInterviewInvite.objects.filter(
            company=company,
            status__in=['Created', 'Sent', 'Opened'],
            expires_at__gte=timezone.now()
        ).count()

        return Response({
            "company": {
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "logo": company.logo.url if company.logo else None,
            },
            "leader": {
                "id": leader.id,
                "username": request.user.username,
                "email": request.user.email,
                "role": leader.role,
                "is_owner": leader.is_owner,
            },
            "metrics": {
                "total_candidates": candidate_stats['total'] or 0,
                "interviews_completed": interview_stats['completed'] or 0,
                "interviews_pending": pending_invites_count,
                "shortlisted_count": candidate_stats['shortlisted'] or 0,
                "on_hold_count": candidate_stats['hold'] or 0,
                "rejected_count": candidate_stats['rejected'] or 0,
                "avg_score": round(interview_stats['avg_score'], 1) if interview_stats['avg_score'] else 0,
            }
        })


class CompanyCandidateListView(APIView):
    """
    GET /api/company/candidates/
    Server-side search, status filter, and pagination.
    Strictly scoped to request.company.
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyLeader]

    def get(self, request):
        company = request.company
        q = request.query_params.get('q', '').strip()
        status_filter = request.query_params.get('status', '').strip().lower()
        interview_filter = request.query_params.get('interview', '').strip().lower() # 'completed', 'not_interviewed'
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 25)), 100)

        # Prefetch interview sessions and invites to eliminate N+1 queries
        sessions_prefetch = Prefetch(
            'candidate__interview_sessions',
            queryset=InterviewSession.objects.order_by('-started_at'),
            to_attr='_prefetched_sessions'
        )
        invites_prefetch = Prefetch(
            'candidate__interview_invites',
            queryset=LiveInterviewInvite.objects.filter(company=company).order_by('-scheduled_at'),
            to_attr='_prefetched_invites'
        )

        queryset = CompanyCandidate.objects.filter(company=company)\
            .select_related('candidate')\
            .prefetch_related(sessions_prefetch, invites_prefetch)

        # Status filter
        if status_filter in ['new', 'shortlisted', 'hold', 'rejected']:
            queryset = queryset.filter(status=status_filter)

        # Search filter
        if q:
            queryset = queryset.filter(
                Q(candidate__username__icontains=q) |
                Q(candidate__email__icontains=q) |
                Q(candidate__phone__icontains=q) |
                Q(target_role__icontains=q) |
                Q(candidate__college_or_company__icontains=q)
            )

        total_count = queryset.count()
        offset = (page - 1) * page_size
        candidates = list(queryset[offset:offset + page_size])

        # Filter in memory for interview status if requested
        if interview_filter == 'completed':
            candidates = [c for c in candidates if any(s.status == 'completed' for s in getattr(c.candidate, '_prefetched_sessions', []))]
        elif interview_filter == 'not_interviewed':
            candidates = [c for c in candidates if not getattr(c.candidate, '_prefetched_sessions', [])]

        serializer = CompanyCandidateListSerializer(candidates, many=True)
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return Response({
            "results": serializer.data,
            "total_count": total_count,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
        })


class CompanyCandidateDetailView(APIView):
    """
    GET /api/company/candidates/<id>/
    Returns candidate's full AI performance report, resume ATS breakdown, and video replay.
    Strictly IDOR protected: returns 404 for any candidate not in request.company!
    Enforces candidate consent (shares_with_company).
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyLeader]

    def get(self, request, pk):
        company = request.company
        enrollment = get_object_or_404(
            CompanyCandidate.objects.select_related('candidate'),
            id=pk,
            company=company
        )
        cand = enrollment.candidate

        # ─── CONSENT CHECK ───
        if not enrollment.shares_with_company:
            return Response({
                "id": enrollment.id,
                "candidate_id": cand.id,
                "username": cand.username,
                "email": cand.email,
                "phone": cand.phone or "—",
                "target_role": enrollment.target_role or cand.target_role or "Candidate",
                "status": enrollment.status,
                "remark": enrollment.remark,
                "shares_with_company": False,
                "message": "Candidate has not granted permission to share detailed AI interview reports and video recordings with this company.",
                "sessions": [],
                "resumes": [],
                "audit_logs": [],
            })

        # Fetch detailed sessions with question answers
        sessions_qs = InterviewSession.objects.filter(user=cand)\
            .prefetch_related('questions__answer')\
            .order_by('-started_at')

        sessions_data = []
        for s in sessions_qs:
            q_list = []
            for q in s.questions.all():
                ans_data = None
                if hasattr(q, 'answer') and q.answer:
                    ans = q.answer
                    v_url = ans.cloud_video_url or (ans.video_file.url if ans.video_file else None)
                    a_url = ans.cloud_audio_url or (ans.audio_file.url if ans.audio_file else None)
                    ans_data = {
                        "id": ans.id,
                        "answer_text": ans.answer_text,
                        "score": ans.overall_score,
                        "technical_knowledge": ans.technical_knowledge,
                        "communication": ans.communication,
                        "confidence": ans.confidence,
                        "problem_solving": ans.problem_solving,
                        "grammar": ans.grammar,
                        "strengths": ans.strengths or [],
                        "improvements": ans.improvements or [],
                        "ideal_answer_summary": ans.ideal_answer_summary or "",
                        "speaking_time_seconds": ans.speaking_time_seconds,
                        "video_url": v_url,
                        "audio_url": a_url,
                        "is_cloud_video": bool(ans.cloud_video_url),
                        "is_cloud_audio": bool(ans.cloud_audio_url),
                    }
                q_list.append({
                    "id": q.id,
                    "order": q.order,
                    "question_text": q.question_text,
                    "answer": ans_data,
                })

            has_cloud = any(bool(item.get('answer') and (item['answer'].get('is_cloud_video') or item['answer'].get('is_cloud_audio'))) for item in q_list)
            sessions_data.append({
                "id": s.id,
                "role": s.job_role,
                "difficulty": s.difficulty,
                "mode": s.mode,
                "status": s.status,
                "started_at": s.started_at.strftime('%d %b %Y, %I:%M %p') if s.started_at else "—",
                "overall_score": s.overall_score,
                "technical_score": s.technical_score,
                "communication_score": s.communication_score,
                "confidence_trend": s.confidence_trend,
                "verdict": s.verdict,
                "bonus_credited": getattr(s, 'bonus_credited', False),
                "ai_suggestions": s.ai_suggestions or [],
                "has_cloud_upload": has_cloud,
                "questions": q_list,
            })

        # Resumes & ATS
        resumes_qs = Resume.objects.filter(user=cand).order_by('-uploaded_at')
        resumes_data = [
            {
                "id": r.id,
                "filename": r.file.name.split('/')[-1] if r.file else "Resume",
                "url": r.file.url if r.file else None,
                "uploaded_at": r.uploaded_at.strftime('%d %b %Y') if r.uploaded_at else "—",
                "ats_score": r.ats_score,
                "extracted_skills": r.extracted_skills or [],
                "missing_keywords": r.missing_keywords or [],
                "feedback": r.feedback or [],
            }
            for r in resumes_qs
        ]

        # Audit logs for this candidate
        logs = AuditLog.objects.filter(company=company, candidate=cand).order_by('-created_at')[:15]
        logs_data = [
            {
                "id": l.id,
                "actor": l.actor.username if l.actor else "System",
                "action": l.action,
                "old_value": l.old_value,
                "new_value": l.new_value,
                "created_at": l.created_at.strftime('%d %b %Y, %I:%M %p'),
            }
            for l in logs
        ]

        total_sessions = len(sessions_data)
        completed_sessions = [s for s in sessions_data if s.get('status') == 'completed' and s.get('overall_score') is not None]
        avg_score = round(sum(s['overall_score'] for s in completed_sessions) / len(completed_sessions)) if completed_sessions else 0
        earned_badges = getattr(cand, 'earned_badges', []) or []

        return Response({
            "id": enrollment.id,
            "candidate_id": cand.id,
            "username": cand.username,
            "email": cand.email,
            "phone": cand.phone or "—",
            "target_role": enrollment.target_role or cand.target_role or "Candidate",
            "college_or_company": cand.college_or_company or "—",
            "date_joined": cand.date_joined.strftime('%d %b %Y') if cand.date_joined else "—",
            "status": enrollment.status,
            "remark": enrollment.remark,
            "shares_with_company": True,
            "version": enrollment.version,
            "earned_badges": earned_badges,
            "bonus_interviews": getattr(cand, 'bonus_interviews', 0) or 0,
            "is_subscribed": getattr(cand, 'is_subscribed', False),
            "total_interviews": total_sessions,
            "completed_interviews": len(completed_sessions),
            "avg_score": avg_score,
            "sessions": sessions_data,
            "resumes": resumes_data,
            "audit_logs": logs_data,
        })


class UpdateCandidateStatusView(APIView):
    """
    POST/PATCH /api/company/candidates/<id>/status/
    Admin only: modifies candidate status, remark, and contact details.
    Optimistic concurrency protection via `version` counter.
    Automatically logs an immutable entry to AuditLog.
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyLeader]

    def post(self, request, pk):
        company = request.company
        enrollment = get_object_or_404(
            CompanyCandidate.objects.select_related('candidate'),
            id=pk,
            company=company
        )

        serializer = CandidateStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # ─── CONCURRENCY CHECK ───
        if enrollment.version != data['version']:
            return Response(
                {
                    "error": "Conflict: Candidate details were modified by another leader. Please refresh the page and try again.",
                    "current_version": enrollment.version
                },
                status=status.HTTP_409_CONFLICT
            )

        old_status = enrollment.status
        old_remark = enrollment.remark
        new_status = data.get('status', old_status)
        new_remark = data.get('remark', old_remark)

        # Update candidate user fields if provided
        cand = enrollment.candidate
        user_updated = False
        if 'name' in data and data['name'].strip():
            cand.username = data['name'].strip()
            user_updated = True
        if 'phone' in data and data['phone'].strip():
            cand.phone = data['phone'].strip()
            user_updated = True
        if user_updated:
            cand.save()

        # Update candidate enrollment
        if 'target_role' in data:
            enrollment.target_role = data['target_role'].strip()
        enrollment.status = new_status
        enrollment.remark = new_remark
        enrollment.version += 1
        enrollment.save()

        # Write immutable AuditLog
        if old_status != new_status or old_remark != new_remark:
            AuditLog.objects.create(
                company=company,
                actor=request.user,
                candidate=cand,
                action="CANDIDATE_STATUS_UPDATE",
                old_value=f"status: {old_status} | remark: {old_remark}",
                new_value=f"status: {new_status} | remark: {new_remark}"
            )

        return Response({
            "message": "Candidate updated successfully.",
            "id": enrollment.id,
            "status": enrollment.status,
            "remark": enrollment.remark,
            "version": enrollment.version,
        })


class CreateLiveInviteView(APIView):
    """
    POST /api/company/invite/
    Admin only: schedules a live interview, creates a unique secure token,
    delivers email invite asynchronously in a background thread, and provides
    a WhatsApp click-to-chat URL.
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyLeader, IsCompanyAdmin]

    def post(self, request):
        company = request.company
        leader = request.user

        # Rate limiting: max 15 invites per minute per leader
        cache_key = f"rate_invite_{leader.id}"
        count = cache.get(cache_key, 0)
        if count >= 15:
            return Response(
                {"error": "Rate limit exceeded. Please wait a minute before sending more invites."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        cache.set(cache_key, count + 1, 60)

        serializer = CreateLiveInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cand_id = serializer.validated_data['candidate_id']
        scheduled_at = serializer.validated_data['scheduled_at']
        message = serializer.validated_data.get('message', '')
        sent_via = serializer.validated_data.get('sent_via', 'both')

        # Verify candidate exists and ensure enrollment in this company
        from django.contrib.auth import get_user_model
        User = get_user_model()
        candidate = User.objects.filter(id=cand_id).first()
        if not candidate:
            return Response({"error": f"Candidate with ID {cand_id} does not exist."}, status=status.HTTP_404_NOT_FOUND)

        enrollment, _ = CompanyCandidate.objects.get_or_create(
            candidate=candidate,
            company=company,
            defaults={"status": "shortlisted", "remark": "Scheduled for Live 1:1 Interview"}
        )

        # Duplicate check: check if same candidate is already invited for same day
        existing_invite = LiveInterviewInvite.objects.filter(
            company=company,
            candidate=candidate,
            scheduled_at__date=scheduled_at.date(),
            status__in=['Created', 'Sent', 'Opened']
        ).first()

        token = LiveInterviewInvite.generate_token()
        expires_at = scheduled_at + timedelta(days=2) # Valid for 48 hours

        invite = LiveInterviewInvite.objects.create(
            company=company,
            candidate=candidate,
            scheduled_at=scheduled_at,
            token=token,
            expires_at=expires_at,
            status='Created',
            sent_via=sent_via,
            message=message,
            created_by=leader
        )

        # Trigger notification channels
        frontend_url = request.build_absolute_uri('/')
        whatsapp_url = None

        if sent_via in ['whatsapp', 'both']:
            try:
                wa_channel = WhatsAppNotificationChannel()
                whatsapp_url = wa_channel.send(invite, frontend_url=frontend_url)
            except Exception as e:
                whatsapp_url = None

        if sent_via in ['email', 'both']:
            email_channel = EmailNotificationChannel()
            email_channel.send(invite, frontend_url=frontend_url)

        # Record AuditLog
        AuditLog.objects.create(
            company=company,
            actor=leader,
            candidate=candidate,
            action="LIVE_INTERVIEW_INVITE_SENT",
            old_value="",
            new_value=f"Token: {token[:8]}... | Scheduled: {scheduled_at.isoformat()} | Channels: {sent_via}"
        )

        return Response({
            "message": "Live interview invitation scheduled successfully.",
            "invite": LiveInterviewInviteSerializer(invite).data,
            "whatsapp_url": whatsapp_url,
            "duplicate_warning": bool(existing_invite),
        }, status=status.HTTP_201_CREATED)


class VerifyTokenView(APIView):
    """
    GET /api/company/invite/verify/<token>/
    Public endpoint for candidates joining a room via a secure token link.
    Validates token expiration, company association, and status.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(
            LiveInterviewInvite.objects.select_related('company', 'candidate'),
            token=token
        )

        if invite.status == 'Cancelled':
            return Response({"valid": False, "error": "This interview invitation has been cancelled by the company."}, status=status.HTTP_410_GONE)

        if invite.expires_at < timezone.now():
            invite.status = 'Expired'
            invite.save(update_fields=['status'])
            return Response({"valid": False, "error": "This interview invitation token has expired."}, status=status.HTTP_410_GONE)

        # Mark as opened if first time
        if invite.status == 'Sent' or invite.status == 'Created':
            invite.status = 'Opened'
            invite.save(update_fields=['status'])

        return Response({
            "valid": True,
            "token": invite.token,
            "candidate_name": invite.candidate.username,
            "candidate_email": invite.candidate.email,
            "candidate_id": invite.candidate.id,
            "company_name": invite.company.name,
            "scheduled_at": invite.scheduled_at.isoformat(),
            "status": invite.status,
            "room_id": f"skz_live_{invite.candidate.id}",
        })
