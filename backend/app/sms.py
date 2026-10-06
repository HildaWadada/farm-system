import africastalking

from app.config import settings

africastalking.initialize(settings.at_username, settings.at_api_key)
_sms = africastalking.SMS


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
    try:
        _sms.send(message, [phone])
    except Exception as exc:
        print(f"SMS send failed for {phone}: {exc}")