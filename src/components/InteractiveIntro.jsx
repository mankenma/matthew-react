import React, { useState } from 'react';

const STATUSES = [
  { label: 'Building 🏗️', color: '#3b82f6' }, // Blue
  { label: 'Vibe Coding 🌊', color: '#8b5cf6' }, // Purple
  { label: 'Deployed 🚀', color: '#10b981' }, // Green
  { label: 'Caffeinating ☕', color: '#f59e0b' }, // Amber
];

const InteractiveIntro = ({ name, role, bio }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const currentStatus = STATUSES[statusIndex];

  const cycleStatus = () => {
    setStatusIndex((prev) => (prev + 1) % STATUSES.length);
  };

  return (
    <div className="intro-container">
      <div className="intro-header">
        <h1 className="name">{name}</h1>
        
        {/* Interactive Status Badge */}
        <button 
          onClick={cycleStatus} 
          className="status-badge"
          style={{ borderColor: currentStatus.color, color: currentStatus.color }}
          title="Click to toggle status"
        >
          <span className="dot" style={{ backgroundColor: currentStatus.color }}></span>
          {currentStatus.label}
        </button>
      </div>

      <h2 className="role">{role}</h2>
      <p className="bio">{bio}</p>

      {/* Internal Scoped CSS */}
      <style>{`
        .intro-container {
          padding: 4rem 0 2rem 0;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 600px;
        }

        .intro-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .name {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.05rem;
          color: #111;
        }

        .role {
          font-size: 1.25rem;
          font-weight: 500;
          color: #666;
          margin: 0.5rem 0 1.5rem 0;
        }

        .bio {
          font-size: 1rem;
          line-height: 1.6;
          color: #444;
          margin: 0;
        }

        /* Status Badge Styles */
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: 1px solid; /* color set via inline style */
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .status-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .status-badge:active {
          transform: translateY(0);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InteractiveIntro;