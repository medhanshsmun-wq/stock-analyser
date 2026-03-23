"""
Oracle ML Enrichment Layer
--------------------------
Runs AFTER Gemini (or mock) generates the base analysis.
Computes structured signal overlays from real data:
  1. Sentiment consensus signal (Oracle vs Analysts)
  2. Valuation divergence detection (are we mispriced?)
  3. Insider + institutional signal
  4. Risk matrix (momentum, leverage, short interest)
  5. Action matrix (Buy Zone / Watch Zone / Avoid Zone)

Returns a structured dict that the API sends to the frontend
for rendering the "Oracle Intelligence Overview" card.
"""

from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# SENTIMENT CONSENSUS
# ─────────────────────────────────────────────────────────────────────────────

def _sentiment_consensus(f: dict, scores: dict) -> dict:
    """Cross-checks our Oracle score vs analyst consensus."""
    oracle = scores.get("oracle_score", 50)
    rec = str(f.get("analyst_recommendation", "")).lower()
    analyst_score = 50
    if "strong_buy" in rec or "strongbuy" in rec:
        analyst_score = 85
    elif "buy" in rec:
        analyst_score = 70
    elif "hold" in rec:
        analyst_score = 50
    elif "sell" in rec:
        analyst_score = 25
    elif "strong_sell" in rec or "strongsell" in rec:
        analyst_score = 10

    diff = oracle - analyst_score
    if diff > 20:
        signal = "🔥 Nexus is MORE bullish than analyst consensus"
        color = "#22c55e"
    elif diff > 8:
        signal = "✅ Nexus confirms analyst bullish view"
        color = "#84cc16"
    elif abs(diff) <= 8:
        signal = "⚖️ Nexus and analysts broadly agree"
        color = "#f59e0b"
    elif diff < -20:
        signal = "⚠️ Nexus is significantly more cautious than analysts"
        color = "#ef4444"
    else:
        signal = "🔵 Nexus slightly more cautious than analysts"
        color = "#6366f1"

    return {
        "oracle_score": oracle,
        "analyst_score": analyst_score,
        "signal": signal,
        "color": color,
        "agreement_pct": round(100 - min(abs(diff), 100), 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# VALUATION DIVERGENCE
# ─────────────────────────────────────────────────────────────────────────────

def _valuation_divergence(f: dict) -> dict:
    """Detects if the stock looks mispriced relative to its growth."""
    peg = f.get("peg_ratio")
    pe = f.get("pe_ratio")
    fw_pe = f.get("forward_pe")
    price = f.get("current_price", 0)
    target = f.get("analyst_target_mean")
    rev_g = f.get("revenue_growth") or 0

    signals = []
    flag = "neutral"

    # PEG check
    if peg is not None and isinstance(peg, (int, float)):
        if peg < 1.0:
            signals.append(f"PEG of {peg:.2f} — growing faster than its valuation suggests (potentially undervalued)")
            flag = "bullish"
        elif peg > 3.0:
            signals.append(f"PEG of {peg:.2f} — expensive relative to growth (growth priced in)")
            flag = "bearish"

    # PE compression potential
    if pe and fw_pe and isinstance(pe, (int, float)) and isinstance(fw_pe, (int, float)):
        if fw_pe < pe * 0.8:
            signals.append(f"Forward P/E ({fw_pe:.1f}x) is {((pe-fw_pe)/pe*100):.0f}% below trailing ({pe:.1f}x) — earnings expansion expected")
            flag = "bullish"

    # Analyst upside
    if target and price:
        upside = (target - price) / price
        if upside > 0.25:
            signals.append(f"Analyst mean target implies {upside*100:.1f}% upside — significant gap from current price")
            if flag != "bearish":
                flag = "bullish"
        elif upside < -0.05:
            signals.append(f"Stock is trading above analyst mean target — limited near-term upside")
            flag = "bearish"

    # Revenue growth context
    if rev_g > 0.25 and pe and pe > 30:
        signals.append(f"High-growth company ({rev_g*100:.0f}% revenue growth) — premium multiple may be justified")

    if not signals:
        signals.append("Valuation appears roughly in line with sector norms")

    return {
        "flag": flag,
        "signals": signals,
        "color": "#22c55e" if flag == "bullish" else "#ef4444" if flag == "bearish" else "#f59e0b",
    }


# ─────────────────────────────────────────────────────────────────────────────
# INSIDER & INSTITUTIONAL SIGNAL
# ─────────────────────────────────────────────────────────────────────────────

def _ownership_signal(f: dict) -> dict:
    insider = f.get("insider_ownership") or 0
    institutional = f.get("institutional_ownership") or 0
    signals = []
    flag = "neutral"

    if insider > 0.15:
        signals.append(f"High insider ownership ({insider*100:.1f}%) — management has strong skin in the game")
        flag = "bullish"
    elif insider > 0.05:
        signals.append(f"Moderate insider ownership ({insider*100:.1f}%) — aligned incentives")
    else:
        signals.append(f"Low insider ownership ({insider*100:.1f}%) — watch for alignment issues")

    if institutional > 0.7:
        signals.append(f"Heavy institutional ownership ({institutional*100:.1f}%) — wall street heavily invested")
    elif institutional > 0.4:
        signals.append(f"Solid institutional ownership ({institutional*100:.1f}%) — hedge funds & funds are in")
    else:
        signals.append(f"Low institutional ownership ({institutional*100:.1f}%) — may be under-discovered")
        if flag == "neutral":
            flag = "watch"

    short = f.get("short_ratio") or 0
    if short > 7:
        signals.append(f"High short ratio ({short:.1f}x) — significant bearish bets outstanding; risk of squeeze OR catalyst for downside")
        flag = "bearish" if flag == "neutral" else flag
    elif short > 3:
        signals.append(f"Moderate short ratio ({short:.1f}x) — some bearish sentiment to watch")
    else:
        signals.append(f"Low short ratio ({short:.1f}x) — bears are not positioning heavily against this")

    return {
        "flag": flag,
        "signals": signals,
        "color": "#22c55e" if flag == "bullish" else "#ef4444" if flag == "bearish" else "#6366f1" if flag == "watch" else "#f59e0b",
    }


# ─────────────────────────────────────────────────────────────────────────────
# ACTION MATRIX — The Bottom Line
# ─────────────────────────────────────────────────────────────────────────────

def _action_matrix(f: dict, scores: dict) -> dict:
    """Returns a clear action label and investor profile match."""
    oracle = scores.get("oracle_score", 50)
    grade = scores.get("grade", "C")
    health = scores.get("financial_health", 50)
    growth = scores.get("growth", 50)
    val = scores.get("valuation", 50)
    mom = scores.get("momentum", 50)
    mc = f.get("market_cap", 0)
    beta = f.get("beta") or 1.0

    # Action Zone
    if oracle >= 75 and health >= 60:
        action = "BUY ZONE"
        action_color = "#22c55e"
        action_bg = "rgba(34,197,94,0.1)"
        action_desc = "Strong fundamentals across the board — this is where conviction positions are built."
    elif oracle >= 60 and health >= 50:
        action = "ACCUMULATE"
        action_color = "#84cc16"
        action_bg = "rgba(132,204,22,0.1)"
        action_desc = "Good risk/reward. Consider scaling in on dips or breakouts."
    elif oracle >= 48:
        action = "WATCH LIST"
        action_color = "#f59e0b"
        action_bg = "rgba(245,158,11,0.1)"
        action_desc = "Not compelling enough yet. Monitor for a catalyst or better entry."
    elif oracle >= 35:
        action = "REDUCE / AVOID"
        action_color = "#f97316"
        action_bg = "rgba(249,115,22,0.1)"
        action_desc = "Risk outweighs reward at current levels. Better opportunities exist."
    else:
        action = "AVOID"
        action_color = "#ef4444"
        action_bg = "rgba(239,68,68,0.1)"
        action_desc = "Multiple red flags in fundamentals. High probability of underperformance."

    # Investor profile
    profiles = []
    if oracle >= 65:
        if growth >= 70 and mc and mc < 20e9:
            profiles.append("🌱 Growth Investors (high-growth small/mid cap)")
        if val >= 60 and health >= 65:
            profiles.append("💎 Value Investors (strong fundamentals)")
        if beta and beta < 1.2:
            profiles.append("🛡️ Conservative Investors (low volatility)")
        if beta and beta > 1.5:
            profiles.append("⚡ Momentum Traders (high beta swing)")
    else:
        profiles.append("⚠️ Speculative only — not suitable for core positions")

    if not profiles:
        profiles.append("General investors with moderate risk tolerance")

    return {
        "action": action,
        "action_color": action_color,
        "action_bg": action_bg,
        "action_desc": action_desc,
        "profiles": profiles,
        "grade": grade,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def build_ml_overview(financials: dict, scores: dict) -> dict:
    """
    Called after Gemini/mock generates the base analysis.
    Returns the structured 'Oracle Intelligence Overview' for the frontend.
    """
    return {
        "sentiment": _sentiment_consensus(financials, scores),
        "valuation_divergence": _valuation_divergence(financials),
        "ownership": _ownership_signal(financials),
        "action_matrix": _action_matrix(financials, scores),
        "powered_by_gemini": bool(
            __import__('os').getenv("GEMINI_API_KEY") and
            __import__('os').getenv("GEMINI_API_KEY") != "your_gemini_api_key_here"
        ),
    }
