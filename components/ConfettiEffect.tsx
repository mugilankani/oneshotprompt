
import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  opacity: number;
  velocityY: number;
  rotationSpeed: number;
}

const colors = ['#FFC700', '#FF0000', '#2E3192', '#44C4A1', '#FF9800', '#F44336', '#2196F3'];

const ConfettiEffect: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const generatePieces = () => {
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < 150; i++) { // Number of confetti pieces
        newPieces.push({
          id: Math.random(),
          x: Math.random() * 100, // percentage
          y: -Math.random() * 100 - 10, // percentage, start off-screen
          rotation: Math.random() * 360,
          scale: Math.random() * 0.5 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: 1,
          velocityY: Math.random() * 3 + 2, // speed
          rotationSpeed: Math.random() * 5 - 2.5,
        });
      }
      setPieces(newPieces);
    };

    generatePieces();
    
    const animationFrame = requestAnimationFrame(animate);

    function animate() {
      setPieces(prevPieces =>
        prevPieces.map(p => {
          const newY = p.y + p.velocityY;
          const newRotation = p.rotation + p.rotationSpeed;
          let newOpacity = p.opacity;
          if (newY > 110) { // if off screen below
            newOpacity = 0; // Make it disappear
          }
          return { ...p, y: newY, rotation: newRotation, opacity: newOpacity };
        }).filter(p => p.opacity > 0) // Remove pieces that are fully transparent
      );
      if(pieces.some(p => p.opacity > 0)) { // continue animation if there are visible pieces
          requestAnimationFrame(animate);
      } else if(pieces.length > 0 && pieces.every(p => p.opacity === 0)) { // If all pieces became transparent, clear them
          setPieces([]);
      }
    }
    
    // Restart confetti periodically or after all have fallen
    const intervalId = setInterval(() => {
        if (pieces.length === 0) generatePieces();
    }, 5000);


    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(intervalId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount, and when pieces get cleared

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-4 md:w-3 md:h-5" // size of confetti
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            opacity: p.opacity,
            transition: 'top 0.05s linear, transform 0.05s linear, opacity 0.5s linear', // smooth fall
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiEffect;
