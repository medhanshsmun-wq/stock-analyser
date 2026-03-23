import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Activity, BrainCircuit, History, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_URL = 'http://localhost:8000';

const S = {
  green: '#3ddc84',
  amber: '#f59e0b',
  red:   '#f05252',
};

const scoreColor = (s) => s >= 75 ? S.green : s >= 55 ? S.amber : S.red;

function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([{ role: 'ai', content: 'Nexus standing by. Enter a company name or ticker to initiate deep-scan.' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Chat History States
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isEditingName, setIsEditingName] = useState(null); // ID of chat being renamed

  // Initial load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nexus_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatHistory(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Failed to parse chat history", e);
        setChatHistory([]);
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const fmt = (num) => {
    if (num === null || num === undefined || num === 'N/A') return '—';
    if (typeof num === 'string') return num;
    const abs = Math.abs(num);
    if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (abs >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const pct = (v) => v != null && v !== 'N/A' ? `${(v * 100).toFixed(1)}%` : '—';

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([{ role: 'ai', content: 'Nexus standing by. Enter a company name or ticker to initiate deep-scan.' }]);
    setData(null);
    setHistoryOpen(false);
  };

  const loadChat = (chat) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setData(chat.data);
    setHistoryOpen(false);
  };

  const deleteChat = (e, chatId) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  const renameChat = (e, chatId, newName) => {
    e.stopPropagation();
    setChatHistory(prev => prev.map(c => c.id === chatId ? { ...c, name: newName } : c));
    setIsEditingName(null);
  };

  const runQuery = async (q) => {
    if (!q.trim() || isLoading) return;
    const userMsg = { role: 'user', content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setQuery('');
    setIsLoading(true);
    setHistoryOpen(false);
    try {
      // Send current messages as history (excluding the very first welcome message)
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content, ticker: m.ticker }));
      
      const res = await axios.post(`${API_URL}/analyze`, { 
        query: userMsg.content,
        history: history
      });
      
      const { ticker, financials, chart_data, quarterly_revenue, quarterly_earnings, scores, analysis, ml_overview } = res.data;
      const newData = { financials, chart_data, quarterly_revenue, quarterly_earnings, scores, ml_overview };
      
      setData(newData);
      const aiMsg = { role: 'ai', content: analysis, ticker: ticker };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      
      // Update or create chat in history
      setChatHistory(prev => {
        let updatedHistory = [...prev];
        const chatId = currentChatId || Date.now().toString();
        
        const existingIndex = updatedHistory.findIndex(c => c.id === chatId);
        const chatName = existingIndex >= 0 ? updatedHistory[existingIndex].name : (financials?.name || q);
        
        const chatObj = {
          id: chatId,
          name: chatName,
          timestamp: Date.now(),
          messages: finalMessages,
          data: newData,
          tickers: existingIndex >= 0 
            ? Array.from(new Set([...updatedHistory[existingIndex].tickers, ticker].filter(Boolean)))
            : [ticker].filter(Boolean)
        };

        if (existingIndex >= 0) {
          updatedHistory[existingIndex] = chatObj;
        } else {
          updatedHistory.unshift(chatObj);
          setCurrentChatId(chatId);
        }
        return updatedHistory;
      });

    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: `**System Error:** ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    runQuery(query);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    let html = text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code style="background:#181c26;padding:2px 6px;border-radius:3px;font-family:\'IBM Plex Mono\',monospace;color:#c9a84c;">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote style="border-left:2px solid #2a3044;padding-left:12px;margin:12px 0;color:#8892a4;font-style:italic;">$1</blockquote>')
      .replace(/^\| (.*) \|$/gim, (match, row) => {
        if (row.includes('---')) return '';
        const cells = row.split(' | ').map(c => `<td>${c}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      .replace(/(<tr>.*?<\/tr>)+/gims, m => `<table>${m}</table>`)
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*?<\/li>)+/gims, m => `<ul>${m}</ul>`)
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br/>');
    return <div className="markdown-body action-desc" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const scoreItems = data?.scores ? [
    { label: 'Valuation',     score: data.scores.valuation },
    { label: 'Growth',        score: data.scores.growth },
    { label: 'Profitability', score: data.scores.profitability },
    { label: 'Health',        score: data.scores.financial_health },
    { label: 'Momentum',      score: data.scores.momentum },
    { label: 'Hidden Gem',    score: data.scores.hidden_gem },
  ] : [];

  return (
    <div className="app-shell">
      {/* ── 1. GLOBAL TOPBAR ── */}
      <div className="topbar">
        <div className="topbar-logo">
          <BrainCircuit size={18} color="#c9a84c" />
          Nexus Financial
        </div>
        <div className="topbar-right">
          <div className="history-container">
            <button 
              className="history-btn" 
              onClick={() => setHistoryOpen(!historyOpen)}
              style={historyOpen ? { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } : {}}
            >
              <History size={13} />
              Recent Intel
            </button>
            {historyOpen && (
              <div className="history-menu">
                <div className="history-hub-header">
                  <span className="panel-label" style={{ fontSize: '9px', color: 'var(--accent-gold)' }}>History Hub</span>
                  <button className="new-chat-btn" onClick={startNewChat}>
                    <Plus size={10} /> NEW CHAT
                  </button>
                </div>
                <div className="history-list">
                  {chatHistory.length === 0 ? (
                    <div className="history-empty">No target intelligence found.</div>
                  ) : (
                    chatHistory.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`history-item ${currentChatId === chat.id ? 'active' : ''}`}
                        onClick={() => loadChat(chat)}
                      >
                        <div className="history-item-left">
                          {isEditingName === chat.id ? (
                            <input 
                              autoFocus
                              className="history-rename-input"
                              defaultValue={chat.name}
                              onClick={e => e.stopPropagation()}
                              onBlur={e => renameChat(e, chat.id, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') renameChat(e, chat.id, e.target.value);
                                if (e.key === 'Escape') setIsEditingName(null);
                              }}
                            />
                          ) : (
                            <>
                              <span className="history-item-name">{chat.name}</span>
                              <span className="history-item-ticker">
                                {chat.tickers.join(', ')} • {new Date(chat.timestamp).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="history-item-actions">
                          <Edit2 
                            size={12} 
                            className="history-action-icon"
                            onClick={(e) => { e.stopPropagation(); setIsEditingName(chat.id); }}
                          />
                          <Trash2 
                            size={12} 
                            className="history-action-icon delete"
                            onClick={(e) => deleteChat(e, chat.id)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <span>System: Online</span>
          <span>Mode: {data?.ml_overview?.powered_by_gemini ? 'Gemini AI' : 'Quant Engine'}</span>
          {data?.scores && (
            <div className="topbar-score">
              <span style={{ color: '#8892a4' }}>SCORE</span>
              <span style={{ color: scoreColor(data.scores.oracle_score), fontWeight: 600, fontSize: '12px' }}>
                {data.scores.oracle_score}
              </span>
              <span style={{ background: '#1e2433', padding: '2px 6px', borderRadius: '2px', color: '#e8eaf0' }}>
                {data.scores.grade}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        {/* ── 2. LEFT CHAT PANEL ── */}
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span className="panel-label">Query Interface</span>
          </div>
          
          <div className="chat-body">
            <div className="intro-card">
              <h3>Intelligence Feed</h3>
              <p>Enter a ticker or company name to run a full fundamental sweep and generate an AI masterclass report.</p>
            </div>

            {messages.slice(1).map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {renderMarkdown(msg.content)}
              </div>
            ))}
            
            {isLoading && (
              <div className="message ai" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Activity size={14} color="#c9a84c" className="spinning" />
                <span className="panel-label" style={{ color: '#c9a84c', letterSpacing: '0.08em' }}>Processing Matrix...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="e.g. AAPL, LVMH, Reliance..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="send-btn" disabled={isLoading || !query.trim()}>
              <Send size={16} strokeWidth={2} />
            </button>
          </form>
        </div>

        {/* ── 3. COMPOUND DIVIDER ── */}
        <div className="panel-divider">
          <div className="divider-ornament">◆</div>
        </div>

        {/* ── 4. RIGHT DATA PANEL ── */}
        <div className="data-panel">
          {data ? (
            <>
              {/* Header */}
              <div className="analysis-header">
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <h1 className="company-name">{data.financials.name}</h1>
                  <span className="company-ticker">{data.financials.ticker}</span>
                </div>
                <div className="company-meta">
                  {data.financials.sector} / {data.financials.country}
                </div>
              </div>

              <div className="data-content">
                
                {/* Metrics Grid */}
                <div>
                  <div className="section-heading">
                    <span className="section-title">Core Fundamentals</span>
                    <div className="section-rule" />
                  </div>
                  <div className="metrics-grid">
                    {[
                      { label: 'Current Price', value: `$${data.financials.current_price}` },
                      { label: 'Market Cap',    value: fmt(data.financials.market_cap) },
                      { label: 'P/E Ratio',     value: data.financials.pe_ratio?.toFixed(1) ?? '—' },
                      { label: 'Total Revenue', value: fmt(data.financials.revenue) },
                      { label: 'Net Margin',    value: pct(data.financials.profit_margins) },
                      { label: '52W High',      value: `$${data.financials.fifty_two_week_high}` },
                      { label: '52W Low',       value: `$${data.financials.fifty_two_week_low}` },
                      { label: 'Free Cash Flow',value: fmt(data.financials.free_cashflow) },
                    ].map((m, i) => (
                      <div key={i} className="metric-card">
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Breakdown */}
                <div>
                  <div className="section-heading">
                    <span className="section-title">Nexus Score Breakdown — {data.scores.outlook}</span>
                    <div className="section-rule" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: scoreColor(data.scores.oracle_score) }}>
                      {data.scores.oracle_score}/100
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 60px' }}>
                    {scoreItems.map((s, i) => (
                      <div key={i} className="score-row">
                        <span className="score-label">{s.label}</span>
                        <div className="score-bar-track">
                          <div className="score-bar-fill" style={{ width: `${s.score}%`, backgroundColor: scoreColor(s.score) }} />
                        </div>
                        <span className="score-val" style={{ color: scoreColor(s.score) }}>{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Machine Learning Overview */}
                {data.ml_overview && (
                  <div>
                    <div className="section-heading">
                      <span className="section-title">Intelligence Signals</span>
                      <div className="section-rule" />
                    </div>
                    
                    <div className="action-block">
                      <div className="action-badge" style={{ backgroundColor: data.ml_overview.action_matrix.action_bg, color: data.ml_overview.action_matrix.action_color }}>
                        {data.ml_overview.action_matrix.action}
                      </div>
                      <div className="action-desc">
                        {data.ml_overview.action_matrix.action_desc} <br/>
                        <span style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px', display: 'block' }}>Best for: {data.ml_overview.action_matrix.profiles.join(' · ')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                      <div className="metric-card" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                        <div className="metric-label">Sentiment Divergence</div>
                        <div className="action-desc" style={{ color: data.ml_overview.sentiment.color, fontWeight: 500, marginBottom: '8px' }}>
                          {data.ml_overview.sentiment.signal}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          NEXUS: <span style={{ color: 'var(--text-primary)' }}>{data.ml_overview.sentiment.oracle_score}</span> &nbsp;∥&nbsp; STREET: <span style={{ color: 'var(--text-primary)' }}>{data.ml_overview.sentiment.analyst_score}</span>
                        </div>
                      </div>

                      <div className="metric-card" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                        <div className="metric-label">Valuation Flag</div>
                        {data.ml_overview.valuation_divergence.signals.slice(0, 2).map((s, i) => (
                          <div key={i} style={{ fontSize: '12px', color: i === 0 ? data.ml_overview.valuation_divergence.color : 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.4' }}>• {s}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                  {/* Price Chart */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '24px' }}>
                    <div className="metric-label">2-Year Price Action</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={data.chart_data}>
                        <defs>
                          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                        <XAxis dataKey="date" stroke="#2a3044" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'IBM Plex Mono' }} minTickGap={60} />
                        <YAxis domain={['auto','auto']} stroke="#2a3044" tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'IBM Plex Mono' }} tickFormatter={v => `$${v}`} width={45} />
                        <Tooltip contentStyle={{ background: '#0a0c10', border: '1px solid #2a3044', borderRadius: '2px', fontSize: '12px', fontFamily: 'IBM Plex Mono' }} itemStyle={{ color: '#c9a84c' }} labelStyle={{ color: '#8892a4' }} />
                        <Area type="monotone" dataKey="price" stroke="#c9a84c" strokeWidth={1.5} fillOpacity={1} fill="url(#gold)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue Chart */}
                  {data.quarterly_revenue?.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '24px' }}>
                       <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Quarterly Revenue
                        <span style={{ color: data.financials.revenue_growth > 0 ? S.green : S.red }}>
                          {data.financials.revenue_growth != null ? `${(data.financials.revenue_growth * 100).toFixed(1)}% YoY` : ''}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data.quarterly_revenue} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                          <XAxis dataKey="quarter" stroke="#2a3044" tick={{ fill: '#4a5568', fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
                          <Tooltip contentStyle={{ background: '#0a0c10', border: '1px solid #2a3044', borderRadius: '2px', fontSize: '11px', fontFamily: 'IBM Plex Mono' }} formatter={v => fmt(v)} />
                          <Bar dataKey="revenue" radius={[2,2,0,0]}>
                            {data.quarterly_revenue.map((_, i) => (
                              <Cell key={i} fill={i === data.quarterly_revenue.length - 1 ? '#c9a84c' : '#2a3044'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

              </div>
            </>
          ) : (
            <div className="empty-state">
              <Activity size={32} color="#2a3044" style={{ marginBottom: '16px' }} />
              Awaiting System Input
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
