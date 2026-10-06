import africastalking

from app.config import settings

africastalking.initialize(settings.at_username, settings.at_api_key)
_sms = africastalking.SMS


def _normalize_phone(phone: str) -> str:
    """
    Africa's Talking requires full international format (e.g. +254703723368),
    but buyers are naturally entered in local format (0703723368).

    - Already has a '+' → left untouched (lets a number from any country be
      entered explicitly, e.g. a Uganda test number as +256703723368).
    - Starts with '0' → the leading 0 is dropped and the default country
      code (AT_DEFAULT_COUNTRY_CODE, Kenya by default) is prepended.
    - Anything else → passed through as-is; Africa's Talking will reject it
      with a clear error if it's genuinely malformed, logged same as before.
    """
    phone = phone.strip()
    if phone.startswith("+"):
        return phone
    if phone.startswith("0"):
        return f"{settings.at_default_country_code}{phone[1:]}"
    return phone


def send_order_sms(phone: str, message: str) -> None:
    """
    Sends an SMS via Africa's Talking.

    In Sandbox mode, a recipient phone number must first be added as a
    Simulator Number in the Africa's Talking dashboard (Sandbox app →
    Simulator) before it will actually receive anything — this is the
    SMS equivalent of Resend's "only the verified address gets email"
    limitation. Once you move to a Live app with a purchased sender ID,
    any real number works.

    Never lets a notification failure break the order itself — if the
    SMS fails to send, the order is still saved; this just logs it.
    """
    normalized = _normalize_phone(phone)
    try:
        _sms.send(message, [normalized])
    except Exception as exc:
        print(f"SMS send failed for {normalized}: {exc}")