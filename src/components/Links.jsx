import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * DESIGN SYSTEM: Slate & Sky (Playful Pro)
 * Clean & Direct - Fast loading, focused on exit links
 */
const THEME = { 
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  text: '#0F172A', // Slate 900 (Darker for better contrast)
  muted: '#64748B', // Slate 500
  primary: '#E17055', // Terra Cotta
  link: '#0EA5E9', // Sky 500
  accentBg: '#FFF7ED', // Orange 50 (for the emoji background)
  shadowRest: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
};

/**
 * Grain texture background (subtle)
 */
const GrainTexture = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.02,
    mixBlendMode: 'multiply',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }} />
);

/**
 * Link Button Component - Clean card design with emoji icon
 */
const LinkButton = ({ href, title, desc, emoji }) => (
  <a 
    href={href} 
    style={{ 
      textDecoration: 'none', 
      color: 'inherit', 
      display: 'block' 
    }}
  >
    <div style={{
      display: 'flex', 
      alignItems: 'center',
      gap: '20px',
      backgroundColor: THEME.surface, 
      borderRadius: '20px',
      padding: '20px',
      border: `1px solid ${THEME.background}`,
      boxShadow: THEME.shadowRest,
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
      e.currentTarget.style.boxShadow = THEME.shadowHover;
      e.currentTarget.style.borderColor = `${THEME.primary}40`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = THEME.shadowRest;
      e.currentTarget.style.borderColor = THEME.background;
    }}
    >
      {/* Emoji Container - Dedicated square icon */}
      <div style={{ 
        width: '72px', 
        height: '72px', 
        borderRadius: '16px', 
        flexShrink: 0,
        backgroundColor: THEME.accentBg,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '2.5rem',
        border: `1px solid ${THEME.primary}20`
      }}>
        {emoji}
      </div>

      {/* Text Content */}
      <div style={{ flexGrow: 1 }}>
        <div style={{ 
          fontWeight: 700, 
          fontSize: '1.15rem', 
          color: THEME.text, 
          marginBottom: '4px',
          fontFamily: 'Inter, sans-serif'
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: '0.95rem', 
          color: THEME.muted, 
          lineHeight: 1.4,
          fontFamily: 'Inter, sans-serif'
        }}>
          {desc}
        </div>
      </div>

      {/* Arrow Icon */}
      <div style={{ color: THEME.muted, flexShrink: 0 }}>
        <ArrowRight size={24} />
      </div>
    </div>
  </a>
);

/**
 * MAIN COMPONENT
 */
export default function Links() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: THEME.background, 
      color: THEME.text,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      padding: '2rem', 
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      <GrainTexture />
      
      <div style={{ 
        maxWidth: '480px', 
        margin: '0 auto', 
        position: 'relative', 
        zIndex: 10 
      }}>
        {/* CLEAN NAV - Styled to match theme */}
        <div style={{ marginBottom: '3rem' }}>
          <a 
            href="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              textDecoration: 'none', 
              color: THEME.muted, 
              fontWeight: 600, 
              fontSize: '0.95rem',
              padding: '8px 12px', 
              borderRadius: '8px', 
              marginLeft: '-12px',
              transition: 'all 0.2s',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = THEME.surface;
              e.currentTarget.style.color = THEME.text;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = THEME.muted;
            }}
          >
            <ArrowLeft size={18} /> Back to Portfolio
          </a>
        </div>

        {/* SIMPLE HEADER - No photo, just text */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 900, 
            marginBottom: '12px', 
            letterSpacing: '-0.03em', 
            color: THEME.text,
            fontFamily: 'Inter, sans-serif'
          }}>
            Matthew Ankenmann
          </h1>
        </div>

        {/* LINKS SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <LinkButton 
            href="/high-roller-tycoon"
            emoji="🎰"
            title="Play High Roller Tycoon"
            desc="An interactive casino idle-clicker game built with React and Three.js."
          />
          <LinkButton 
            href="/synthjam"
            emoji="🎹"
            title="SynthJam - Multiplayer Piano"
            desc="Real-time collaborative music experience with democratic instrument voting and live chat."
          />
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '64px', 
          color: THEME.muted, 
          fontSize: '0.85rem', 
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif'
        }}>
          © 2025 Matthew Ankenmann
        </div>
      </div>
    </div>
  );
}
