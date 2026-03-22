import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      {/* ── Left: animated bar scene ── */}
      <div className="auth-scene">
        {/* Floating bubbles */}
        <div className="auth-bubbles">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bubble" />
          ))}
        </div>

        {/* Cocktail glass */}
        <svg
          className="auth-cocktail"
          width="160"
          height="210"
          viewBox="0 0 160 210"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="gc">
              <polygon points="8,18 152,18 80,148" />
            </clipPath>
            <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f9b248" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#e8620a" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          {/* Liquid fill */}
          <rect x="0" y="58" width="160" height="100" fill="url(#liq)" clipPath="url(#gc)" />
          {/* Glass outline */}
          <polygon points="8,18 152,18 80,148" stroke="#f9b248" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.9" />
          <line x1="8"  y1="18"  x2="152" y2="18"  stroke="#f9b248" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          <line x1="80" y1="148" x2="80"  y2="190" stroke="#f9b248" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
          <line x1="44" y1="190" x2="116" y2="190" stroke="#f9b248" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
          {/* Cherry garnish */}
          <line x1="120" y1="18" x2="126" y2="4" stroke="#f9b248" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="126" cy="4" r="5" fill="#ef5d60" opacity="0.9" />
          {/* Animated bubbles inside */}
          <circle cx="68" cy="110" r="3" fill="rgba(249,178,72,0.5)">
            <animate attributeName="cy" values="120;75;120" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="85" cy="120" r="2" fill="rgba(249,178,72,0.4)">
            <animate attributeName="cy" values="130;85;130" dur="3.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3.1s" repeatCount="indefinite" />
          </circle>
          <circle cx="74" cy="100" r="2" fill="rgba(249,178,72,0.35)">
            <animate attributeName="cy" values="115;78;115" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Brand text */}
        <div className="auth-brand">
          <div className="auth-brand-title">BAR OPS</div>
          <div className="auth-brand-sub">Stock Management &amp; Billing</div>
        </div>

        {/* Quick stats */}
        <div className="auth-stats">
          <div className="auth-stat">
            <div className="auth-stat-val">12+</div>
            <div className="auth-stat-label">Products</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-val">3</div>
            <div className="auth-stat-label">Roles</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-val">Live</div>
            <div className="auth-stat-label">Billing</div>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="auth-form-panel">
        {children}
      </div>
    </div>
  );
}