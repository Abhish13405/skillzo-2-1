import logging
logger = logging.getLogger(__name__)
import re
import urllib.parse
import threading
from datetime import datetime
from zoneinfo import ZoneInfo
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone


def normalize_phone_e164(phone: str, default_country_code: str = "91") -> str:
    """
    Normalizes a candidate's phone number into standard E.164 format (+<country_code><number>).
    Defaults to India (+91) for standard 10-digit mobile numbers.
    """
    if not phone or phone == "—":
        raise ValueError("Phone number is required.")

    # Remove all non-digit characters except leading '+'
    digits_only = re.sub(r'[^\d]', '', phone)

    # Strip any leading zeros
    digits_only = digits_only.lstrip('0')

    if not digits_only:
        raise ValueError("Invalid phone number format.")

    # If it's a 10-digit number, prepend default country code (91)
    if len(digits_only) == 10:
        digits_only = f"{default_country_code}{digits_only}"
    elif len(digits_only) == 12 and digits_only.startswith('91'):
        pass
    elif len(digits_only) < 10 or len(digits_only) > 15:
        raise ValueError(f"Phone number '{phone}' must contain between 10 and 15 digits.")

    return f"+{digits_only}"


def format_ist_datetime(dt) -> str:
    """Converts a UTC or timezone-aware datetime to IST human-readable string."""
    if not dt:
        return "—"
    ist = ZoneInfo("Asia/Kolkata")
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, ZoneInfo("UTC"))
    dt_ist = dt.astimezone(ist)
    return dt_ist.strftime("%d %B %Y, %I:%M %p IST")


class NotificationChannel:
    """Abstract base class for interview notifications (Email, WhatsApp, SMS)."""
    def send(self, invite, **kwargs):
        raise NotImplementedError


class EmailNotificationChannel(NotificationChannel):
    """
    Sends responsive HTML + plain text email invitations via background worker thread
    to prevent blocking HTTP response cycles.
    """
    def send(self, invite, frontend_url: str = None):
        if not frontend_url:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        frontend_url = frontend_url.rstrip('/')

        candidate = invite.candidate
        company = invite.company
        token_join_url = f"{frontend_url}/live/join/{invite.token}/"
        formatted_time = format_ist_datetime(invite.scheduled_at)

        subject = f"Live 1:1 Interview Invitation with {company.name}"
        sender = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Skillzo <noreply@skillzo.ai>')
        recipient = candidate.email

        plain_text = f"""
Hello {candidate.username or 'Candidate'},

You have been invited for a Live 1:1 Video Interview with {company.name}.

Interview Details:
- Company: {company.name}
- Scheduled Time: {formatted_time}
- Direct Join Link: {token_join_url}

Important Instructions:
- Please ensure you have a laptop/desktop with a working webcam and microphone.
- Use Google Chrome or Microsoft Edge for best audio/video quality.
- Click the join link 5 minutes before your scheduled interview time.

Best regards,
{company.name} Recruitment Team
Powered by Skillzo AI
"""

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0f1e; color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 560px; margin: 0 auto; background-color: #151833; border: 1px solid #262a4d; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .badge {{ display: inline-block; padding: 4px 10px; background-color: rgba(124, 108, 255, 0.15); border: 1px solid #7c6cff; color: #a78bfa; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; }}
    h1 {{ color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 12px 0; }}
    p {{ color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 8px 0; }}
    .details-box {{ background-color: #0d0f1e; border: 1px solid #262a4d; border-radius: 12px; padding: 18px; margin: 20px 0; }}
    .detail-row {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }}
    .detail-label {{ color: #94a3b8; font-weight: 500; }}
    .detail-value {{ color: #ffffff; font-weight: bold; }}
    .btn {{ display: block; text-align: center; background-color: #7c6cff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; margin: 24px 0 16px 0; }}
    .footer {{ font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #262a4d; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Live Interview Invitation</div>
    <h1>You're invited to interview with {company.name}</h1>
    <p>Hello <strong>{candidate.username or 'Candidate'}</strong>,</p>
    <p>Your interview has been scheduled on the Skillzo Live HR platform. Please review the details below:</p>

    <div class="details-box">
      <div class="detail-row">
        <span class="detail-label">Company</span>
        <span class="detail-value">{company.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Scheduled Date & Time</span>
        <span class="detail-value">{formatted_time}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Format</span>
        <span class="detail-value">1:1 WebRTC Video & Audio</span>
      </div>
    </div>

    <a href="{token_join_url}" class="btn">Join Interview Room →</a>

    <p style="font-size: 12px; color: #94a3b8;">
      If the button does not work, copy and paste this link in your browser:<br>
      <a href="{token_join_url}" style="color: #7c6cff; word-break: break-all;">{token_join_url}</a>
    </p>

    <div class="footer">
      This secure token link is valid until your interview completion.<br>
      © {timezone.now().year} {company.name} • Powered by Skillzo
    </div>
  </div>
</body>
</html>
"""

        def _send_async():
            try:
                msg = EmailMultiAlternatives(subject, plain_text, sender, [recipient])
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                invite.status = 'Sent'
                invite.last_sent_at = timezone.now()
                invite.save(update_fields=['status', 'last_sent_at'])
            except Exception as e:
                import traceback
                print(f"[EmailNotificationChannel ERROR] Failed sending to {recipient}: {e}")
                invite.status = 'Failed'
                invite.save(update_fields=['status'])

        # Execute delivery asynchronously in a background daemon thread
        thread = threading.Thread(target=_send_async, daemon=True)
        thread.start()
        return True


class WhatsAppNotificationChannel(NotificationChannel):
    """
    Generates standard WhatsApp Click-to-Chat direct links (wa.me) with normalized E.164 phone numbers
    and pre-filled personalized invite messages.
    """
    def send(self, invite, frontend_url: str = None) -> str:
        if not frontend_url:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        frontend_url = frontend_url.rstrip('/')

        candidate = invite.candidate
        company = invite.company
        token_join_url = f"{frontend_url}/live/join/{invite.token}/"
        formatted_time = format_ist_datetime(invite.scheduled_at)

        phone = getattr(candidate, 'phone', None)
        if not phone or phone == '—':
            raise ValueError(f"Candidate {candidate.username} does not have a valid registered phone number.")

        normalized_e164 = normalize_phone_e164(phone)
        digits_only = normalized_e164.lstrip('+')

        msg = (
            f"Namaste {candidate.username or 'Candidate'}! 👋\n\n"
            f"You have been invited for a Live 1:1 Interview with *{company.name}*.\n\n"
            f"📅 Date & Time: *{formatted_time}*\n"
            f"🔗 Join Room Link: {token_join_url}\n\n"
            f"Please join using a laptop with camera and microphone enabled. Best of luck!"
        )

        encoded_text = urllib.parse.quote(msg)
        wa_link = f"https://wa.me/{digits_only}?text={encoded_text}"
        return wa_link
