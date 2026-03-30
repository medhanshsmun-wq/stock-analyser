import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Trash2, TrendingUp, TrendingDown, BrainCircuit,
  ExternalLink, PieChart, Activity, Zap, Shield, BarChart3,
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, X
} from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api';

// ── Mock Broker Holdings (simulating gateway response) ────────────────────
const MOCK_HOLDINGS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries', sector: 'Energy',  quantity: 10, avg_price: 2500, ltp: 2650 },
  { symbol: 'INFY',       name: 'Infosys Ltd',         sector: 'IT',      quantity: 15, avg_price: 1400, ltp: 1380 },
  { symbol: 'TCS',        name: 'Tata Consultancy',    sector: 'IT',      quantity: 5,  avg_price: 3200, ltp: 3450 },
  { symbol: 'HDFC',       name: 'HDFC Bank',           sector: 'Finance', quantity: 8,  avg_price: 1600, ltp: 1720 },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',           sector: 'IT',      quantity: 20, avg_price: 420,  ltp: 395  },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance',       sector: 'Finance', quantity: 3,  avg_price: 7200, ltp: 7580 },
];

const BROKERS = [
  { id: 'zerodha', name: 'Zerodha',   icon: Zap,      color: '#f59e0b' },
  { id: 'upstox',  name: 'Upstox',    icon: ArrowUpRight, color: '#6366f1' },
  { id: 'angel',   name: 'Angel One', icon: Activity,  color: '#f05252' },
  { id: 'groww',   name: 'Groww',     icon: TrendingUp, color: '#3ddc84' },
];

const SECTOR_COLORS = {
  'IT':      '#6366f1',
  'Energy':  '#f59e0b',
  'Finance': '#c9a84c',
  'Pharma':  '#3ddc84',
  'Auto':    '#f05252',
  'Consumer':'#06b6d4',
  'Metals':  '#a78bfa',
};

const STORAGE_KEY = 'nexus_portfolio_manual';

// ── Helpers ───────────────────────────────────────────────────────────────
function computeOracleScore(h) {
  const pnlPct = ((h.ltp - h.avg_price) / h.avg_price) * 100;
  const base = 50 + pnlPct * 2.5;
  return Math.min(99, Math.max(10, Math.round(base + (Math.random() * 10 - 5))));
}

function normalizeHoldings(raw) {
  return raw.map(h => ({
    ...h,
    current_price: h.ltp,
    pnl: (h.ltp - h.avg_price) * h.quantity,
    pnl_pct: ((h.ltp - h.avg_price) / h.avg_price) * 100,
    value: h.ltp * h.quantity,
    oracle_score: computeOracleScore(h),
  }));
}

function scoreColor(s) {
  if (s >= 75) return 'var(--score-green)';
  if (s >= 50) return 'var(--score-amber)';
  return 'var(--score-red)';
}

function loadManualHoldings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveManualHoldings(holdings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [phase, setPhase] = useState('landing'); // landing | connecting | connected | analyzing | done
  const [holdings, setHoldings] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [connectProgress, setConnectProgress] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualHoldings, setManualHoldings] = useState(loadManualHoldings);
  const [form, setForm] = useState({ symbol: '', name: '', sector: 'IT', quantity: '', avg_price: '', ltp: '' });

  // Persist manual holdings
  useEffect(() => { saveManualHoldings(manualHoldings); }, [manualHoldings]);

  // ── Broker Connect ──
  async function handleConnect(broker) {
    setSelectedBroker(broker);
    setPhase('connecting');
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 120));
      setConnectProgress(i);
    }
    const allRaw = [...MOCK_HOLDINGS, ...manualHoldings];
    const norm = normalizeHoldings(allRaw);
    setHoldings(norm);
    setPhase('connected');
  }

  // ── Manual Add Holding ──
  const addManualHolding = (e) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.avg_price || !form.ltp) return;
    const newH = {
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name.trim() || form.symbol.toUpperCase().trim(),
      sector: form.sector,
      quantity: parseFloat(form.quantity),
      avg_price: parseFloat(form.avg_price),
      ltp: parseFloat(form.ltp),
    };
    setManualHoldings(prev => [...prev, newH]);

    // If already connected, add to live holdings too
    if (phase === 'connected' || phase === 'done') {
      const normalized = normalizeHoldings([newH]);
      setHoldings(prev => [...prev, ...normalized]);
      if (phase === 'done') {
        setAnalysis(null);
        setPhase('connected');
      }
    }
    setForm({ symbol: '', name: '', sector: 'IT', quantity: '', avg_price: '', ltp: '' });
    setShowManualForm(false);
  };

  const removeManualHolding = (symbol) => {
    setManualHoldings(prev => prev.filter(h => h.symbol !== symbol));
    if (phase === 'connected' || phase === 'done') {
      setHoldings(prev => prev.filter(h => h.symbol !== symbol));
    }
  };

  // ── AI Analysis ──
  async function handleAnalyze() {
    setPhase('analyzing');
    try {
      const res = await axios.post(`${API_URL}/analyze-portfolio`, { holdings });
      setAnalysis(res.data);
      setPhase('done');
    } catch (e) {
      // Client-side fallback
      setAnalysis({
        overall_score: 68,
        risk_level: 'Moderate',
        portfolio_summary: 'Portfolio shows balanced exposure across IT and Finance sectors with moderate risk. IT overweight needs attention amid global headwinds.',
        bull_case: 'Strong domestic consumption and IT deal pipeline could drive 15–20% upside in 12 months.',
        bear_case: 'Global slowdown and margin compression may trigger correction across holdings.',
        insights: [
          'IT sector accounts for significant portfolio weight — concentration risk elevated',
          'Underwater positions are dragging overall returns',
          'Top performers are generating alpha — consider increasing allocation',
        ],
        recommendations: [
          'Trim overweight sector exposure for better diversification',
          'Consider partial exit in worst performers to cut losses',
          'Add high-ROE stocks from underrepresented sectors',
        ],
        sector_verdict: { IT: 'Trim', Energy: 'Buy', Finance: 'Hold' },
      });
      setPhase('done');
    }
  }

  // ── Computed Stats ──
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalPnL = holdings.reduce((s, h) => s + h.pnl, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.avg_price * h.quantity, 0);
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const avgOracleScore = holdings.length ? Math.round(holdings.reduce((s, h) => s + h.oracle_score, 0) / holdings.length) : 0;

  const sectorMap = {};
  holdings.forEach(h => {
    sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.value;
  });

  const fmt = (v) => {
    if (!v && v !== 0) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
    return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LANDING PHASE
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === 'landing') {
    return (
      <div className="portfolio-page">
        <div className="pf-landing">
          {/* Glow background */}
          <div className="pf-landing-glow" />

          <div className="pf-landing-badge">
            <Shield size={12} />
            PORTFOLIO INTELLIGENCE SUITE
          </div>

          <h1 className="pf-landing-title">
            Connect Your Broker.<br />
            <span className="pf-landing-title-accent">Let AI Think.</span>
          </h1>

          <p className="pf-landing-subtitle">
            Nexus AI analyzes your entire portfolio in seconds — scoring each position,
            identifying risk concentrations, and delivering institutional-grade insights.
          </p>

          {/* Broker Grid */}
          <div className="pf-broker-grid">
            {BROKERS.map(b => (
              <button key={b.id} className="pf-broker-card" onClick={() => handleConnect(b)}>
                <div className="pf-broker-icon" style={{ color: b.color, background: `${b.color}15` }}>
                  <b.icon size={20} />
                </div>
                <span className="pf-broker-name">{b.name}</span>
              </button>
            ))}
          </div>

          {/* Manual Entry Toggle */}
          <div className="pf-landing-divider">
            <span className="pf-landing-divider-line" />
            <span className="pf-landing-divider-text">OR ADD MANUALLY</span>
            <span className="pf-landing-divider-line" />
          </div>

          <button className="pf-manual-entry-btn" onClick={() => setShowManualForm(true)}>
            <Plus size={14} />
            Add Holdings Manually
          </button>

          {/* Existing manual holdings preview */}
          {manualHoldings.length > 0 && (
            <div className="pf-manual-preview">
              <div className="pf-manual-preview-label">
                {manualHoldings.length} manual holding{manualHoldings.length !== 1 ? 's' : ''} saved
              </div>
              <div className="pf-manual-chips">
                {manualHoldings.map(h => (
                  <span key={h.symbol} className="pf-manual-chip">
                    {h.symbol}
                    <X size={10} className="pf-chip-remove" onClick={() => removeManualHolding(h.symbol)} />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Manual Form Modal */}
          {showManualForm && (
            <div className="pf-manual-modal-backdrop" onClick={() => setShowManualForm(false)}>
              <form className="pf-manual-modal" onClick={e => e.stopPropagation()} onSubmit={addManualHolding}>
                <div className="pf-modal-header">
                  <span>Add Holding</span>
                  <button type="button" className="pf-modal-close" onClick={() => setShowManualForm(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="pf-modal-grid">
                  <div className="pf-modal-field">
                    <label>Symbol</label>
                    <input placeholder="e.g. RELIANCE" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} required />
                  </div>
                  <div className="pf-modal-field">
                    <label>Company Name</label>
                    <input placeholder="e.g. Reliance Industries" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="pf-modal-field">
                    <label>Sector</label>
                    <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                      {Object.keys(SECTOR_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="pf-modal-field">
                    <label>Quantity</label>
                    <input type="number" step="any" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                  </div>
                  <div className="pf-modal-field">
                    <label>Avg. Buy Price (₹)</label>
                    <input type="number" step="any" placeholder="0.00" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))} required />
                  </div>
                  <div className="pf-modal-field">
                    <label>Current Price (₹)</label>
                    <input type="number" step="any" placeholder="0.00" value={form.ltp} onChange={e => setForm(f => ({ ...f, ltp: e.target.value }))} required />
                  </div>
                </div>
                <div className="pf-modal-actions">
                  <button type="submit" className="pf-modal-submit">Add to Portfolio</button>
                  <button type="button" className="pf-modal-cancel" onClick={() => setShowManualForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Feature badges */}
          <div className="pf-landing-features">
            {['ORACLE SCORE™', 'REAL-TIME P&L', 'AI INSIGHTS', 'RISK ANALYSIS'].map(f => (
              <span key={f} className="pf-feature-badge">
                <span className="pf-feature-diamond">◆</span> {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTING PHASE
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === 'connecting') {
    return (
      <div className="portfolio-page">
        <div className="pf-connecting">
          <div className="pf-connecting-label">ESTABLISHING SECURE SESSION</div>
          <div className="pf-connecting-broker">
            {selectedBroker && <selectedBroker.icon size={24} style={{ color: selectedBroker.color }} />}
            <span>{selectedBroker?.name}</span>
          </div>

          <div className="pf-progress-wrap">
            <div className="pf-progress-track">
              <div className="pf-progress-fill" style={{ width: `${connectProgress}%` }} />
            </div>
            <div className="pf-progress-info">
              <span>
                {connectProgress < 40 ? 'Authenticating OAuth...' : connectProgress < 80 ? 'Fetching holdings...' : 'Normalizing data...'}
              </span>
              <span>{connectProgress}%</span>
            </div>
          </div>

          <div className="pf-connecting-token">
            256-BIT ENCRYPTED · SESSION TOKEN: nx_{Math.random().toString(36).slice(2, 10).toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONNECTED / ANALYZING / DONE PHASES
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="portfolio-page pf-dashboard">
      {/* ── STATS ROW ── */}
      <div className="pf-stats-grid">
        <div className="pf-stat-card">
          <div className="pf-stat-label">PORTFOLIO VALUE</div>
          <div className="pf-stat-value" style={{ color: 'var(--text-primary)' }}>{fmt(totalValue)}</div>
          <div className="pf-stat-sub">{holdings.length} holdings</div>
        </div>
        <div className="pf-stat-card">
          <div className="pf-stat-label">TOTAL P&L</div>
          <div className="pf-stat-value" style={{ color: totalPnL >= 0 ? 'var(--score-green)' : 'var(--score-red)' }}>
            {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
          </div>
          <div className="pf-stat-sub" style={{ color: totalPnL >= 0 ? 'var(--score-green)' : 'var(--score-red)' }}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
          </div>
        </div>
        <div className="pf-stat-card">
          <div className="pf-stat-label">INVESTED</div>
          <div className="pf-stat-value" style={{ color: 'var(--text-secondary)' }}>{fmt(totalInvested)}</div>
          <div className="pf-stat-sub">total cost basis</div>
        </div>
        <div className="pf-stat-card">
          <div className="pf-stat-label">AVG ORACLE SCORE</div>
          <div className="pf-stat-value" style={{ color: scoreColor(avgOracleScore) }}>{avgOracleScore}</div>
          <div className="pf-stat-sub">portfolio health</div>
        </div>
      </div>

      <div className="pf-main-grid">
        {/* ── LEFT: HOLDINGS TABLE ── */}
        <div className="pf-left-col">
          <div className="pf-table-header">
            <span className="pf-table-title">HOLDINGS · LIVE POSITIONS</span>
            <div className="pf-table-header-right">
              <span className="pf-table-source">via {selectedBroker?.name} Gateway</span>
              <button className="pf-add-inline-btn" onClick={() => setShowManualForm(true)}>
                <Plus size={12} /> ADD
              </button>
            </div>
          </div>

          <div className="pf-table-wrap">
            <table className="pf-holdings-table">
              <thead>
                <tr>
                  {['SYMBOL', 'SECTOR', 'QTY', 'AVG PRICE', 'CMP', 'VALUE', 'P&L', 'ORACLE'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => (
                  <tr key={h.symbol + i}>
                    <td>
                      <div className="pf-symbol-cell">
                        <div className="pf-symbol-name">{h.symbol}</div>
                        <div className="pf-symbol-full">{h.name}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="pf-sector-badge"
                        style={{
                          color: SECTOR_COLORS[h.sector] || '#888',
                          background: `${SECTOR_COLORS[h.sector] || '#888'}15`,
                          borderColor: `${SECTOR_COLORS[h.sector] || '#888'}40`,
                        }}
                      >
                        {h.sector}
                      </span>
                    </td>
                    <td className="pf-mono">{h.quantity}</td>
                    <td className="pf-mono pf-dim">₹{h.avg_price.toLocaleString()}</td>
                    <td className="pf-mono" style={{ fontWeight: 600, color: h.current_price >= h.avg_price ? 'var(--score-green)' : 'var(--score-red)' }}>
                      ₹{h.current_price.toLocaleString()}
                    </td>
                    <td className="pf-mono">₹{h.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>
                      <div className="pf-pnl-cell" style={{ color: h.pnl >= 0 ? 'var(--score-green)' : 'var(--score-red)' }}>
                        <span className="pf-pnl-amount">{h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span className="pf-pnl-pct">{h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="pf-oracle-ring" style={{ borderColor: scoreColor(h.oracle_score), color: scoreColor(h.oracle_score), boxShadow: `0 0 8px ${scoreColor(h.oracle_score)}44` }}>
                        {h.oracle_score}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector Allocation */}
          <div className="pf-sector-section">
            <div className="pf-sector-title">SECTOR ALLOCATION</div>
            <div className="pf-sector-bars">
              {Object.entries(sectorMap).map(([sector, val]) => {
                const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                const verdict = phase === 'done' && analysis?.sector_verdict?.[sector];
                return (
                  <div key={sector} className="pf-sector-row">
                    <div className="pf-sector-name" style={{ color: SECTOR_COLORS[sector] || '#888' }}>{sector}</div>
                    <div className="pf-sector-track">
                      <div className="pf-sector-fill" style={{ width: `${pct}%`, background: SECTOR_COLORS[sector] || '#888' }} />
                    </div>
                    <div className="pf-sector-pct">{pct.toFixed(1)}%</div>
                    {verdict && (
                      <div
                        className="pf-sector-verdict"
                        style={{
                          color: verdict === 'Buy' ? 'var(--score-green)' : verdict === 'Trim' ? 'var(--score-red)' : 'var(--score-amber)',
                        }}
                      >
                        {verdict.toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: AI PANEL ── */}
        <div className="pf-right-col">
          {phase === 'connected' && (
            <div className="pf-ai-ready">
              <BrainCircuit size={36} className="pf-ai-icon" />
              <div className="pf-ai-ready-title">Nexus AI Ready</div>
              <div className="pf-ai-ready-desc">
                Portfolio loaded. Run AI analysis to get Oracle Scores, risk assessment, and institutional-grade insights.
              </div>
              <button className="pf-analyze-btn" onClick={handleAnalyze}>
                <Zap size={14} /> ANALYZE PORTFOLIO
              </button>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="pf-ai-analyzing">
              <div className="pf-pulse-bars">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="pf-pulse-bar" style={{ animationDelay: `${i * 0.15}s`, opacity: 0.3 + i * 0.12 }} />
                ))}
              </div>
              <div className="pf-analyzing-text">NEXUS AI PROCESSING...</div>
              <div className="pf-analyzing-sub">Scoring {holdings.length} positions via Oracle Engine</div>
            </div>
          )}

          {phase === 'done' && analysis && (
            <div className="pf-ai-results">
              {/* Score Card */}
              <div className="pf-score-card">
                <div className="pf-score-card-label">NEXUS PORTFOLIO SCORE</div>
                <div className="pf-score-card-body">
                  <div className="pf-big-score-ring" style={{ borderColor: scoreColor(analysis.overall_score), boxShadow: `0 0 20px ${scoreColor(analysis.overall_score)}44` }}>
                    <span style={{ color: scoreColor(analysis.overall_score) }}>{analysis.overall_score}</span>
                  </div>
                  <div className="pf-score-meta">
                    <div className="pf-risk-level">{analysis.risk_level} Risk</div>
                    <div className="pf-score-summary">{analysis.portfolio_summary}</div>
                  </div>
                </div>
              </div>

              {/* Bull/Bear Cases */}
              <div className="pf-case-grid">
                <div className="pf-case-card pf-case-bull">
                  <div className="pf-case-label">▲ BULL CASE</div>
                  <div className="pf-case-text">{analysis.bull_case}</div>
                </div>
                <div className="pf-case-card pf-case-bear">
                  <div className="pf-case-label">▼ BEAR CASE</div>
                  <div className="pf-case-text">{analysis.bear_case}</div>
                </div>
              </div>

              {/* Key Insights */}
              <div className="pf-insights-card">
                <div className="pf-insights-label">KEY INSIGHTS</div>
                {analysis.insights?.map((ins, i) => (
                  <div key={i} className="pf-insight-row">
                    <span className="pf-insight-diamond">◆</span>
                    <span>{ins}</span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="pf-recs-card">
                <div className="pf-recs-label">RECOMMENDATIONS</div>
                {analysis.recommendations?.map((rec, i) => (
                  <div key={i} className="pf-rec-row">
                    <span className="pf-rec-arrow">→</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>

              {/* Re-analyze */}
              <button className="pf-reanalyze-btn" onClick={() => { setAnalysis(null); setPhase('connected'); }}>
                <RefreshCw size={12} /> RE-ANALYZE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual form modal (also available in dashboard) */}
      {showManualForm && (
        <div className="pf-manual-modal-backdrop" onClick={() => setShowManualForm(false)}>
          <form className="pf-manual-modal" onClick={e => e.stopPropagation()} onSubmit={addManualHolding}>
            <div className="pf-modal-header">
              <span>Add Holding</span>
              <button type="button" className="pf-modal-close" onClick={() => setShowManualForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="pf-modal-grid">
              <div className="pf-modal-field">
                <label>Symbol</label>
                <input placeholder="e.g. RELIANCE" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} required />
              </div>
              <div className="pf-modal-field">
                <label>Company Name</label>
                <input placeholder="e.g. Reliance Industries" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="pf-modal-field">
                <label>Sector</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                  {Object.keys(SECTOR_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="pf-modal-field">
                <label>Quantity</label>
                <input type="number" step="any" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="pf-modal-field">
                <label>Avg. Buy Price (₹)</label>
                <input type="number" step="any" placeholder="0.00" value={form.avg_price} onChange={e => setForm(f => ({ ...f, avg_price: e.target.value }))} required />
              </div>
              <div className="pf-modal-field">
                <label>Current Price (₹)</label>
                <input type="number" step="any" placeholder="0.00" value={form.ltp} onChange={e => setForm(f => ({ ...f, ltp: e.target.value }))} required />
              </div>
            </div>
            <div className="pf-modal-actions">
              <button type="submit" className="pf-modal-submit">Add to Portfolio</button>
              <button type="button" className="pf-modal-cancel" onClick={() => setShowManualForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
