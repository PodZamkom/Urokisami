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

export const TutorSession: React.FC<TutorSessionProps> = ({ initialSession, onBack }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'reconnecting'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  
  const sessionLogsRef = useRef<ChatLog[]>(initialSession.logs);
  const reconnectAttempts = useRef(0);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeRef = useRef(true);

  const inputTranscriptBuffer = useRef('');
  const outputTranscriptBuffer = useRef('');

  useEffect(() => {
    activeRef.current = true;
    startSession();
    
    const saveInterval = setInterval(() => {
        if (activeRef.current && status === 'connected') {
            db.setActiveSession({
                image: initialSession.image,
                startTime: initialSession.startTime,
                logs: sessionLogsRef.current
            });
        }
    }, 5000);

    return () => {
      activeRef.current = false;
      clearInterval(saveInterval);
      cleanup();
    };
  }, []);

  const addLog = (sender: 'user' | 'ai', text: string) => {
    if (!text.trim()) return;
    sessionLogsRef.current = [...sessionLogsRef.current, {
      sender,
      text: text.trim(),
      timestamp: Date.now()
    }];
  };

  const handleEndSession = () => {
    if (inputTranscriptBuffer.current) addLog('user', inputTranscriptBuffer.current);
    if (outputTranscriptBuffer.current) addLog('ai', outputTranscriptBuffer.current);
    onBack(sessionLogsRef.current);
  };

  const startSession = async () => {
    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      source.connect(inputAnalyser);

      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        if (!activeRef.current || status !== 'connected') return;
        const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
        sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: async () => {
            if (!activeRef.current) return;
            setStatus('connected');
            reconnectAttempts.current = 0;
            
            const base64Data = initialSession.image.split(',')[1];
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Data } });
                
                let contextPrompt = "Я прислал фото задачи. ";
                if (sessionLogsRef.current.length > 0) {
                    const history = sessionLogsRef.current.map(l => `${l.sender === 'user' ? 'Ученик' : 'Учитель'}: ${l.text}`).join('\n');
                    contextPrompt += `Мы уже начали обсуждение. Продолжи обучение с того места, где мы остановились:\n${history}`;
                } else {
                    contextPrompt += "Давай начнем урок.";
                }
                
                session.sendRealtimeInput({ content: [{ text: contextPrompt }] });
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!activeRef.current) return;
            const serverContent = msg.serverContent;
            
            if (serverContent?.outputTranscription?.text) outputTranscriptBuffer.current += serverContent.outputTranscription.text;
            if (serverContent?.inputTranscription?.text) inputTranscriptBuffer.current += serverContent.inputTranscription.text;

            if (serverContent?.turnComplete) {
                if (inputTranscriptBuffer.current) { addLog('user', inputTranscriptBuffer.current); inputTranscriptBuffer.current = ''; }
                if (outputTranscriptBuffer.current) { addLog('ai', outputTranscriptBuffer.current); outputTranscriptBuffer.current = ''; }
            }

            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(base64Audio, ctx);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyserRef.current || ctx.destination);
              if (outputAnalyserRef.current) outputAnalyserRef.current.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
            }

            if (serverContent?.interrupted) {
               if (outputTranscriptBuffer.current) { addLog('ai', outputTranscriptBuffer.current + " [прервано]"); outputTranscriptBuffer.current = ''; }
               sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            if (!activeRef.current) return;
            if (reconnectAttempts.current < 3) {
                setStatus('reconnecting');
                reconnectAttempts.current++;
                setTimeout(startSession, 2000);
            } else {
                setStatus('error');
                setErrorMessage("Соединение потеряно. Попробуйте обновить страницу.");
            }
          },
          onerror: (err) => {
            console.error("Live error:", err);
            setStatus('error');
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setErrorMessage(err.message || "Connection failed");
      setStatus('error');
    }
  };

  const cleanup = () => {
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close());
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in">
        <div className="flex-none h-[25vh] bg-gray-100 relative border-b border-gray-100 shadow-sm overflow-hidden">
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
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 ${
                    status === 'connected' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                }`}>
                    <span className={`w-2 h-2 rounded-full bg-white ${status === 'connected' ? '' : 'animate-ping'}`}></span>
                    {status === 'connected' ? 'Урок идет' : 'Связь...'}
                </div>
            </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center p-8 space-y-12">
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
                    <button onClick={handleEndSession} className="w-full bg-white text-red-600 py-3 rounded-2xl border border-red-200 shadow-sm font-bold text-sm">Вернуться назад</button>
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

        <div className="flex-none p-10 bg-white border-t border-gray-50 text-center">
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