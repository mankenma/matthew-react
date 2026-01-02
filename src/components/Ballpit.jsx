import React, { useEffect, useRef } from 'react';

/**
 * COMPONENT: LIGHTWEIGHT BALLPIT (Euler Integration)
 * Physics based on User JSON Specification
 */
const Ballpit = ({ colors }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const ballsRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // Physics Constants from JSON
  const PHYSICS = {
    count: 45,
    gravity: 0.1, // Reduced for low gravity/floating effect
    friction: 0.998,
    bounce: 0.98, // Increased restitution for more ethereal floating feel
    mouseRadius: 220, // Balanced interaction radius
    mouseForce: 0.002, // Reduced force for subtler cursor interaction
    directHoverMultiplier: 1.5, // Reduced multiplier for gentler direct hover effect
    radiusMin: 15,
    radiusMax: 30
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initBalls();
    };

    const initBalls = () => {
      ballsRef.current = [];
      for (let i = 0; i < PHYSICS.count; i++) {
        // Radius 15 to 30 pixels
        const radius = PHYSICS.radiusMin + Math.random() * (PHYSICS.radiusMax - PHYSICS.radiusMin);
        
        ballsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * -canvas.height, // Start high above to drop in
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          radius: radius,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ballsRef.current.forEach(ball => {
        // 1. Enhanced Interactive Logic: Direct hover detection
        const dx = ball.x - mouseRef.current.x;
        const dy = ball.y - mouseRef.current.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const isDirectlyOver = distance < ball.radius; // Cursor is directly over the ball

        if (distance < PHYSICS.mouseRadius) {
          const angle = Math.atan2(dy, dx);
          // Base force with smooth distance falloff
          let force = (PHYSICS.mouseRadius - distance) * PHYSICS.mouseForce;
          
          // If cursor is directly over the ball, apply slightly stronger force
          if (isDirectlyOver) {
            force *= PHYSICS.directHoverMultiplier;
            // Gentle push away from cursor when directly over
            ball.vx += Math.cos(angle) * force;
            ball.vy += Math.sin(angle) * force;
          } else {
            // Chill repulsion for nearby balls
            ball.vx += Math.cos(angle) * force;
            ball.vy += Math.sin(angle) * force;
          }
        }

        // 2. Forces (Euler Integration)
        ball.vy += PHYSICS.gravity;
        ball.vx *= PHYSICS.friction; 
        ball.vy *= PHYSICS.friction; 

        // 3. Update Position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // 4. Collision Handling (Boundaries with Hard Reset)
        
        // Right Wall
        if (ball.x + ball.radius > canvas.width) {
          ball.x = canvas.width - ball.radius; // Position Correction
          ball.vx *= -PHYSICS.bounce;          // Velocity Inversion
        } 
        // Left Wall
        else if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;                // Position Correction
          ball.vx *= -PHYSICS.bounce;          // Velocity Inversion
        }

        // Floor
        if (ball.y + ball.radius > canvas.height) {
          ball.y = canvas.height - ball.radius; // Position Correction
          ball.vy *= -PHYSICS.bounce;           // Velocity Inversion
        } 
        // Ceiling (Optional: prevents flying out top if mouse pushed hard)
        else if (ball.y - ball.radius < 0) {
           ball.y = ball.radius;
           ball.vy *= -PHYSICS.bounce;
        }

        // 5. Rendering
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
      });

      requestRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('resize', handleResize);
    const onMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mouseRef.current = { x, y };
    };
    
    const onMouseLeave = () => {
      mouseRef.current = {x: -1000, y: -1000};
    };
    
    // Add listeners - use capture phase to ensure we get events
    canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    canvas.addEventListener('mouseenter', onMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Start
    handleResize();
    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseenter', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(requestRef.current);
    };
  }, [colors]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto', zIndex: 1 }} />;
};

export default Ballpit;