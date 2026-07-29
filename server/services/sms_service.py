"""SMS Service Abstraction
Provides a pluggable layer for sending OTP codes. Currently supports Twilio placeholder.
Set environment variables to enable real sending:
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
If these are not set, service operates in mock mode and logs OTP to console only.
"""
import os
from typing import Optional

_SID = os.getenv("TWILIO_ACCOUNT_SID")
_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
_FROM = os.getenv("TWILIO_FROM_NUMBER")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")
DISABLE_TWILIO_VERIFY = os.getenv("DISABLE_TWILIO_VERIFY") == "1"

# Core availability (client can be created)
USE_TWILIO_CORE = bool(_SID and _TOKEN)
# Messaging (Programmable SMS) requires a from_ number
USE_TWILIO_MESSAGING = bool(USE_TWILIO_CORE and _FROM)
# Verify requires Verify Service SID but not a from_ number
USE_TWILIO_VERIFY = bool(USE_TWILIO_CORE and TWILIO_VERIFY_SERVICE_SID)
if DISABLE_TWILIO_VERIFY:
    USE_TWILIO_VERIFY = False

_twilio_client = None

if USE_TWILIO_CORE:
    try:
        from twilio.rest import Client  # type: ignore
        _twilio_client = Client(_SID, _TOKEN)
    except Exception as e:
        print(f"âš ï¸  Failed to initialize Twilio client, falling back to mock: {e}")
        USE_TWILIO_CORE = False
        USE_TWILIO_MESSAGING = False
        USE_TWILIO_VERIFY = False

async def send_sms(phone: str, message: str) -> bool:
    if USE_TWILIO_MESSAGING and _twilio_client:
        try:
            _twilio_client.messages.create(
                to=phone,
                from_=_FROM,
                body=message
            )
            return True
        except Exception as e:
            print(f"âŒ Twilio send failed: {e}")
            return False
    # Mock fallback
    print(f"[MOCK SMS] -> {phone}: {message}")
    return True

async def start_phone_verification(phone: str, channel: str = "sms") -> bool:
    """Start a phone verification via Twilio Verify if configured, else mock."""
    if USE_TWILIO_VERIFY and _twilio_client and TWILIO_VERIFY_SERVICE_SID:
        try:
            verification = _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create(
                to=phone,
                channel=channel
            )
            # status can be 'pending'
            return verification.status in ("pending", "sent")
        except Exception as e:
            print(f"âŒ Twilio Verify start failed: {e}")
            return False
    # Mock fallback
    print(f"[MOCK VERIFY START] -> {phone} (channel={channel})")
    return True

async def check_phone_verification(phone: str, code: str) -> bool:
    """Check a verification code via Twilio Verify if configured, else mock always true in dev."""
    if USE_TWILIO_VERIFY and _twilio_client and TWILIO_VERIFY_SERVICE_SID:
        try:
            check = _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verification_checks.create(
                to=phone,
                code=code
            )
            # approved means code matched
            return (getattr(check, "status", None) == "approved")
        except Exception as e:
            print(f"âŒ Twilio Verify check failed: {e}")
            return False
    # Mock fallback (only for development)
    print(f"[MOCK VERIFY CHECK] -> {phone}: code=**** (accepted)")
    return True
