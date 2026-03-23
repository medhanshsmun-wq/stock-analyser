import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import analyze_company
from ml_layer import build_ml_overview
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(
    title="Company Nexus API",
    root_path="/api" if os.getenv("VERCEL") else ""
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    query: str
    ticker: str = None
    history: list = []

@app.get("/")
def read_root():
    return {"status": "Nexus Backend is Running"}

@app.post("/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    try:
        result = analyze_company(request.query, request.ticker, request.history)
        # Append the ML post-processing overview layer
        result["ml_overview"] = build_ml_overview(result["financials"], result["scores"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
