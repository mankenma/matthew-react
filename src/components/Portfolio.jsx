import React, { useState, useEffect } from 'react';
import Ballpit from './Ballpit'; 
import { Linkedin, MapPin, Mail, Briefcase, Code, Layers, Database, Globe, ArrowUpRight } from 'lucide-react';

/**
 * CONFIGURATION & THEME
 * "Swiss Clean" Aesthetic
 */
const THEME = { 
  primary: '#0f172a', // Slate 900 (High contrast)
  accent: '#3b82f6', // Bright Blue
  bg: '#f8fafc', // Slate 50
  cardBg: '#ffffff',
  text: '#334155', // Slate 700
  muted: '#64748b', // Slate 500
  border: '#e2e8f0', // Slate 200
  balls: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb'] 
};

const EXPERIENCE = [
  { 
    role: "Manager of Analytics & Optimization", 
    company: "Tangam Systems", 
    location: "Waterloo, ON / APAC",
    date: "Sep 2024 — Present", 
    desc: "Spearheading analytics strategy for casino operators across APAC. Driving data-led decision making while managing client success and expansion initiatives." 
  },
  { 
    role: "Senior Business Analyst", 
    company: "Tangam Systems", 
    location: "Waterloo, ON / Global",
    date: "Feb 2023 — Aug 2024", 
    desc: "Led client-facing analytics projects and software implementations across North America, UK, and APAC. Translated complex data into actionable business insights." 
  },
  { 
    role: "Business Analyst", 
    company: "Tangam Systems", 
    location: "Waterloo, ON",
    date: "Mar 2022 — Jan 2023", 
    desc: "Supported high-value optimization projects, delivering rigorous analysis and clear reporting frameworks for stakeholder teams." 
  },
  { 
    role: "SEM Campaign Manager", 
    company: "Adknown Inc.", 
    location: "Guelph, ON",
    date: "May 2020 — Feb 2022", 
    desc: "Managed large-scale Google & FB Ads portfolios, driving $2M+ in revenue. focused on A/B testing, monetization strategy, and performance scaling." 
  },
  { 
    role: "Data & Reporting Student Assistant", 
    company: "University of Guelph", 
    location: "Guelph, ON",
    date: "Sep 2019 — Apr 2020", 
    desc: "Engineered Tableau dashboards and executive reports for institutional planning. Delivered visualizations used by senior university leadership." 
  }
];

const SKILLS = [
  { 
    category: "Strategic", 
    items: ["Casino Optimization", "SaaS Implementation", "Global Expansion", "Client Success", "Executive Presentations"] 
  },
  { 
    category: "Technical", 
    items: ["SQL", "Python", "Business Intelligence", "Data Analytics", "Tableau"] 
  },
];

/**
 * HELPER: Card Component with "Soft Lift" hover
 */
const Card = ({ children, style = {}, className = "" }) => (
  <div 
    className={`modern-card ${className}`}
    style={{
      backgroundColor: THEME.cardBg,
      borderRadius: '20px',
      padding: '32px',
      border: `1px solid ${THEME.border}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      ...style
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)';
      e.currentTarget.style.borderColor = '#cbd5e1';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)';
      e.currentTarget.style.borderColor = THEME.border;
    }}
  >
    {children}
  </div>
);

const Pill = ({ text }) => (
  <span style={{ 
    fontSize: '0.75rem', 
    fontWeight: 600, 
    padding: '6px 14px', 
    borderRadius: '100px', 
    backgroundColor: '#f1f5f9', 
    color: '#475569',
    letterSpacing: '0.02em',
    border: '1px solid #e2e8f0'
  }}>
    {text}
  </span>
);

const NavLink = ({ children, href }) => (
  <a 
    href={href}
    style={{ 
      textDecoration: 'none', color: '#64748b', fontWeight: 600, fontSize: '0.9rem',
      padding: '8px 16px', transition: 'color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.color = THEME.primary}
    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
  >
    {children}
  </a>
);

// Blog Tooltip
const BlogButton = () => {
    const [hover, setHover] = useState(false);
    return (
        <div style={{ position: 'relative' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <NavLink href="#">Blog</NavLink>
            <div style={{
                position: 'absolute', top: '100%', left: '50%', 
                transform: `translateX(-50%) translateY(${hover ? '10px' : '0px'})`,
                background: '#1e293b', color: 'white', fontSize: '0.75rem', fontWeight: 600,
                padding: '6px 12px', borderRadius: '6px', whiteSpace: 'nowrap', pointerEvents: 'none',
                opacity: hover ? 1 : 0, transition: 'all 0.2s ease-out', zIndex: 50
            }}>
                Coming soon!
            </div>
        </div>
    );
};

/**
 * MAIN COMPONENT
 */
export default function Portfolio() {
  const [isMobile, setIsMobile] = useState(false);

  // Simple responsive check for the layout switch
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', // Very light slate
      color: THEME.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
      paddingBottom: '4rem'
    }}>
      
      {/* 1. HEADER / HERO */}
      <header style={{ 
        position: 'relative', 
        height: '400px', 
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white',
        marginBottom: '3rem'
      }}>
         <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <Ballpit colors={THEME.balls} />
            {/* Gradient Overlay for text readability */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #ffffff 10%, rgba(255,255,255,0) 100%)' }} />
         </div>

         <div style={{ 
           maxWidth: '1200px', margin: '0 auto', height: '100%', 
           display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
           position: 'relative', zIndex: 10, padding: '2rem'
         }}>
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.05em', color: '#0f172a' }}>MA.</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <BlogButton />
                </div>
            </nav>

            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ 
                    fontSize: 'clamp(3rem, 5vw, 4.5rem)', 
                    fontWeight: 800, 
                    color: '#0f172a', 
                    letterSpacing: '-0.03em', 
                    lineHeight: 1.1, 
                    marginBottom: '1rem'
                }}>
                    Matthew<br/>Ankenmann
                </h1>
                <p style={{ fontSize: '1.25rem', color: '#64748b', fontWeight: 500, maxWidth: '500px' }}>
                    Data-Driven Strategy for Global Analytics.<br/>
                    <span style={{ color: THEME.accent }}>Optimization & Strategy @ Tangam Systems</span>
                </p>
            </div>
         </div>
      </header>


      {/* 2. MAIN CONTENT SPLIT */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 2rem',
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row', // On mobile, content first, profile second
        gap: '40px',
        alignItems: 'flex-start' // Key to prevent stretching
      }}>

        {/* --- LEFT COLUMN: EXPERIENCE (Takes up more space) --- */}
        <div style={{ flex: 2, width: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
                    <Briefcase size={20} color={THEME.accent} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Experience</h3>
            </div>

            <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {EXPERIENCE.map((job, i) => (
                    <div key={i} style={{ display: 'flex', gap: '20px' }}>
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ 
                                width: '12px', height: '12px', borderRadius: '50%', 
                                backgroundColor: i === 0 ? THEME.accent : '#cbd5e1',
                                outline: i === 0 ? '4px solid #eff6ff' : 'none'
                            }} />
                            {i !== EXPERIENCE.length - 1 && (
                                <div style={{ width: '2px', flex: 1, backgroundColor: '#e2e8f0', marginTop: '4px' }} />
                            )}
                        </div>
                        
                        {/* Content */}
                        <div style={{ paddingBottom: i !== EXPERIENCE.length - 1 ? '0' : '0' }}>
                            <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', marginBottom: '4px' }}>
                                {job.role}
                            </h4>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>
                                {job.company} <span style={{ color: '#cbd5e1' }}>|</span> {job.date}
                            </div>
                            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, maxWidth: '600px' }}>
                                {job.desc}
                            </p>
                        </div>
                    </div>
                ))}
                </div>
            </Card>

            <div style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                © 2025 Matthew Ankenmann. All Rights Reserved.
            </div>
        </div>


        {/* --- RIGHT COLUMN: PROFILE & SKILLS (Sticky Sidebar) --- */}
        <div style={{ 
            flex: 1, 
            width: '100%', 
            position: isMobile ? 'static' : 'sticky', 
            top: '40px' 
        }}>
            {/* Professional Summary (Restored "Fun" Design) */}
            <Card style={{ marginBottom: '24px' }}>
                
                {/* Waving Hand Icon */}
                <div style={{ 
                    width: '48px', height: '48px', 
                    borderRadius: '50%', 
                    background: '#eff6ff', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    marginBottom: '16px' 
                }}>
                    <span style={{ fontSize: '24px' }}>👋</span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
                    Professional Summary
                </h3>
                
                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '24px' }}>
                    Based in Waterloo/Guelph, Ontario. I specialize in analytics, optimization, and data-driven decision making. My focus is delivering credible, global impact through rigorous data strategy.
                </p>
                
                {/* Contact Mini-Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                     <a href="mailto:matthew@ankenmann.com" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
                        <Mail size={16} color="#64748b" /> matthew@ankenmann.com
                     </a>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
                        <MapPin size={16} color="#64748b" /> +1 647-210-2559
                     </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <a 
                      href="https://www.linkedin.com/in/mankenmann/"
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', 
                        background: 'white', color: '#0f172a', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '0.9rem', textDecoration: 'none'
                      }}>
                        <Linkedin size={18} color="#0077b5" /> LinkedIn
                    </a>
                    <a 
                      href="mailto:matthew@ankenmann.com"
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
                        background: '#0f172a', color: 'white', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '0.9rem', textDecoration: 'none'
                      }}>
                        <Mail size={18} /> Email
                    </a>
                </div>
            </Card>

            {/* Skills Card */}
            <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Layers size={18} color={THEME.accent} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Expertise</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {SKILLS.map((group, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {group.category}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {group.items.map((skill, j) => (
                                    <Pill key={j} text={skill} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

      </div>
    </div>
  );
}