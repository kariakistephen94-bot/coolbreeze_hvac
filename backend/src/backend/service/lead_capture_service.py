
import re
from fastapi import HTTPException
from config.supabase import insert_lead
from config.n8n import trigger_n8n

def leadService(lead):
    full_name = lead.full_name.strip()
    phone = lead.phone.strip()
    email = lead.email.strip()
    service = lead.service.strip()
    description = lead.description.strip()
    needed_when = lead.needed_when.strip()

    if not 2 <= len(full_name) <= 100:
        raise HTTPException(
            status_code=400,
            detail="Full name must be between 2 and 100 characters"
        )

    phone_digits = re.sub(r"\D", "", phone)

    if len(phone_digits) == 11 and phone_digits.startswith("1"):
        phone_digits = phone_digits[1:]

    if (
        len(phone_digits) != 10
        or phone_digits[0] in "01"
        or phone_digits[3] in "01"
    ):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid US phone number"
        )

    phone = f"+1{phone_digits}"

    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

    if not re.fullmatch(email_regex, email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address"
        )

    service = service.upper().replace(" ", "_")

    allowed_services = [
        "AC_REPAIR",
        "HEATING_REPAIR",
        "HVAC_INSTALLATION",
        "MAINTENANCE",
        "OTHER"
    ]

    if service not in allowed_services:
        raise HTTPException(
            status_code=400,
            detail="Please select a valid HVAC service"
        )

    urgency_mapping = {
        "AS SOON AS POSSIBLE": "ASAP",
        "TODAY": "TODAY",
        "TOMORROW": "TOMORROW",
        "THIS WEEK": "THIS_WEEK",
        "FLEXIBLE": "FLEXIBLE"
    }

    needed_when = urgency_mapping.get(
        needed_when.upper(),
        needed_when.upper().replace(" ", "_")
    )

    allowed_urgency = [
        "ASAP",
        "TODAY",
        "TOMORROW",
        "THIS_WEEK",
        "FLEXIBLE"
    ]

    if needed_when not in allowed_urgency:
        raise HTTPException(
            status_code=400,
            detail="Please select a valid service timeframe"
        )

    if not 10 <= len(description) <= 2000:
        raise HTTPException(
            status_code=400,
            detail="Description must be between 10 and 2000 characters"
        )

    lead_data = {
        "full_name": full_name,
        "phone": phone,
        "email": email,
        "service": service,
        "description": description,
        "needed_when": needed_when,
        "zip_code": lead.zip_code
    }

    saved_lead = insert_lead(lead_data)

    try:
        trigger_n8n(saved_lead)
        automation_status = "triggered"

    except Exception as e:
        import logging
        logging.exception("Failed to trigger n8n for lead %s", saved_lead["id"])
        automation_status = "pending_retry"
        print(f"Failed to trigger n8n for lead {saved_lead['id']}: {e}")



    return {
        "message": "Lead captured successfully",
        "lead_id": saved_lead["id"],
        "status": saved_lead["status"],
        "automation_status": automation_status
    }
