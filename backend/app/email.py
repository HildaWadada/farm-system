"""
Sends transactional emails via Resend (https://resend.com).

Without a verified domain, Resend's shared sender (onboarding@resend.dev)
can only deliver to the email address the Resend account itself was signed
up with — this is a Resend restriction, not something this code can work
around. Verifying a domain in the Resend dashboard removes that limit.
"""

import requests

from app.config import settings

RESEND_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "Farm Platform <onboarding@resend.dev>"


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """Returns True if Resend accepted the send request, False otherwise.
    Never raises — a failed send should not break the forgot-password flow
    or leak details to the caller."""
    if not settings.resend_api_key:
        print("RESEND_API_KEY is not set — skipping email send.")
        return False

    try:
        response = requests.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": FROM_ADDRESS,
                "to": [to_email],
                "subject": "Reset your Farm Platform password",
                "html": f"""
                    <p>Someone requested a password reset for this account.</p>
                    <p><a href="{reset_link}">Click here to set a new password</a></p>
                    <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
                """,
            },
            timeout=10,
        )
        if response.status_code >= 400:
            print(f"Resend send failed: {response.status_code} {response.text}")
            return False
        return True
    except requests.RequestException as e:
        print(f"Resend send error: {e}")
        return False
