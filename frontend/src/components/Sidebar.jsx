import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrainCircuit, Home, MessageSquare, Briefcase, Sun, Moon, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/chat', icon: MessageSquare, label: 'Chatbot' },
  { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <aside
      className={`sidebar ${expanded ? 'expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <BrainCircuit size={22} className="sidebar-logo-icon" />
        {expanded && <span className="sidebar-logo-text">Nexus</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="sidebar-link-icon" />
            {expanded && <span className="sidebar-link-label">{label}</span>}
            {!expanded && location.pathname === path && <div className="sidebar-active-dot" />}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="sidebar-footer">
        <button className="sidebar-theme-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {expanded && <span className="sidebar-link-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </aside>
  );
}
