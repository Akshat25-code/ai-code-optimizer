"""Email delivery service using Resend (with SMTP fallback).

Set RESEND_API_KEY env var to enable real email delivery.
In dev mode (no key), emails are printed to console.
"""
from __future__ import annotations

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

# Lazy-loaded resend client
_resend = None

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@aicodeoptimizerpromax.com")
FROM_NAME = os.getenv("FROM_NAME", "AI Code Optimizer")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _get_resend():
    global _resend
    if _resend is None and RESEND_API_KEY:
        import resend
        resend.api_key = RESEND_API_KEY
        _resend = resend
    return _resend


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Send email via Resend API, SMTP fallback, or dev console."""
    # 1. Try Resend
    resend_client = _get_resend()
    if resend_client:
        try:
            resend_client.Emails.send({
                "from": f"{FROM_NAME} <{FROM_EMAIL}>",
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text or "",
            })
            return True
        except Exception as e:
            print(f"[EMAIL] Resend failed: {e}")

    # 2. Try SMTP
    if SMTP_HOST and SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
            msg["To"] = to
            if text:
                msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"[EMAIL] SMTP failed: {e}")

    # 3. Dev fallback â€” print to console
    if os.getenv("APP_ENV", "development").lower() != "production":
        print(f"[DEV EMAIL] To: {to} | Subject: {subject}")
        print(f"[DEV EMAIL] Body: {text or html[:200]}")
        return True

    print(f"[EMAIL] No email provider configured. Could not send to {to}")
    return False


async def send_password_reset_email(to: str, reset_token: str) -> bool:
    """Send password reset email with token link."""
    reset_url = f"{APP_URL}/reset-password?token={reset_token}"
    subject = "Reset your password â€” AI Code Optimizer"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to choose a new password:</p>
        <a href="{reset_url}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <p style="color: #999; font-size: 12px;">â€” AI Code Optimizer Pro Max</p>
    </div>
    """
    text = f"Reset your password: {reset_url}\n\nThis link expires in 1 hour."
    return await send_email(to, subject, html, text)


async def send_welcome_email(to: str, name: str) -> bool:
    """Send welcome email after registration."""
    subject = f"Welcome to AI Code Optimizer, {name}!"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Welcome, {name}! ðŸš€</h2>
        <p>Your account is ready. Start optimizing your code with AI-powered analysis, real complexity metrics, and multi-language support.</p>
        <a href="{APP_URL}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Open AI Code Optimizer
        </a>
        <p style="color: #999; font-size: 12px;">â€” AI Code Optimizer Pro Max</p>
    </div>
    """
    text = f"Welcome, {name}! Start optimizing at {APP_URL}"
    return await send_email(to, subject, html, text)
