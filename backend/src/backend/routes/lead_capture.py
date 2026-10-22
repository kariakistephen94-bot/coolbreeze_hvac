from fastapi import APIRouter, HTTPException
from backend.schema.lead_schema import LeadModel
from backend.service.lead_capture_service import leadService

router = APIRouter()


@router.post("/api/lead-capture")
def lead_capture(lead: LeadModel):
    try:
        saved_lead = leadService(lead)
        return saved_lead
    except HTTPException:
        # Re-raise HTTPExceptions so FastAPI returns correct status codes (400, etc.)
        raise
    except Exception as e:
        import logging
        logging.exception("Lead capture unexpected error: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Backend Error: {str(e)}"
        )
