import React, { useEffect, useRef } from 'react';

interface InteractiveBackgroundProps {
  isGenerating: boolean;
}

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({ isGenerating }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Aurora Blob logic
  // We use CSS classes for the blobs, but control their speed via inline styles or class toggling in the render return.

  // Particle Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth / 15, 100); // Responsive count
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((p, i) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse Interaction (Flee/Connect)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Gentle push away from mouse
        if (dist < 100) {
          const angle = Math.atan2(dy, dx);
          const force = (100 - dist) / 100;
          p.x -= Math.cos(angle) * force * 2;
          p.y -= Math.sin(angle) * force * 2;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${0.1 + (100 - Math.min(dist, 100)) / 500})`; // Violet tint
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx2 = p.x - p2.x;
            const dy2 = p.y - p2.y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (dist2 < 100) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(167, 139, 250, ${0.05 * (1 - dist2 / 100)})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dark Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

        {/* Aurora Blobs - Speed up when generating */}
        <div 
            className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[100px] animate-aurora mix-blend-screen"
            style={{ animationDuration: isGenerating ? '3s' : '15s' }}
        ></div>
        <div 
            className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[100px] animate-aurora mix-blend-screen"
            style={{ animationDuration: isGenerating ? '4s' : '18s', animationDelay: '-5s' }}
        ></div>
        <div 
            className="absolute -bottom-[10%] left-[20%] w-[60vw] h-[60vw] bg-violet-600/10 rounded-full blur-[100px] animate-aurora mix-blend-screen"
            style={{ animationDuration: isGenerating ? '5s' : '20s', animationDelay: '-2s' }}
        ></div>

        {/* Particle Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
    </div>
  );
};