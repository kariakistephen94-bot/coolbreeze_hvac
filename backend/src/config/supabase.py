
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def insert_lead(lead_data: dict):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/leads"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    with httpx.Client(timeout=15) as client:
        response = client.post(
            url,
            headers=headers,
            json=lead_data
        )

        response.raise_for_status()
        return response.json()[0]
