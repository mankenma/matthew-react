import React from 'react';

// A reusable wrapper for your creative experiments
// It adds a "lab-like" dot grid background and a clean border
const PlaygroundCard = ({ title, description, children }) => {
  return (
    <div className="playground-card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {description && <p className="card-meta">{description}</p>}
      </div>

      <div className="card-stage">
        {/* This is where your interactive experiment lives */}
        {children}
      </div>

      {/* Internal styles for simplicity (or move to a CSS file) */}
      <style>{`
        .playground-card {
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          margin: 2rem 0;
          font-family: system-ui, sans-serif;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          padding: 1rem 1.5rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e5e5;
        }

        .card-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #111;
        }

        .card-meta {
          margin: 0.25rem 0 0;
          font-size: 0.85rem;
          color: #666;
        }

        .card-stage {
          padding: 2rem;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Fun dot-grid pattern for that "blueprint" vibe */
          background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};

export default PlaygroundCard;