import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, color = '#4F46E5' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analyser || !isActive) {
        // Soft wave idle animation
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#F3F4F6';
        ctx.moveTo(0, canvas.height / 2);
        for(let i=0; i<canvas.width; i++) {
            ctx.lineTo(i, canvas.height / 2 + Math.sin(i * 0.05 + Date.now() * 0.002) * 2);
        }
        ctx.stroke();
        return;
      }

      analyser.getByteTimeDomainData(dataArray);

      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      
      // Shadow for organic glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (canvas.height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      // Clear shadow for next frame or other drawings
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isActive, color]);

  return (
    <div className="w-full h-24 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={150} className="w-full h-full" />
    </div>
  );
};