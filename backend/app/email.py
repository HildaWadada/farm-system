"""
Sends transactional emails via Resend (https://resend.com).

Without a verified domain, Resend's shared sender (onboarding@resend.dev)
can only deliver to the email address the Resend account itself was signed
up with — this is a Resend restriction, not something this code can work
around. Verifying a domain in the Resend dashboard removes that limit.

Workaround in place until a domain is verified: two separate Resend
accounts exist, one signed up with the owner's email and one with the
supervisor's. Each has its own API key. _select_api_key below picks
whichever key matches who the email is actually going to, so resets work
for both people instead of just one.
"""

import requests

from app.config import settings

RESEND_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "Cliff's Farm <onboarding@resend.dev>"


def _select_api_key(to_email: str) -> str | None:
    to_email = to_email.strip().lower()
    if settings.owner_email and to_email == settings.owner_email.strip().lower() and settings.resend_api_key_owner:
        return settings.resend_api_key_owner
    if (
        settings.supervisor_email
        and to_email == settings.supervisor_email.strip().lower()
        and settings.resend_api_key_supervisor
    ):
        return settings.resend_api_key_supervisor
    # Fall back to the single legacy key, if one is set — lets this keep
    # working even before both per-account keys are configured.
    return settings.resend_api_key or None


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """Returns True if Resend accepted the send request, False otherwise.
    Never raises — a failed send should not break the forgot-password flow
    or leak details to the caller."""
    api_key = _select_api_key(to_email)
    if not api_key:
        print(f"No matching Resend API key configured for {to_email} — skipping email send.")
        return False

    try:
        response = requests.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": FROM_ADDRESS,
                "to": [to_email],
                "subject": "Reset your Farm Platform password",
                "html": f"""
                    <p>You requested a password reset for this account.</p>
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