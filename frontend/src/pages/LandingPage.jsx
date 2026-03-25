import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Activity, Briefcase, BarChart3, Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';

const features = [
  { icon: BrainCircuit, title: 'AI Analysis Engine', desc: 'Gemini-powered deep-dive reports with bull/bear cases and 12-month forecasts.' },
  { icon: Activity,     title: 'Oracle Scoring',     desc: 'Proprietary 6-factor weighted scoring across valuation, growth, and momentum.' },
  { icon: Briefcase,    title: 'Portfolio Tracker',   desc: 'Track holdings, gains, and get instant Oracle Scores on your entire portfolio.' },
  { icon: BarChart3,    title: 'Live Charts',         desc: '2-year price action, quarterly revenue, and earnings trend visualizations.' },
  { icon: Shield,       title: 'Risk Signals',        desc: 'Insider ownership, short interest, and sentiment divergence alerts.' },
  { icon: TrendingUp,   title: 'Action Matrix',       desc: 'Clear BUY / WATCH / AVOID zones with investor profile matching.' },
];

const stats = [
  { value: '5,000+', label: 'Stocks Covered' },
  { value: '6',      label: 'Score Factors' },
  { value: '100%',   label: 'Real-Time Data' },
  { value: '2+',     label: 'Years History' },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge">
            <Zap size={12} /> Powered by Gemini AI & Real Market Data
          </div>
          <h1 className="hero-title">
            The Intelligence Layer
            <br />
            <span className="hero-title-accent">for Smart Investing</span>
          </h1>
          <p className="hero-subtitle">
            Nexus combines real-time financial data, proprietary quantitative scoring, and 
            AI-driven analysis to surface actionable investment intelligence — in seconds.
          </p>
          <div className="hero-cta-group">
            <Link to="/chat" className="hero-cta primary">
              <BrainCircuit size={16} />
              Launch Analysis
              <ArrowRight size={14} />
            </Link>
            <Link to="/portfolio" className="hero-cta secondary">
              <Briefcase size={16} />
              Open Portfolio
            </Link>
          </div>
        </div>

        {/* Decorative score preview */}
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-label">Oracle Score</span>
              <span className="preview-grade">A+</span>
            </div>
            <div className="preview-score-ring">
              <svg viewBox="0 0 120 120" className="score-ring-svg">
                <circle cx="60" cy="60" r="52" className="ring-bg" />
                <circle cx="60" cy="60" r="52" className="ring-fill" strokeDasharray="327" strokeDashoffset="49" />
              </svg>
              <span className="ring-value">85</span>
            </div>
            <div className="preview-factors">
              {[
                { name: 'Valuation', score: 72 },
                { name: 'Growth', score: 88 },
                { name: 'Profit', score: 91 },
                { name: 'Health', score: 80 },
              ].map((f) => (
                <div key={f.name} className="preview-factor-row">
                  <span>{f.name}</span>
                  <div className="preview-bar-track">
                    <div className="preview-bar-fill" style={{ width: `${f.score}%` }} />
                  </div>
                  <span className="preview-factor-val">{f.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS RIBBON ── */}
      <section className="landing-stats">
        {stats.map((s) => (
          <div key={s.label} className="stat-item">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="landing-features">
        <h2 className="section-headline">Everything You Need to Decide</h2>
        <p className="section-tagline">From raw data to actionable intelligence — one seamless platform.</p>
        <div className="features-grid">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon-wrap">
                <Icon size={22} />
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="landing-bottom-cta">
        <h2>Ready to see the signal through the noise?</h2>
        <Link to="/chat" className="hero-cta primary" style={{ display: 'inline-flex' }}>
          <BrainCircuit size={16} />
          Start Analyzing
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
