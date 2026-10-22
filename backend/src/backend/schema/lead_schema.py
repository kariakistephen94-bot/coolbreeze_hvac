from pydantic import BaseModel



class LeadModel(BaseModel):
    full_name: str
    phone: str
    email: str
    service: str
    description: str
    zip_code: str
    needed_when: str
