import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agent import analyze_company, generate_with_gemini
from ml_layer import build_ml_overview
from dotenv import load_dotenv
import json

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


class HoldingItem(BaseModel):
    symbol: str
    name: str
    sector: str
    quantity: float
    avg_price: float
    current_price: float
    pnl: float
    pnl_pct: float
    value: float
    oracle_score: int


class AnalyzePortfolioRequest(BaseModel):
    holdings: List[HoldingItem]


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


@app.post("/analyze-portfolio")
async def analyze_portfolio_endpoint(request: AnalyzePortfolioRequest):
    """AI-powered portfolio analysis via Gemini with deterministic fallback."""
    try:
        holdings = request.holdings
        portfolio_summary = "\n".join(
            f"{h.symbol} ({h.sector}): qty={h.quantity}, avg=₹{h.avg_price}, "
            f"cmp=₹{h.current_price}, P&L=₹{h.pnl:.0f} ({h.pnl_pct:.1f}%), "
            f"Oracle Score={h.oracle_score}"
            for h in holdings
        )

        prompt = f"""You are Nexus AI, an elite equity portfolio analyst. Analyze this portfolio and respond ONLY with valid JSON (no markdown, no backticks):

PORTFOLIO:
{portfolio_summary}

Return exactly this structure:
{{
  "overall_score": <number 0-100>,
  "risk_level": "<Low|Moderate|High|Very High>",
  "portfolio_summary": "<2 sentence summary>",
  "bull_case": "<1 sentence bull case>",
  "bear_case": "<1 sentence bear case>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "sector_verdict": {{"<sector1>": "<Buy/Hold/Trim>", "<sector2>": "<verdict>"}}
}}"""

        ai_response = generate_with_gemini(prompt)

        if ai_response:
            try:
                clean = ai_response.replace("```json", "").replace("```", "").strip()
                result = json.loads(clean)
                return result
            except (json.JSONDecodeError, Exception):
                pass

        # ── Deterministic fallback ──
        total_value = sum(h.value for h in holdings)
        total_pnl = sum(h.pnl for h in holdings)
        total_invested = sum(h.avg_price * h.quantity for h in holdings)
        total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0
        avg_score = round(sum(h.oracle_score for h in holdings) / len(holdings)) if holdings else 50

        # Sector concentration
        sector_values = {}
        for h in holdings:
            sector_values[h.sector] = sector_values.get(h.sector, 0) + h.value
        sector_pcts = {s: v / total_value * 100 for s, v in sector_values.items()} if total_value > 0 else {}
        top_sector = max(sector_pcts, key=sector_pcts.get) if sector_pcts else "Unknown"
        top_pct = sector_pcts.get(top_sector, 0)

        # Winners and losers
        winners = [h for h in holdings if h.pnl > 0]
        losers = [h for h in holdings if h.pnl < 0]
        best = max(holdings, key=lambda h: h.pnl_pct) if holdings else None
        worst = min(holdings, key=lambda h: h.pnl_pct) if holdings else None

        # Risk level
        if top_pct > 60 or avg_score < 40:
            risk_level = "High"
        elif top_pct > 45 or avg_score < 55:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        # Overall score
        overall_score = min(99, max(10, avg_score + int(total_pnl_pct * 0.5)))

        # Sector verdicts
        sector_verdict = {}
        for sector, pct in sector_pcts.items():
            sector_holdings = [h for h in holdings if h.sector == sector]
            avg_sect_score = sum(h.oracle_score for h in sector_holdings) / len(sector_holdings)
            if pct > 50:
                sector_verdict[sector] = "Trim"
            elif avg_sect_score >= 70:
                sector_verdict[sector] = "Buy"
            else:
                sector_verdict[sector] = "Hold"

        insights = []
        if top_pct > 40:
            insights.append(f"{top_sector} sector accounts for {top_pct:.0f}% of portfolio — concentration risk is elevated")
        if losers:
            loser_names = ", ".join(h.symbol for h in sorted(losers, key=lambda h: h.pnl)[:2])
            insights.append(f"{loser_names} {'are' if len(losers) > 1 else 'is'} underwater and dragging overall returns")
        if winners:
            winner_names = ", ".join(h.symbol for h in sorted(winners, key=lambda h: h.pnl, reverse=True)[:2])
            insights.append(f"{winner_names} {'are' if len(winners) > 1 else 'is'} the alpha generator{'s' if len(winners) > 1 else ''} — consider increasing allocation")
        if not insights:
            insights = ["Portfolio is balanced across sectors", "P&L distribution is healthy", "Oracle scores indicate stable fundamentals"]

        recommendations = [
            f"Trim {top_sector} exposure to below 40% for better diversification" if top_pct > 40 else "Maintain current sector balance",
            f"Consider partial exit in {worst.symbol} ({worst.pnl_pct:.1f}%) to cut losses" if worst and worst.pnl_pct < -5 else "All positions within acceptable loss thresholds",
            "Add high-ROE stocks from underrepresented sectors for diversification",
        ]

        return {
            "overall_score": overall_score,
            "risk_level": risk_level,
            "portfolio_summary": f"Portfolio shows {'concentrated' if top_pct > 50 else 'balanced'} exposure across {len(sector_pcts)} sectors with {risk_level.lower()} risk. {'Strong alpha generation from winners offsets underwater positions.' if winners else 'Portfolio needs catalyst positions for growth.'}",
            "bull_case": f"Strong positioning in {top_sector} and high Oracle scores ({avg_score} avg) suggest {15 + int(total_pnl_pct * 0.3)}–{25 + int(total_pnl_pct * 0.3)}% upside potential over 12 months." if avg_score >= 55 else f"Deep value opportunity — current drawdown creates attractive entry points for patient investors.",
            "bear_case": f"{'Over-concentration in ' + top_sector + ' (' + f'{top_pct:.0f}%' + ') ' if top_pct > 40 else ''}Global slowdown could compress margins and trigger correction across holdings.",
            "insights": insights[:3],
            "recommendations": recommendations[:3],
            "sector_verdict": sector_verdict,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
