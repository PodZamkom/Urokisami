import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData } from '../utils/audioUtils';
import { Visualizer } from './Visualizer';
import { ChatLog, ActiveSession } from '../types';
import { db } from '../utils/db';

interface TutorSessionProps {
  initialSession: ActiveSession;
  onBack: (logs: ChatLog[]) => void;
}

const SYSTEM_INSTRUCTION = `
Ты — мудрый наставник и проницательный учитель. Твоя миссия — обеспечить глубокое понимание материала учеником.

Твоя стратегия:
1. Анализируй задачу на фото. Реши её про себя.
2. Не давай готовых ответов. Задавай наводящие вопросы, чтобы ученик сам пришел к решению.
3. Если сессия возобновлена, поприветствуй ученика и продолжи с того места, где остановились, используя историю.
4. Твой тон — доброжелательный, спокойный и поддерживающий.
`;

// ... imports above ...

export function TutorSession({ initialSession, onBack }: TutorSessionProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const activeRef = useRef<boolean>(true);
  const reconnectAttempts = useRef<number>(0);
  const sessionLogsRef = useRef<ChatLog[]>(initialSession.logs || []);
  const inputTranscriptBuffer = useRef<string>('');
  const outputTranscriptBuffer = useRef<string>('');
  const statusRef = useRef<string>('initializing');
  const nextStartTimeRef = useRef<number>(0);
  const gainNodeRef = useRef<GainNode | null>(null);

  // State
  const [logs, setLogs] = useState<string[]>([]);
  const [statusVal, setStatusVal] = useState<string>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [volume, setVolume] = useState<number>(1.0);

  // Status Sync Wrapper
  const setStatus = (s: string) => {
    setStatusVal(s);
    statusRef.current = s;
  };
  const status = statusVal; // Expose as 'status' for UI

  // Logs
  const debugLog = (msg: string) => {
    // const ts = new Date().toLocaleTimeString();
    // setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
    // console.log(`[${ts}] ${msg}`);
  };

  const addLog = (sender: 'user' | 'ai', text: string) => {
    sessionLogsRef.current.push({ timestamp: Date.now(), sender, text });
  };

  const cleanup = () => {
    debugLog('[Cleanup] Cleaning up session and audio...');
    try { inputAudioContextRef.current?.close(); } catch (e) { }
    inputAudioContextRef.current = null;

    try { outputAudioContextRef.current?.close(); } catch (e) { }
    outputAudioContextRef.current = null;

    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    sourcesRef.current.clear();

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((s: any) => {
        try { s.close(); } catch (e) { }
      }).catch(() => { });
      sessionPromiseRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleEndSession = () => {
    activeRef.current = false;
    cleanup();
    onBack(sessionLogsRef.current);
  };



  useEffect(() => {
    activeRef.current = true;
    startSession();

    const saveInterval = setInterval(() => {
      // ... existing save logic ...
    }, 5000);

    return () => {
      activeRef.current = false;
      clearInterval(saveInterval);
      cleanup();
    };
  }, []);

  // ... existing addLog ...

  const log = (msg: string, data?: any) => {
    // const ts = new Date().toISOString();
    // if (data) console.log(`[${ts}] [TutorSession] ${msg}`, data);
    // else console.log(`[${ts}] [TutorSession] ${msg}`);
    // debugLog(msg); 
  };

  const startSession = async () => {
    if (!activeRef.current) return;

    log("Starting session cleanup/setup...");
    cleanup();

    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");

      // ... existing setup ...
      const ai = new GoogleGenAI({
        apiKey: process.env.API_KEY,
        httpOptions: {
          baseUrl: window.location.origin + '/google-api',
        }
      });
      log(`Initialized GoogleGenAI`);

      // Audio Context setup ... (keep existing)
      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
      // ... existing inputCtx setup ...
      inputAudioContextRef.current = inputCtx;

      const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new OutputContextClass({ sampleRate: 24000 });
      outputAudioContextRef.current = outputCtx;

      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      inputAnalyserRef.current = inputAnalyser;

      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyserRef.current = outputAnalyser;

      const gainNode = outputCtx.createGain();
      gainNode.gain.value = 1.0; // Default volume (will be updated by state effect if needed, but refs are better here)
      gainNodeRef.current = gainNode;
      // Connect: Gain -> Analyser -> Destination
      gainNode.connect(outputAnalyser);
      outputAnalyser.connect(outputCtx.destination);

      log("Requesting microphone access...");
      // FIX RACE CONDITION
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!activeRef.current) {
        log("Session inactive after getUserMedia. Stopping stream immediately.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      mediaStreamRef.current = stream;
      log("Microphone access granted.");

      const source = inputCtx.createMediaStreamSource(stream);
      source.connect(inputAnalyser);

      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        if (!activeRef.current || statusRef.current !== 'connected') return;
        const channelData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(channelData, inputCtx.sampleRate);
        sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      // ... existing prompt setup ...
      let fullSystemInstruction = SYSTEM_INSTRUCTION;
      if (sessionLogsRef.current.length > 0) {
        const history = sessionLogsRef.current.map(l => `${l.sender === 'user' ? 'Ученик' : 'Учитель'}: ${l.text}`).join('\n');
        fullSystemInstruction += `\n\nВАЖНО: Мы уже начали обсуждение. Вот история диалога:\n${history}\n\nПродолжи обучение с того места, где мы остановились.`;
      } else {
        fullSystemInstruction += "\n\nДавай начнем урок. Я (ученик) прислал тебе фото задачи.";
      }

      log("Connecting to Gemini Live API...");
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: fullSystemInstruction,
        },
        callbacks: {
          onopen: async () => {
            log("WebSocket Connection Opened!");
            if (!activeRef.current) return;
            setStatus('connected');
            reconnectAttempts.current = 0;


            const parts = initialSession.image.split(',');
            if (parts.length < 2 || !parts[1]) {
              log("CRITICAL ERROR: Invalid image data format or empty.");
              setStatus('error');
              setErrorMessage("Ошибка: Некорректное изображение. Попробуйте сделать фото снова.");
              return;
            }
            const base64Data = parts[1];

            sessionPromise.then(session => {
              log(`Sending initial image (${base64Data.length} chars)...`);
              session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Data } });
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            // ... existing message handling ...
            if (!activeRef.current) return;
            // log("Msg type: " + Object.keys(msg.serverContent || {}).join(',')); 

            const serverContent = msg.serverContent;

            if (serverContent?.outputTranscription?.text) outputTranscriptBuffer.current += serverContent.outputTranscription.text;
            if (serverContent?.inputTranscription?.text) inputTranscriptBuffer.current += serverContent.inputTranscription.text;

            if (serverContent?.turnComplete) {
              // log("Turn complete.");
              if (inputTranscriptBuffer.current) { addLog('user', inputTranscriptBuffer.current); inputTranscriptBuffer.current = ''; }
              if (outputTranscriptBuffer.current) { addLog('ai', outputTranscriptBuffer.current); outputTranscriptBuffer.current = ''; }
            }

            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              // Resume context if suspended (common on mobile)
              if (ctx.state === 'suspended') await ctx.resume();

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(base64Audio, ctx);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;

              if (gainNodeRef.current) {
                source.connect(gainNodeRef.current);
              } else {
                source.connect(outputAnalyserRef.current || ctx.destination);
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
            }

            if (serverContent?.interrupted) {
              log("Interrupted signal received.");
              if (outputTranscriptBuffer.current) { addLog('ai', outputTranscriptBuffer.current + " [прервано]"); outputTranscriptBuffer.current = ''; }
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: (event) => {
            log(`WS Closed. Code: ${event.code}, Reason: ${event.reason}`);
            console.log("WS Close:", event);
            if (!activeRef.current) return;
            // REMOVE cleanup() from here to avoid killing the retry logic's audio context if reusing?
            // actually cleanup is good, but let's be careful.
            cleanup();

            if (reconnectAttempts.current < 5) { // Increased attempts
              log(`Reconnecting attempt ${reconnectAttempts.current + 1}...`);
              setStatus('reconnecting');
              reconnectAttempts.current++;
              setTimeout(startSession, 2000);
            } else {
              log("Max reconnection attempts reached.");
              setStatus('error');
              setErrorMessage(`Соединение разорвано (Код ${event.code}). Обновите страницу.`);
            }
          },
          onerror: (err) => {
            log(`WS Error: ${err.message || err}`);
            console.error("Live error:", err);
            if (!activeRef.current) return;
            cleanup();
            setStatus('error');
            setErrorMessage("Ошибка соединения.");
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      log(`Session start failed: ${err.message}`);
      if (!activeRef.current) return;
      cleanup();
      setErrorMessage(err.message || "Connection failed");
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in relative">
      {/* DEBUG OVERLAY */}
      <div className="absolute top-0 left-0 w-full h-32 bg-black/80 text-green-400 text-[10px] p-2 overflow-y-auto z-50 pointer-events-none opacity-80 font-mono">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <div className="flex-none h-[25vh] bg-gray-100 relative border-b border-gray-100 shadow-sm overflow-hidden">
        {/* ... existing header ... */}
        <img src={initialSession.image} alt="Task" className="w-full h-full object-cover blur-md opacity-30 scale-110" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <img src={initialSession.image} alt="Task" className="h-full object-contain rounded-lg shadow-2xl border-4 border-white" />
        </div>

        <button onClick={handleEndSession} className="absolute top-4 left-4 bg-white/90 p-3 rounded-full shadow-lg text-gray-700 hover:bg-white transition-all active:scale-90 z-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="absolute top-4 right-4 z-20">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 ${status === 'connected' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
            }`}>
            <span className={`w-2 h-2 rounded-full bg-white ${status === 'connected' ? '' : 'animate-ping'}`}></span>
            {status === 'connected' ? 'Урок идет' : 'Связь...'}
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-8 space-y-12">
        {/* ... existing body ... */}
        {(status === 'connecting' || status === 'reconnecting') && (
          <div className="text-center flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center relative">
              <div className="absolute inset-0 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="text-3xl">🦉</span>
            </div>
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
              {status === 'reconnecting' ? 'Восстановление связи...' : 'Настройка учебной комнаты...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center p-8 bg-red-50 rounded-3xl border border-red-100 shadow-sm max-w-xs animate-fade-in">
            <div className="text-4xl mb-3">⚠️</div>
            <h4 className="text-red-800 font-bold mb-1">Ой, что-то не так</h4>
            <p className="text-xs text-red-500 mb-6">{errorMessage}</p>
            <button onClick={startSession} className="w-full bg-indigo-600 text-white py-3 rounded-2xl shadow-lg font-bold text-sm hover:bg-indigo-700 transition-colors mb-2">Попробовать снова</button>
            <button onClick={handleEndSession} className="w-full bg-white text-gray-500 py-3 rounded-2xl border border-gray-100 font-bold text-sm">Вернуться назад</button>
          </div>
        )}

        {status === 'connected' && (
          <div className="w-full max-w-sm space-y-8 animate-fade-in">
            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full z-10 shadow-sm">Учитель</div>
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-50 flex items-center justify-center min-h-[120px]">
                <Visualizer analyser={outputAnalyserRef.current} isActive={true} color="#4F46E5" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full z-10 shadow-sm">Ученик</div>
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-50 flex items-center justify-center min-h-[120px]">
                <Visualizer analyser={inputAnalyserRef.current} isActive={true} color="#10B981" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-none p-10 pb-20 bg-white border-t border-gray-50 text-center space-y-6">
        <div className="max-w-xs mx-auto w-full px-4 flex items-center gap-4">
          {/* Volume Controls */}
          <span className="text-xl">🔈</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (gainNodeRef.current) {
                gainNodeRef.current.gain.value = v;
                // Smooth transition could be added: .setTargetAtTime(v, ctx.currentTime, 0.1)
              }
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xl">🔊</span>
        </div>

        <button onClick={handleEndSession} className="group flex flex-col items-center mx-auto space-y-2">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-red-500">Закончить урок</span>
        </button>
      </div>
    </div>
  );
};