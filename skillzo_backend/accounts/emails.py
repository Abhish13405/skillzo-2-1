import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_otp_email(user, otp):
    """
    Sends a beautifully designed HTML OTP verification email to the user.
    Returns:
        tuple (bool success, str message)
    """
    subject = f"{otp} is your Skillzo password reset code"
    recipient = user.email

    if not recipient:
        return False, "User has no email address."

    # Plain text fallback
    text_content = f"""Hello {user.username or 'Candidate'},

You requested to reset your password on Skillzo AI Studio.

Your 6-digit OTP verification code is: {otp}

This code will expire in 10 minutes.
If you did not request this code, you can safely ignore this email.

Best regards,
Skillzo Studio Team
"""

    # Rich responsive HTML template
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 30px 15px;
      color: #0F172A;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }}
    .logo-badge {{
      display: inline-block;
      width: 44px;
      height: 44px;
      line-height: 44px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-weight: 800;
      font-size: 22px;
      margin-bottom: 8px;
    }}
    .header h1 {{
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .otp-box {{
      background: #EFF6FF;
      border: 2px dashed #93C5FD;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #1D4ED8;
      display: inline-block;
      margin-left: 10px;
    }}
    .expiry-note {{
      font-size: 12px;
      color: #64748B;
      margin-top: 8px;
    }}
    .footer {{
      background: #F1F5F9;
      padding: 18px 24px;
      text-align: center;
      font-size: 11px;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">S</div>
      <h1>Skillzo AI Studio</h1>
      <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Security & Password Recovery</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-top: 0; color: #0F172A;">Hello {user.username or 'Candidate'},</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
        We received a request to reset your password for your Skillzo account. Use the following 6-digit verification code to proceed:
      </p>
      
      <div class="otp-box">
        <span class="otp-code">{otp}</span>
        <div class="expiry-note">⏳ Code expires in 10 minutes</div>
      </div>

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0;">
        If you did not request this password reset, you can safely ignore this email — your account remains secure and no changes have been made.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">© 2026 Skillzo AI Studio · Automated Security Notification</p>
    </div>
  </div>
</body>
</html>
"""

    sender = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Skillzo AI <noreply@skillzo.ai>')
    host_user = getattr(settings, 'EMAIL_HOST_USER', '')

    if not host_user:
        logger.info(f"[DEV EMAIL SIMULATOR] Recipient: {recipient} | OTP: {otp}")
        print(f"\n========================================\n[EMAIL TO {recipient}]\nSubject: {subject}\nOTP CODE: {otp}\n========================================\n")
        return False, "SMTP credentials (EMAIL_HOST_USER) not configured in environment."

    try:
        msg = EmailMultiAlternatives(subject, text_content, sender, [recipient])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"OTP successfully emailed to {recipient}")
        return True, "Email sent successfully."
    except Exception as e:
        logger.error(f"Failed to email OTP to {recipient}: {str(e)}")
        print(f"\n[EMAIL SEND FAILED] {str(e)}\nFallback OTP for {recipient}: {otp}\n")
        return False, str(e)
