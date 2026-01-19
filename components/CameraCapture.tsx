import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (image: string) => void;
  onBack: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Не удалось получить доступ к камере. Пожалуйста, разрешите доступ.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get Base64 image
        // Removing prefix data:image/jpeg;base64, for Gemini API usually requires just the data or careful handling
        // But for display we keep it, for Gemini we strip it later
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6">
          <p className="text-white text-center">{error}</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-white text-black rounded">Назад</button>
        </div>
      )}

      {/* Video Preview */}
      <div className="flex-grow relative overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute min-w-full min-h-full object-cover"
        />
        {/* Overlay guides */}
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-r border-b border-white/20"></div>
            <div className="border-b border-white/20"></div>
            <div className="border-r border-white/20"></div>
            <div className="border-r border-white/20"></div>
            <div></div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="h-32 bg-black/50 backdrop-blur-sm flex items-center justify-between px-8 pb-4">
        <button 
          onClick={onBack}
          className="text-white text-sm font-medium p-4"
        >
          Отмена
        </button>

        <button
          onClick={takePhoto}
          className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg transform active:scale-95 transition-transform"
          aria-label="Сделать фото"
        ></button>
        
        <div className="w-12"></div> {/* Spacer for symmetry */}
      </div>
    </div>
  );
};