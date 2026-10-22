
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

EXAMPLE_LEAD = {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "full_name": "John Doe",
    "phone": "+15551234567",
    "email": "johndoe@example.com",
    "service": "AC_REPAIR",
    "description": "AC unit stopped cooling and making a rattling sound.",
    "needed_when": "ASAP",
    "zip_code": "90210",
    "status": "new",
}


def trigger_n8n(lead: dict):
    webhook_url = os.environ["N8N_WEBHOOK_URL"]
    webhook_secret = os.environ["N8N_WEBHOOK_SECRET"]

    payload = {
        "event": "lead.created",
        "lead_id": lead["id"],
        "full_name": lead["full_name"],
        "phone": lead["phone"],
        "email": lead["email"],
        "service": lead["service"],
        "description": lead["description"],
        "needed_when": lead["needed_when"],
        "zip_code": lead.get("zip_code"),
    }

    response = httpx.post(
        webhook_url,
        json=payload,
        headers={
            "X-Webhook-Secret": webhook_secret,
            "Content-Type": "application/json"
        },
        timeout=10
    )

    response.raise_for_status()

    return response.json()
