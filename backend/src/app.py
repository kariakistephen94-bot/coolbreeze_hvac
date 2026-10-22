from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import lead_capture



app = FastAPI()


app.include_router(lead_capture.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to CoolBreeze Heating & Air!" }

