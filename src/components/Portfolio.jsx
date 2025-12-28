import React, { useState, useEffect } from 'react';
import Ballpit from './Ballpit'; 
import { Linkedin, MapPin, Mail, Briefcase, Layers } from 'lucide-react';

/**
 * DESIGN SYSTEM: Slate & Sky (Playful Pro)
 * Soft/playful at rest → Clean, sharp, professional on hover
 */
const THEME = { 
  // Design Tokens
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  primary: '#E17055', // Terra - for primary buttons
  link: '#38BDF8', // Sky blue - for links/focus
  success: '#F59E0B', // For badges
  // Shadows (cool blue)
  shadowRest: '0 4px 12px rgba(56, 189, 248, 0.08), 0 2px 4px rgba(56, 189, 248, 0.04)',
  shadowHover: '0 12px 24px rgba(56, 189, 248, 0.12), 0 4px 8px rgba(56, 189, 248, 0.08)',
  // Ballpit colors (keeping playful)
  balls: ['#38BDF8', '#60A5FA', '#93C5FD', '#BFDBFE', '#E17055'] 
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
 * Grain texture background
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
    opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }} />
);

/**
 * Card Component: Soft at rest → Crisp on hover
 */
const Card = ({ children, style = {}, className = "" }) => (
  <div 
    className={`modern-card ${className}`}
    style={{
      backgroundColor: THEME.surface,
      borderRadius: '24px',
      padding: '32px',
      boxShadow: THEME.shadowRest,
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      ...style
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = THEME.shadowHover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = THEME.shadowRest;
    }}
  >
    {children}
  </div>
);

/**
 * Pill Badge: Success color, JetBrains Mono
 */
const Pill = ({ text }) => (
  <span style={{ 
    fontSize: '0.75rem', 
    fontWeight: 600, 
    padding: '6px 14px', 
    borderRadius: '100px', 
    backgroundColor: `${THEME.success}15`, 
    color: THEME.success,
    letterSpacing: '0.05em',
    fontFamily: '"JetBrains Mono", monospace',
    border: `1px solid ${THEME.success}30`
  }}>
    {text}
  </span>
);

/**
 * Nav Link: Muted at rest → Link color on hover
 */
const NavLink = ({ children, href }) => (
  <a 
    href={href}
    style={{ 
      textDecoration: 'none', 
      color: THEME.muted, 
      fontWeight: 600, 
      fontSize: '0.9rem',
      padding: '8px 16px', 
      transition: 'color 0.2s',
      fontFamily: 'Inter, sans-serif'
    }}
    onMouseEnter={e => e.currentTarget.style.color = THEME.link}
    onMouseLeave={e => e.currentTarget.style.color = THEME.muted}
  >
    {children}
  </a>
);

/**
 * Blog Button - Easter Egg Link to High Roller Tycoon
 */
const BlogButton = () => {
    return (
        <NavLink href="/high-roller-tycoon">Blog</NavLink>
    );
};

/**
 * Primary Button: Terra background, white text, elevated
 */
const PrimaryButton = ({ children, href, icon: Icon, ...props }) => (
  <a 
    href={href}
    {...props}
    style={{
      flex: 1,
      padding: '12px 20px',
      borderRadius: '12px',
      background: THEME.primary,
      color: 'white',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '0.9rem',
      textDecoration: 'none',
      boxShadow: THEME.shadowRest,
      transition: 'all 0.2s ease',
      fontFamily: 'Inter, sans-serif',
      ...props.style
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = THEME.shadowHover;
      e.currentTarget.style.filter = 'brightness(1.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = THEME.shadowRest;
      e.currentTarget.style.filter = 'brightness(1)';
    }}
  >
    {Icon && <Icon size={18} />}
    {children}
  </a>
);

/**
 * Secondary Button: White background, text color
 */
const SecondaryButton = ({ children, href, icon: Icon, ...props }) => (
  <a 
    href={href}
    {...props}
    style={{
      flex: 1,
      padding: '12px 20px',
      borderRadius: '12px',
      border: `1px solid rgba(30, 41, 59, 0.1)`,
      background: THEME.surface,
      color: THEME.text,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '0.9rem',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      fontFamily: 'Inter, sans-serif',
      ...props.style
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.2)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = THEME.shadowRest;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.1)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    {Icon && <Icon size={18} />}
    {children}
  </a>
);

/**
 * MAIN COMPONENT
 */
export default function Portfolio() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: THEME.background,
      color: THEME.text,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '4rem',
      position: 'relative'
    }}>
      <GrainTexture />
      
      {/* HEADER / HERO */}
      <header style={{ 
        position: 'relative', 
        height: '400px', 
        borderBottom: '1px solid rgba(30, 41, 59, 0.08)',
        backgroundColor: THEME.surface,
        marginBottom: '3rem'
      }}>
         <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <Ballpit colors={THEME.balls} />
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(to right, #ffffff 10%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
              zIndex: 2
            }} />
         </div>

         <div style={{ 
           maxWidth: '1200px', margin: '0 auto', height: '100%', 
           display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
           position: 'relative', zIndex: 10, padding: '2rem',
           pointerEvents: 'none'
         }}>
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
                <div style={{ 
                  fontWeight: 900, 
                  fontSize: '1.5rem', 
                  letterSpacing: '-0.05em', 
                  color: THEME.text,
                  fontFamily: 'Inter, sans-serif'
                }}>
                  MA.
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <BlogButton />
                </div>
            </nav>

            <div style={{ marginBottom: '2rem', pointerEvents: 'none' }}>
                <h1 style={{ 
                    fontSize: 'clamp(3rem, 5vw, 4.5rem)', 
                    fontWeight: 900, 
                    color: THEME.text, 
                    letterSpacing: '-0.03em', 
                    lineHeight: 1.1, 
                    marginBottom: '1rem',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    Matthew<br/>Ankenmann
                </h1>
                <p style={{ 
                  fontSize: '1.25rem', 
                  color: THEME.muted, 
                  fontWeight: 500, 
                  maxWidth: '500px',
                  fontFamily: 'Inter, sans-serif'
                }}>
                    Data-Driven Strategy for Global Analytics.<br/>
                    <span style={{ color: THEME.link }}>
                        <span style={{ 
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.85em',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: THEME.muted,
                          marginRight: '8px'
                        }}>Currently:</span>
                        Optimization @ Tangam Systems
                    </span>
                </p>
            </div>
         </div>
      </header>

      {/* MAIN CONTENT SPLIT */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 2rem',
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: '40px',
        alignItems: 'flex-start',
        position: 'relative',
        zIndex: 1
      }}>

        {/* LEFT COLUMN: EXPERIENCE */}
        <div style={{ flex: 2, width: '100%' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ 
                  background: `${THEME.link}15`, 
                  padding: '8px', 
                  borderRadius: '10px' 
                }}>
                    <Briefcase size={20} color={THEME.link} />
                </div>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  color: THEME.text,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.02em'
                }}>
                  Experience
                </h3>
            </div>

            <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {EXPERIENCE.map((job, i) => (
                    <div key={i} style={{ display: 'flex', gap: '20px' }}>
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ 
                                width: '12px', height: '12px', borderRadius: '50%', 
                                backgroundColor: i === 0 ? THEME.link : 'rgba(100, 116, 139, 0.3)',
                                outline: i === 0 ? `4px solid ${THEME.link}20` : 'none',
                                transition: 'all 0.2s'
                            }} />
                            {i !== EXPERIENCE.length - 1 && (
                                <div style={{ width: '2px', flex: 1, backgroundColor: 'rgba(100, 116, 139, 0.2)', marginTop: '4px' }} />
                            )}
                        </div>
                        
                        {/* Content */}
                        <div style={{ paddingBottom: i !== EXPERIENCE.length - 1 ? '0' : '0' }}>
                            <h4 style={{ 
                              fontWeight: 800, 
                              fontSize: '1.1rem', 
                              color: THEME.text, 
                              marginBottom: '4px',
                              fontFamily: 'Inter, sans-serif',
                              letterSpacing: '-0.01em'
                            }}>
                                {job.role}
                            </h4>
                            <div style={{ 
                              fontSize: '0.9rem', 
                              color: THEME.muted, 
                              marginBottom: '8px', 
                              fontWeight: 500,
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                {job.company} <span style={{ color: 'rgba(100, 116, 139, 0.3)' }}>|</span> {job.date}
                            </div>
                            <p style={{ 
                              fontSize: '0.95rem', 
                              color: THEME.muted, 
                              lineHeight: 1.6, 
                              maxWidth: '600px',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                {job.desc}
                            </p>
                        </div>
                    </div>
                ))}
                </div>
            </Card>

            <div style={{ 
              marginTop: '40px', 
              textAlign: 'center', 
              color: THEME.muted, 
              fontSize: '0.85rem',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '0.05em'
            }}>
                © 2025 Matthew Ankenmann. All Rights Reserved.
            </div>
        </div>

        {/* RIGHT COLUMN: PROFILE & SKILLS */}
        <div style={{ 
            flex: 1, 
            width: '100%', 
            position: isMobile ? 'static' : 'sticky', 
            top: '40px' 
        }}>
            {/* Professional Summary */}
            <Card style={{ marginBottom: '24px' }}>
                
                <div style={{ 
                    width: '48px', height: '48px', 
                    borderRadius: '50%', 
                    background: `${THEME.link}15`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    marginBottom: '16px' 
                }}>
                    <span style={{ fontSize: '24px' }}>👋</span>
                </div>

                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 800, 
                  color: THEME.text, 
                  marginBottom: '16px',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.01em'
                }}>
                    Professional Summary
                </h3>
                
                <p style={{ 
                  color: THEME.muted, 
                  lineHeight: 1.6, 
                  fontSize: '0.95rem', 
                  marginBottom: '24px',
                  fontFamily: 'Inter, sans-serif'
                }}>
                    Based in Waterloo/Guelph, Ontario. I specialize in analytics, optimization, and data-driven decision making. My focus is delivering credible, global impact through rigorous data strategy.
                </p>
                
                {/* Contact Mini-Row */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid rgba(30, 41, 59, 0.08)' 
                }}>
                     <a 
                       href="mailto:matthew@ankenmann.com" 
                       style={{ 
                         display: 'flex', 
                         alignItems: 'center', 
                         gap: '10px', 
                         textDecoration: 'none', 
                         color: THEME.text, 
                         fontSize: '0.9rem', 
                         fontWeight: 500,
                         fontFamily: 'Inter, sans-serif',
                         transition: 'color 0.2s'
                       }}
                       onMouseEnter={e => e.currentTarget.style.color = THEME.link}
                       onMouseLeave={e => e.currentTarget.style.color = THEME.text}
                     >
                        <Mail size={16} color={THEME.muted} /> matthew@ankenmann.com
                     </a>
                     <div style={{ 
                       display: 'flex', 
                       alignItems: 'center', 
                       gap: '10px', 
                       color: THEME.text, 
                       fontSize: '0.9rem', 
                       fontWeight: 500,
                       fontFamily: 'Inter, sans-serif'
                     }}>
                        <MapPin size={16} color={THEME.muted} /> Canada
                     </div>
                </div>
                
                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <SecondaryButton 
                      href="https://www.linkedin.com/in/mankenmann/"
                      target="_blank" 
                      rel="noopener noreferrer"
                      icon={Linkedin}
                    >
                      LinkedIn
                    </SecondaryButton>
                    <PrimaryButton 
                      href="mailto:matthew@ankenmann.com"
                      icon={Mail}
                    >
                      Email
                    </PrimaryButton>
                </div>
            </Card>

            {/* Skills Card */}
            <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Layers size={18} color={THEME.link} />
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 800, 
                      color: THEME.text,
                      fontFamily: 'Inter, sans-serif',
                      letterSpacing: '-0.01em'
                    }}>
                      Expertise
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {SKILLS.map((group, i) => (
                        <div key={i}>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              color: THEME.muted, 
                              marginBottom: '10px', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.1em',
                              fontFamily: '"JetBrains Mono", monospace'
                            }}>
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
