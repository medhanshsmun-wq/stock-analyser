import os
import yfinance as yf
try:
    from google import genai as google_genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    google_genai = None
    genai_types = None

from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# TICKER RESOLUTION
# ─────────────────────────────────────────────────────────────────────────────

# US Large Caps
KNOWN_TICKERS = {
    "APPLE": "AAPL", "MICROSOFT": "MSFT", "TESLA": "TSLA", "NVIDIA": "NVDA",
    "GOOGLE": "GOOGL", "ALPHABET": "GOOGL", "AMAZON": "AMZN", "META": "META",
    "NETFLIX": "NFLX", "AMD": "AMD", "INTEL": "INTC", "QUALCOMM": "QCOM",
    "PAYPAL": "PYPL", "SALESFORCE": "CRM", "SHOPIFY": "SHOP", "UBER": "UBER",
    "AIRBNB": "ABNB", "SPOTIFY": "SPOT", "PALANTIR": "PLTR", "SNOWFLAKE": "SNOW",
    "COINBASE": "COIN", "ROBINHOOD": "HOOD", "RIVIAN": "RIVN", "LUCID": "LCID",
    "JPMORGAN": "JPM", "GOLDMAN": "GS", "BERKSHIRE": "BRK-B", "VISA": "V",
    "MASTERCARD": "MA", "JOHNSON": "JNJ", "PFIZER": "PFE", "MODERNA": "MRNA",
    "WALMART": "WMT", "TARGET": "TGT", "COSTCO": "COST", "HOME DEPOT": "HD",
    "DISNEY": "DIS", "COMCAST": "CMCSA", "FORD": "F", "GM": "GM",
    "BOEING": "BA", "LOCKHEED": "LMT", "EXXON": "XOM", "CHEVRON": "CVX",
    "ORACLE": "ORCL", "IBM": "IBM", "ADOBE": "ADBE", "ZOOM": "ZM",
    "TWILIO": "TWLO", "DATADOG": "DDOG", "MONGODB": "MDB", "CLOUDFLARE": "NET",
    "BLOCK": "SQ", "SQUARE": "SQ", "STRIPE": "N/A", "OPENAI": "N/A",
    "ARM": "ARM", "ASML": "ASML", "TSMC": "TSM", "SAMSUNG": "SSNLF",
    "ALIBABA": "BABA", "TENCENT": "TCEHY", "BAIDU": "BIDU", "JD": "JD",
    # Indian Stocks (NSE)
    "RELIANCE": "RELIANCE.NS", "TCS": "TCS.NS", "INFOSYS": "INFY.NS",
    "INFY": "INFY.NS", "WIPRO": "WIPRO.NS", "HCL": "HCLTECH.NS",
    "HCLTECH": "HCLTECH.NS", "TECH MAHINDRA": "TECHM.NS", "TECHM": "TECHM.NS",
    "HDFC": "HDFCBANK.NS", "HDFC BANK": "HDFCBANK.NS", "HDFCBANK": "HDFCBANK.NS",
    "ICICI": "ICICIBANK.NS", "ICICI BANK": "ICICIBANK.NS", "SBI": "SBIN.NS",
    "AXIS BANK": "AXISBANK.NS", "AXISBANK": "AXISBANK.NS",
    "KOTAK": "KOTAKBANK.NS", "KOTAK BANK": "KOTAKBANK.NS",
    "TATA": "TCS.NS", "TATA MOTORS": "TATAMOTORS.NS", "TATAMOTORS": "TATAMOTORS.NS",
    "TATA STEEL": "TATASTEEL.NS", "TATASTEEL": "TATASTEEL.NS",
    "TATA CONSULTANCY": "TCS.NS", "TATA POWER": "TATAPOWER.NS",
    "INFRA": "INFRATEL.NS", "INDIGO": "INDIGO.NS", "INTERGLOBE": "INDIGO.NS",
    "BAJAJ": "BAJFINANCE.NS", "BAJAJ FINANCE": "BAJFINANCE.NS", "BAJFINANCE": "BAJFINANCE.NS",
    "BAJAJ AUTO": "BAJAJ-AUTO.NS", "BAJAJ FINSERV": "BAJAJFINSV.NS",
    "LARSEN": "LT.NS", "L&T": "LT.NS", "LT": "LT.NS",
    "MARUTI": "MARUTI.NS", "MARUTI SUZUKI": "MARUTI.NS",
    "ASIAN PAINTS": "ASIANPAINT.NS", "ASIANPAINT": "ASIANPAINT.NS",
    "HINDUSTAN UNILEVER": "HINDUNILVR.NS", "HUL": "HINDUNILVR.NS",
    "NESTLE": "NESTLEIND.NS", "NESTLE INDIA": "NESTLEIND.NS",
    "ITC": "ITC.NS", "BRITANNIA": "BRITANNIA.NS",
    "TITAN": "TITAN.NS", "TRENT": "TRENT.NS",
    "SUN PHARMA": "SUNPHARMA.NS", "SUNPHARMA": "SUNPHARMA.NS",
    "DR REDDY": "DRREDDY.NS", "DRREDDY": "DRREDDY.NS", "CIPLA": "CIPLA.NS",
    "DIVIS": "DIVISLAB.NS", "APOLLO": "APOLLOHOSP.NS",
    "ONGC": "ONGC.NS", "NTPC": "NTPC.NS", "POWERGRID": "POWERGRID.NS",
    "COAL INDIA": "COALINDIA.NS", "COALINDIA": "COALINDIA.NS",
    "ADANI": "ADANIENT.NS", "ADANI ENTERPRISES": "ADANIENT.NS",
    "ADANI PORTS": "ADANIPORTS.NS", "ADANI GREEN": "ADANIGREEN.NS",
    "ZOMATO": "ZOMATO.NS", "PAYTM": "PAYTM.NS", "NYKAA": "NYKAA.NS",
    "DMART": "DMART.NS", "AVENUE": "DMART.NS",
    "MOTHERSON": "MOTHERSON.NS", "MUTHOOT": "MUTHOOTFIN.NS",
    "OSWAL": "OSWAL.NS", "MOTILAL OSWAL": "MOTILALOFS.NS",
    "ZERODHA": "N/A", "ANGEL": "ANGELONE.NS", "ANGEL ONE": "ANGELONE.NS",
    "HDFC LIFE": "HDFCLIFE.NS", "SBI LIFE": "SBILIFE.NS",
    "BANDHAN": "BANDHANBNK.NS", "YES BANK": "YESBANK.NS", "YESBANK": "YESBANK.NS",
    "INDUSIND": "INDUSINDBK.NS", "INDUSIND BANK": "INDUSINDBK.NS",
    "PNB": "PNB.NS", "BOB": "BANKBARODA.NS", "BANK OF BARODA": "BANKBARODA.NS",
    "JSPL": "JSPL.NS", "JSW": "JSWSTEEL.NS", "JSW STEEL": "JSWSTEEL.NS",
    "VEDANTA": "VEDL.NS", "HINDALCO": "HINDALCO.NS",
    "ULTRATECH": "ULTRACEMCO.NS", "ACC": "ACC.NS", "AMBUJA": "AMBUJACEM.NS",
    "PIDILITE": "PIDILITIND.NS", "BERGEPAINT": "BERGEPAINT.NS",
    "HAVELLS": "HAVELLS.NS", "VOLTAS": "VOLTAS.NS",
    "IRCTC": "IRCTC.NS", "IRFC": "IRFC.NS", "HAL": "HAL.NS",
    "BEL": "BEL.NS", "BHEL": "BHEL.NS",
}

# For Indian stocks that don't appear in KNOWN_TICKERS, we try .NS suffix
INDIAN_EXCHANGE_SUFFIXES = [".NS", ".BO"]


def _verify_ticker(sym: str) -> str:
    """Try to fetch basic info for a ticker, return sym if valid, else try suffixes."""
    # Skip invalid placeholder
    if sym == "N/A":
        return None
    try:
        t = yf.Ticker(sym)
        info = t.fast_info
        if hasattr(info, 'last_price') and info.last_price:
            return sym
        # Check via info dict
        d = t.info
        if d and d.get("currentPrice") or d.get("regularMarketPrice"):
            return sym
    except Exception:
        pass
    # Try Indian exchange suffixes
    base = sym.split(".")[0]  # strip any existing suffix
    for suffix in INDIAN_EXCHANGE_SUFFIXES:
        candidate = base + suffix
        try:
            t = yf.Ticker(candidate)
            d = t.info
            if d and (d.get("currentPrice") or d.get("regularMarketPrice") or d.get("shortName")):
                return candidate
        except Exception:
            continue
    return None


def extract_ticker(query: str, provided_ticker: str = None, previous_ticker: str = None) -> str:
    if provided_ticker:
        return provided_ticker.upper().strip()
    q = query.upper().strip()
    words = q.split()
    
    # 1. Check known name map first (longest match wins)
    for name in sorted(KNOWN_TICKERS, key=len, reverse=True):
        if name in q:
            t = KNOWN_TICKERS[name]
            if t != "N/A":
                return t
                
    # 2. If it's a single short word, assume it's a ticker
    if len(words) == 1:
        clean = words[0].strip(".,?!")
        if 1 <= len(clean) <= 8:  # 8 allows for suffixes like .NS, .L
            return clean

    # 3. AI Ticker Resolution (Intelligent Fallback)
    conversational_fillers = [
        "WHAT", "HOW", "WHY", "TELL", "SHOW", "ABOUT", "THEIR", "ITS", "THIS", "THE", 
        "COMPETITORS", "RISKS", "DEBT", "MARGINS", "THINK", "GOING", "LONG", "SHORT", 
        "BUY", "SELL", "HOLD", "OPINION", "VIEW", "DO", "YOU", "U", "ARE", "IS", "ME", 
        "ON", "IN", "FOR", "THAT", "IT"
    ]
    
    # Check if this contains strong follow-up keywords
    follow_up_keywords = ["THIS", "THEY", "THEM", "IT", "ITS", "THAT", "COMPANY", "STOCK"]
    has_follow_up_keyword = any(word in q for word in follow_up_keywords)
    
    # Calculate filler ratio
    filler_count = sum(1 for word in words if word.strip(".,?!") in conversational_fillers)
    is_mostly_filler = (filler_count / len(words)) > 0.4 if len(words) > 0 else False
    
    if not is_mostly_filler and len(words) < 15 and GENAI_AVAILABLE:
        try:
            prompt = f"What is the exact official Yahoo Finance ticker symbol for the company referenced in: '{query}'? Reply with ONLY the symbol (e.g. AAPL, MC.PA, RELIANCE.NS). If no specific company is mentioned, reply 'NONE'. No other text."
            ai_ticker = generate_with_gemini(prompt)
            if ai_ticker and "NONE" not in ai_ticker.upper():
                clean_ai = ai_ticker.strip().replace("`", "").upper()
                if 1 <= len(clean_ai) <= 15 and " " not in clean_ai:
                    return clean_ai
        except Exception:
            pass

    # 4. Context fallback: If we were just talking about a ticker and this looks like a follow-up
    if previous_ticker:
        # If it's mostly fillers, or has follow-up pronouns, or is very short
        if is_mostly_filler or has_follow_up_keyword or len(words) <= 6:
            return previous_ticker

    # 5. Naive fallback word extraction (avoid tiny common words)
    for word in words:
        clean = word.strip(".,?!")
        if 3 <= len(clean) <= 6 and clean.isalpha() and clean not in conversational_fillers:
            return clean
            
    return previous_ticker or "AAPL"

# ─────────────────────────────────────────────────────────────────────────────
# DATA FETCHING — pulls every meaningful signal from yfinance
# ─────────────────────────────────────────────────────────────────────────────

def get_company_data(ticker_symbol: str):
    ticker = yf.Ticker(ticker_symbol)
    info = ticker.info or {}

    # Historical prices
    hist = ticker.history(period="2y")
    hist.reset_index(inplace=True)
    chart_data = [
        {"date": row["Date"].strftime("%Y-%m-%d"), "price": round(float(row["Close"]), 2), "volume": int(row["Volume"])}
        for _, row in hist.iterrows()
    ]

    # Quarterly financials for trend analysis
    try:
        q_income = ticker.quarterly_income_stmt
        quarterly_revenue = []
        quarterly_earnings = []
        if q_income is not None and not q_income.empty:
            for col in list(q_income.columns)[:8]:
                rev = q_income.loc["Total Revenue", col] if "Total Revenue" in q_income.index else None
                net = q_income.loc["Net Income", col] if "Net Income" in q_income.index else None
                quarterly_revenue.append({"quarter": str(col)[:10], "revenue": float(rev) if rev and rev == rev else 0})
                quarterly_earnings.append({"quarter": str(col)[:10], "earnings": float(net) if net and net == net else 0})
        quarterly_revenue.reverse()
        quarterly_earnings.reverse()
    except Exception:
        quarterly_revenue, quarterly_earnings = [], []

    # Analyst recommendations
    try:
        recs = ticker.recommendations
        if recs is not None and not recs.empty:
            latest_rec = recs.iloc[-1] if len(recs) > 0 else None
            analyst_action = str(latest_rec.get("Action", "N/A")) if latest_rec is not None else "N/A"
        else:
            analyst_action = "N/A"
    except Exception:
        analyst_action = "N/A"

    def _safe(key, default=None):
        v = info.get(key, default)
        return v if v is not None and v != "" else default

    financials = {
        # Identity
        "ticker": ticker_symbol,
        "name": _safe("shortName", ticker_symbol),
        "sector": _safe("sector", "Unknown"),
        "industry": _safe("industry", "Unknown"),
        "country": _safe("country", "Unknown"),
        "summary": _safe("longBusinessSummary", ""),
        "website": _safe("website", ""),
        "employees": _safe("fullTimeEmployees", "N/A"),
        # Price & Cap
        "current_price": _safe("currentPrice", 0),
        "market_cap": _safe("marketCap", 0),
        "enterprise_value": _safe("enterpriseValue", 0),
        "fifty_two_week_high": _safe("fiftyTwoWeekHigh", 0),
        "fifty_two_week_low": _safe("fiftyTwoWeekLow", 0),
        "avg_volume": _safe("averageVolume", 0),
        # Valuation
        "pe_ratio": _safe("trailingPE"),
        "forward_pe": _safe("forwardPE"),
        "peg_ratio": _safe("pegRatio"),
        "price_to_book": _safe("priceToBook"),
        "price_to_sales": _safe("priceToSalesTrailing12Months"),
        "ev_to_ebitda": _safe("enterpriseToEbitda"),
        "ev_to_revenue": _safe("enterpriseToRevenue"),
        # Financials
        "revenue": _safe("totalRevenue"),
        "revenue_growth": _safe("revenueGrowth"),
        "gross_margins": _safe("grossMargins"),
        "operating_margins": _safe("operatingMargins"),
        "profit_margins": _safe("profitMargins"),
        "ebitda": _safe("ebitda"),
        "free_cashflow": _safe("freeCashflow"),
        "earnings_growth": _safe("earningsGrowth"),
        "eps_trailing": _safe("trailingEps"),
        "eps_forward": _safe("forwardEps"),
        # Balance sheet
        "total_cash": _safe("totalCash"),
        "total_debt": _safe("totalDebt"),
        "debt_to_equity": _safe("debtToEquity"),
        "current_ratio": _safe("currentRatio"),
        "quick_ratio": _safe("quickRatio"),
        # Returns & dividends
        "roe": _safe("returnOnEquity"),
        "roa": _safe("returnOnAssets"),
        "dividend_yield": _safe("dividendYield"),
        "payout_ratio": _safe("payoutRatio"),
        # Institutional / insider
        "institutional_ownership": _safe("institutionalOwnershipPct") or _safe("heldPercentInstitutions"),
        "insider_ownership": _safe("heldPercentInsiders"),
        "short_ratio": _safe("shortRatio"),
        "beta": _safe("beta"),
        # Analyst targets
        "analyst_target_mean": _safe("targetMeanPrice"),
        "analyst_target_high": _safe("targetHighPrice"),
        "analyst_target_low": _safe("targetLowPrice"),
        "analyst_recommendation": _safe("recommendationKey", "N/A"),
        "analyst_count": _safe("numberOfAnalystOpinions", 0),
        "analyst_action": analyst_action,
    }

    return financials, chart_data, quarterly_revenue, quarterly_earnings

# ─────────────────────────────────────────────────────────────────────────────
# FINANCIAL WIZARD SCORING ENGINE  (the "ML layer")
# Computes 6 sub-scores from real metrics and combines them into a master score
# ─────────────────────────────────────────────────────────────────────────────

def compute_wizard_score(f: dict) -> dict:
    """
    Returns a dict with sub-scores (0-100) and a master OracleScore (0-100).
    Higher = more attractive investment.
    """
    scores = {}

    # 1. VALUATION SCORE — lower multiples relative to growth → better value
    val = 50
    pe = f.get("pe_ratio")
    peg = f.get("peg_ratio")
    pb = f.get("price_to_book")
    if pe:
        if pe < 10: val += 20
        elif pe < 20: val += 10
        elif pe < 30: val += 0
        elif pe < 50: val -= 10
        else: val -= 20
    if peg:
        if peg < 1: val += 20
        elif peg < 1.5: val += 10
        elif peg < 2: val += 0
        else: val -= 15
    if pb:
        if pb < 1: val += 10
        elif pb < 3: val += 5
        elif pb > 10: val -= 10
    scores["valuation"] = max(0, min(100, val))

    # 2. GROWTH SCORE — revenue & earnings growth
    grow = 50
    rev_g = f.get("revenue_growth") or 0
    earn_g = f.get("earnings_growth") or 0
    if rev_g > 0.5: grow += 30
    elif rev_g > 0.3: grow += 20
    elif rev_g > 0.15: grow += 10
    elif rev_g > 0.05: grow += 5
    elif rev_g < 0: grow -= 20
    if earn_g > 0.5: grow += 20
    elif earn_g > 0.2: grow += 10
    elif earn_g < 0: grow -= 15
    scores["growth"] = max(0, min(100, grow))

    # 3. PROFITABILITY SCORE
    prof = 50
    gm = f.get("gross_margins") or 0
    om = f.get("operating_margins") or 0
    pm = f.get("profit_margins") or 0
    roe = f.get("roe") or 0
    if gm > 0.6: prof += 15
    elif gm > 0.4: prof += 8
    elif gm < 0.15: prof -= 10
    if pm > 0.2: prof += 20
    elif pm > 0.1: prof += 10
    elif pm > 0: prof += 5
    elif pm < -0.1: prof -= 20
    if roe > 0.3: prof += 15
    elif roe > 0.15: prof += 8
    elif roe < 0: prof -= 10
    scores["profitability"] = max(0, min(100, prof))

    # 4. FINANCIAL HEALTH SCORE
    health = 50
    dr = f.get("debt_to_equity")
    cr = f.get("current_ratio")
    fcf = f.get("free_cashflow") or 0
    if dr is not None:
        if dr < 30: health += 20
        elif dr < 80: health += 10
        elif dr > 200: health -= 20
    if cr:
        if cr > 2: health += 15
        elif cr > 1: health += 5
        elif cr < 1: health -= 15
    if fcf > 0: health += 15
    elif fcf < 0: health -= 15
    scores["financial_health"] = max(0, min(100, health))

    # 5. MOMENTUM SCORE — price vs 52w range, analyst targets
    mom = 50
    price = f.get("current_price") or 0
    hi = f.get("fifty_two_week_high") or price
    lo = f.get("fifty_two_week_low") or price
    if hi > lo:
        pct_range = (price - lo) / (hi - lo)
        if pct_range < 0.3: mom += 15   # near low = potential upside
        elif pct_range > 0.9: mom -= 10  # near high = less upside
    target = f.get("analyst_target_mean")
    if target and price:
        upside = (target - price) / price
        if upside > 0.3: mom += 25
        elif upside > 0.15: mom += 15
        elif upside > 0.05: mom += 5
        elif upside < -0.05: mom -= 15
    rec = str(f.get("analyst_recommendation", "")).lower()
    if "strong_buy" in rec or "strongbuy" in rec: mom += 15
    elif "buy" in rec: mom += 10
    elif "hold" in rec: mom -= 5
    elif "sell" in rec: mom -= 20
    scores["momentum"] = max(0, min(100, mom))

    # 6. HIDDEN GEM SCORE — rewards small/mid caps with high growth & low valuation
    gem = 50
    mc = f.get("market_cap") or 0
    if 0 < mc < 2e9: gem += 20        # small cap bonus
    elif mc < 10e9: gem += 10          # mid cap
    elif mc > 500e9: gem -= 10         # mega cap penalty
    peg2 = f.get("peg_ratio")
    if peg2 and peg2 < 1: gem += 20  # growing fast for cheap
    ins = f.get("insider_ownership") or 0
    if ins > 0.1: gem += 10           # skin in the game
    short = f.get("short_ratio") or 0
    if short > 5: gem -= 15            # heavy short interest = risk
    scores["hidden_gem"] = max(0, min(100, gem))

    # MASTER ORACLE SCORE (weighted blend)
    weights = {
        "valuation": 0.20,
        "growth": 0.25,
        "profitability": 0.20,
        "financial_health": 0.15,
        "momentum": 0.12,
        "hidden_gem": 0.08,
    }
    master = sum(scores[k] * weights[k] for k in weights)
    scores["oracle_score"] = round(master, 1)

    # Grade
    if master >= 80: scores["grade"] = "A+"
    elif master >= 70: scores["grade"] = "A"
    elif master >= 60: scores["grade"] = "B+"
    elif master >= 50: scores["grade"] = "B"
    elif master >= 40: scores["grade"] = "C"
    else: scores["grade"] = "D"

    # Outlook
    if master >= 75: scores["outlook"] = "🚀 Strong Buy"
    elif master >= 62: scores["outlook"] = "✅ Bullish"
    elif master >= 48: scores["outlook"] = "⚖️ Neutral / Hold"
    elif master >= 35: scores["outlook"] = "⚠️ Cautious"
    else: scores["outlook"] = "🔴 Bearish"

    return scores


# ─────────────────────────────────────────────────────────────────────────────
# PROMPT BUILDER — feeds rich context to the LLM
# ─────────────────────────────────────────────────────────────────────────────

def build_prompt(f: dict, scores: dict, query: str, history: list = []) -> str:
    def pct(v): return f"{v*100:.1f}%" if v is not None else "N/A"
    def usd(v):
        if v is None: return "N/A"
        if abs(v) >= 1e12: return f"${v/1e12:.2f}T"
        if abs(v) >= 1e9: return f"${v/1e9:.2f}B"
        if abs(v) >= 1e6: return f"${v/1e6:.2f}M"
        return f"${v:,.0f}"

    upside = None
    if f.get("analyst_target_mean") and f.get("current_price"):
        upside = (f["analyst_target_mean"] - f["current_price"]) / f["current_price"]

    # Format history for the prompt
    history_str = ""
    if history:
        history_str = "\n## CONVERSATION HISTORY\n"
        for msg in history[-5:]: # Last 5 messages for context
            role = "USER" if msg["role"] == "user" else "NEXUS"
            content = msg["content"][:300] + "..." if len(msg["content"]) > 300 else msg["content"]
            history_str += f"{role}: {content}\n"

    return f"""
You are NEXUS, the world's most advanced AI investment analyst.
You have just run a full quantitative analysis on **{f.get('name', 'this company')} ({f.get('ticker')})**.

{history_str}

## CURRENT USER QUERY
"{query}"

## QUANTITATIVE NEXUS SCORES (our proprietary ML scoring engine)
| Factor | Score /100 |
|--------|-----------|
| Valuation | {scores.get('valuation', '?')} |
| Growth | {scores.get('growth', '?')} |
| Profitability | {scores.get('profitability', '?')} |
| Financial Health | {scores.get('financial_health', '?')} |
| Momentum | {scores.get('momentum', '?')} |
| Hidden Gem Potential | {scores.get('hidden_gem', '?')} |
| **NEXUS MASTER SCORE** | **{scores.get('oracle_score', '?')} / 100 ({scores.get('grade', '?')})** |
| **Outlook** | **{scores.get('outlook', '?')}** |

## REAL FINANCIAL DATA (Context)
- **Company:** {f.get('name')} | **Sector:** {f.get('sector')}
- **Price:** ${f.get('current_price')} | **Market Cap:** {usd(f.get('market_cap'))}
- **Growth (YoY):** Revenue {pct(f.get('revenue_growth'))} | Earnings {pct(f.get('earnings_growth'))}
- **Margins:** Gross {pct(f.get('gross_margins'))} | Net {pct(f.get('profit_margins'))}
- **Ratios:** P/E {f.get('pe_ratio', 'N/A')} | PEG {f.get('peg_ratio', 'N/A')} | Debt/Equity {f.get('debt_to_equity', 'N/A')}
- **Analyst:** Rating {f.get('analyst_recommendation', 'N/A').upper()} | Target ${f.get('analyst_target_mean', 'N/A')}

---

## YOUR TASK
If this is a follow-up question (check history), answer the user's specific query BRIEFLY and BRILLIANTLY using the data above.
If this is a new company request, write a full masterclass-level investment analysis structured exactly as:

### 🏢 Company Overview
...
### 📊 Financial Health Assessment
...
### 🚀 Bull Case — Why It Could Surge
...
### 🐻 Bear Case — The Risks
...
### 🔭 12-Month Price Prediction
...
### 🏅 Nexus Verdict — {scores.get('oracle_score', '?')}/100 ({scores.get('grade', '?')}) — {scores.get('outlook', '?')}
...

Be direct, opinionated, and use bold text for key numbers.
"""

# ─────────────────────────────────────────────────────────────────────────────
# RICH MOCK FALLBACK (uses real computed data)
# ─────────────────────────────────────────────────────────────────────────────

def get_rich_mock_analysis(f: dict, scores: dict, query: str = "") -> str:
    # Check if this is a follow-up query based on keywords
    follow_up_keywords = ["DEBT", "RISK", "COMPETITOR", "MARGIN", "WHY", "HOW", "WHAT ABOUT", "TELL ME MORE"]
    is_follow_up = any(k in query.upper() for k in follow_up_keywords) or (len(query.split()) < 5 and query.strip("?").upper() not in ["APPLE", "TESLA", "RELIANCE", "TCS"])

    if is_follow_up:
        return f"""### 💬 Nexus Follow-up Analysis: {f.get('name')}
Nexus has processed your follow-up query: *"{query}"*.

**System Insight:**
The data indicates that **{f.get('name')}** currently faces {f.get('debt_to_equity', 'moderate')} leverage and {f.get('profit_margins', 'shifting')} margins. 
For a deeper narrative on **{query}**, please ensure your `GEMINI_API_KEY` is active and has sufficient quota.

**Quick Stats:**
- **Current Price:** ${f.get('current_price')}
- **Oracle Verdict:** {scores.get('oracle_score')}/100 ({scores.get('grade')})
"""

    name = f.get("name", "This company")
    ticker = f.get("ticker", "N/A")
    price = f.get("current_price", 0)
    pe = f.get("pe_ratio", "N/A")
    mc = f.get("market_cap", 0)
    rev_g = f.get("revenue_growth")
    pm = f.get("profit_margins")
    fw_pe = f.get("forward_pe", "N/A")
    d_e = f.get("debt_to_equity", "N/A")
    roe = f.get("roe")
    peg = f.get("peg_ratio", "N/A")
    target = f.get("analyst_target_mean")
    rec = str(f.get("analyst_recommendation", "N/A")).upper()
    sector = f.get("sector", "Unknown")
    industry = f.get("industry", "Unknown")
    beta = f.get("beta", "N/A")
    hi = f.get("fifty_two_week_high", 0)
    lo = f.get("fifty_two_week_low", 0)
    fcf = f.get("free_cashflow")
    gm = f.get("gross_margins")

    def pct(v): return f"{v*100:.1f}%" if v is not None else "N/A"
    def usd(v):
        if v is None: return "N/A"
        if abs(v) >= 1e12: return f"${v/1e12:.2f}T"
        if abs(v) >= 1e9: return f"${v/1e9:.2f}B"
        if abs(v) >= 1e6: return f"${v/1e6:.2f}M"
        return f"${v:,.0f}"

    upside_str = ""
    if target and price:
        upside = (target - price) / price * 100
        upside_str = f"Analyst consensus target of **${target:.2f}** implies **{upside:+.1f}%** upside from current price."

    # Growth characterization
    if rev_g and rev_g > 0.3:
        growth_desc = f"explosive revenue growth of **{pct(rev_g)}** YoY"
    elif rev_g and rev_g > 0.1:
        growth_desc = f"steady revenue growth of **{pct(rev_g)}** YoY"
    elif rev_g and rev_g > 0:
        growth_desc = f"modest revenue growth of **{pct(rev_g)}** YoY"
    else:
        growth_desc = "revenue under pressure" + (f" ({pct(rev_g)} YoY)" if rev_g else "")

    # Bull case drivers (data-backed)
    bull1 = f"Gross margins of **{pct(gm)}** indicate strong pricing power and a durable competitive moat in {industry}." if gm else f"Strong positioning in the **{industry}** space with demonstrated pricing leverage."
    bull2 = f"PEG ratio of **{peg}** suggests the market may be undervaluing {name}'s growth trajectory — a classic hidden-value signal." if peg and isinstance(peg, (int, float)) and peg < 2 else f"Forward P/E of **{fw_pe}** vs trailing **{pe}** signals analysts expect margin expansion ahead."
    bull3 = f"Free cash flow of **{usd(fcf)}** gives {name} ammunition for buybacks, acquisitions, or debt reduction." if fcf and fcf > 0 else f"Analyst consensus rating of **{rec}** across {f.get('analyst_count', '?')} analysts suggests institutional confidence."

    # Bear case drivers
    bear1 = f"At **{d_e}** Debt/Equity ratio, leverage is a potential vulnerability if interest rates remain elevated." if d_e and isinstance(d_e, (int, float)) and d_e > 50 else f"Beta of **{beta}** means the stock moves significantly with broader market swings — macro risk is real."
    bear2 = f"Trading at **{pe}x** trailing earnings, any growth deceleration could trigger a multiple compression and sharp correction." if pe else f"Valuation multiples leave limited margin of safety if the business misses estimates."
    bear3 = f"At **{pct(pm)}** net margin, there minimal buffer against price competition or cost inflation." if pm and pm < 0.1 else f"The stock is **{((price - lo) / (hi - lo) * 100):.0f}%** off its 52-week low — some near-term resistance likely at previous highs." if hi > lo else f"Competitive dynamics in **{sector}** are intensifying, which could erode current market share."

    oracle_score = scores.get("oracle_score", 50)
    grade = scores.get("grade", "B")
    outlook = scores.get("outlook", "⚖️ Neutral")

    return f"""### 🏢 Company Overview
**{name} ({ticker})** operates in the **{industry}** segment of the {sector} sector. Currently priced at **${price}**, the company shows {growth_desc}. Its business generates revenue of **{usd(f.get('revenue'))}** with an enterprise value of **{usd(f.get('enterprise_value'))}**, implying **EV/Revenue of {f.get('ev_to_revenue', 'N/A')}x**.

### 📊 Financial Health Assessment
- **Profitability:** Gross margins of **{pct(gm)}**, net margins of **{pct(pm)}**, and ROE of **{pct(roe)}** — {"solid fundamentals" if pm and pm > 0.1 else "needs margin improvement"}.
- **Balance Sheet:** Debt/Equity at **{d_e}**, current ratio **{f.get('current_ratio', 'N/A')}x** — {"healthy liquidity" if f.get('current_ratio') and f.get('current_ratio') > 1.5 else "watch the balance sheet carefully"}.
- **Cash Generation:** Free cash flow of **{usd(fcf)}** — {"a powerful value creator" if fcf and fcf > 0 else "negative FCF is a concern"}.

### 🚀 Bull Case — Why It Could Surge
1. {bull1}
2. {bull2}
3. {bull3}

### 🐻 Bear Case — The Risks
1. {bear1}
2. {bear2}
3. {bear3}

### 🔭 12-Month Price Prediction
| Scenario | Target | Probability |
|----------|--------|-------------|
| 🐻 Bear | **${price * 0.75:.2f}** (-25%) | 25% |
| ⚖️ Base | **${price * 1.12:.2f}** (+12%) | 50% |
| 🚀 Bull | **${price * 1.40:.2f}** (+40%) | 25% |

{upside_str}

> **Note:** To unlock live Gemini AI analysis with deeper narrative and real-time reasoning, add your `GEMINI_API_KEY` to `backend/.env`.

### 🏅 Nexus Verdict — {oracle_score}/100 ({grade}) — {outlook}
**{name}** scores **{oracle_score}/100** on the Nexus proprietary scoring engine across valuation, growth, profitability, and balance sheet health. {"This represents a compelling opportunity — the data supports a meaningful position for investors with a 12-18 month horizon." if oracle_score >= 65 else "The risk/reward is balanced but warrants careful position sizing and close monitoring of upcoming earnings." if oracle_score >= 45 else "The data signals elevated risk — defensive investors should wait for a better entry point or catalyst."}
"""

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_with_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here" or not GENAI_AVAILABLE:
        return None
    try:
        client = google_genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Gemini error: {e}")
        return None

def analyze_company(query: str, ticker: str = None, history: list = []):
    # Detect if we have a previous ticker in history
    previous_ticker = None
    for msg in reversed(history):
        if msg.get("ticker"):
            previous_ticker = msg["ticker"]
            break
            
    target_ticker = extract_ticker(query, ticker, previous_ticker)

    try:
        financials, chart_data, quarterly_revenue, quarterly_earnings = get_company_data(target_ticker)
    except Exception as e:
        # Try .NS suffix as a second attempt for Indian stocks
        if ".NS" not in target_ticker and ".BO" not in target_ticker:
            try:
                ns_ticker = target_ticker + ".NS"
                financials, chart_data, quarterly_revenue, quarterly_earnings = get_company_data(ns_ticker)
                target_ticker = ns_ticker
            except Exception:
                pass
        else:
            raise ValueError(f"Could not fetch data for '{target_ticker}': {e}")

    # Validate we got real price data
    if not financials or not financials.get("current_price"):
        friendly = (
            f"### ❌ Ticker Not Found: `{target_ticker}`\n\n"
            f"Nexus couldn't find market data for **{query}**. Try entering a valid stock symbol like AAPL or RELIANCE.NS."
        )
        return {
            "ticker": target_ticker,
            "financials": {"name": query, "ticker": target_ticker, "current_price": None},
            "chart_data": [],
            "quarterly_revenue": [],
            "quarterly_earnings": [],
            "scores": {"oracle_score": 0, "grade": "N/A", "outlook": "❌ Not Found"},
            "analysis": friendly,
            "ml_overview": None,
        }

    # Run our proprietary ML scoring engine
    scores = compute_wizard_score(financials)

    # Try Gemini first, fall back to rich mock
    prompt = build_prompt(financials, scores, query, history)
    analysis = generate_with_gemini(prompt)
    if not analysis:
        # If it's a follow-up but Gemini failed, we should probably still try to give a meaningful response
        # or just fall back to the rich mock (which is stock-specific)
        analysis = get_rich_mock_analysis(financials, scores, query)

    return {
        "ticker": target_ticker,
        "financials": financials,
        "chart_data": chart_data,
        "quarterly_revenue": quarterly_revenue,
        "quarterly_earnings": quarterly_earnings,
        "scores": scores,
        "analysis": analysis,
    }
