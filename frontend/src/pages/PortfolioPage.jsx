import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, TrendingUp, TrendingDown, BrainCircuit, ExternalLink, PieChart } from 'lucide-react';

const STORAGE_KEY = 'nexus_portfolio';

function loadPortfolio() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function savePortfolio(holdings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState(loadPortfolio);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: '', shares: '', buyPrice: '', name: '' });

  useEffect(() => { savePortfolio(holdings); }, [holdings]);

  const addHolding = (e) => {
    e.preventDefault();
    if (!form.ticker || !form.shares || !form.buyPrice) return;
    const newHolding = {
      id: Date.now().toString(),
      ticker: form.ticker.toUpperCase().trim(),
      name: form.name.trim() || form.ticker.toUpperCase().trim(),
      shares: parseFloat(form.shares),
      buyPrice: parseFloat(form.buyPrice),
      addedAt: new Date().toISOString(),
    };
    setHoldings(prev => [...prev, newHolding]);
    setForm({ ticker: '', shares: '', buyPrice: '', name: '' });
    setShowForm(false);
  };

  const removeHolding = (id) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.buyPrice, 0);
  const holdingCount = holdings.length;

  // Simple sector assignment based on ticker (placeholder)
  const sectorColors = ['#c9a84c', '#3ddc84', '#6366f1', '#f59e0b', '#f05252', '#84cc16', '#06b6d4', '#ec4899'];

  return (
    <div className="portfolio-page">
      {/* Header */}
      <div className="portfolio-header">
        <div>
          <h1 className="portfolio-title">Portfolio Tracker</h1>
          <p className="portfolio-subtitle">Track your holdings, monitor performance, and get instant Oracle insights.</p>
        </div>
        <button className="portfolio-add-btn" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Add Holding
        </button>
      </div>

      {/* Add Holding Form */}
      {showForm && (
        <form className="portfolio-form" onSubmit={addHolding}>
          <div className="portfolio-form-grid">
            <div className="form-field">
              <label className="form-label">Ticker Symbol</label>
              <input
                className="form-input"
                placeholder="e.g. AAPL"
                value={form.ticker}
                onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Company Name (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Apple Inc."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Shares</label>
              <input
                className="form-input"
                type="number"
                step="any"
                placeholder="0"
                value={form.shares}
                onChange={e => setForm(f => ({ ...f, shares: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Avg. Buy Price</label>
              <input
                className="form-input"
                type="number"
                step="any"
                placeholder="0.00"
                value={form.buyPrice}
                onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="portfolio-form-actions">
            <button type="submit" className="form-submit-btn">Add to Portfolio</button>
            <button type="button" className="form-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div className="portfolio-summary-grid">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>
            <PieChart size={20} />
          </div>
          <div>
            <div className="summary-label">Total Invested</div>
            <div className="summary-value">${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(61,220,132,0.1)', color: '#3ddc84' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="summary-label">Holdings</div>
            <div className="summary-value">{holdingCount}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <BrainCircuit size={20} />
          </div>
          <div>
            <div className="summary-label">Oracle Coverage</div>
            <div className="summary-value">{holdingCount > 0 ? '100%' : '—'}</div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="portfolio-empty">
          <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <div className="portfolio-empty-text">No holdings yet</div>
          <p className="portfolio-empty-sub">Add your first holding to start tracking your portfolio performance.</p>
        </div>
      ) : (
        <div className="portfolio-table-wrap">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Shares</th>
                <th>Buy Price</th>
                <th>Cost Basis</th>
                <th>Weight</th>
                <th>Analyze</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, idx) => {
                const costBasis = h.shares * h.buyPrice;
                const weight = totalInvested > 0 ? (costBasis / totalInvested * 100) : 0;
                return (
                  <tr key={h.id}>
                    <td>
                      <div className="holding-asset">
                        <div className="holding-color-dot" style={{ background: sectorColors[idx % sectorColors.length] }} />
                        <div>
                          <div className="holding-ticker">{h.ticker}</div>
                          <div className="holding-name">{h.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono-cell">{h.shares}</td>
                    <td className="mono-cell">${h.buyPrice.toFixed(2)}</td>
                    <td className="mono-cell">${costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>
                      <div className="weight-cell">
                        <div className="weight-bar-track">
                          <div className="weight-bar-fill" style={{ width: `${weight}%`, background: sectorColors[idx % sectorColors.length] }} />
                        </div>
                        <span className="mono-cell">{weight.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/chat?ticker=${h.ticker}`} className="analyze-link">
                        <ExternalLink size={13} />
                        <span>Oracle</span>
                      </Link>
                    </td>
                    <td>
                      <button className="remove-holding-btn" onClick={() => removeHolding(h.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
