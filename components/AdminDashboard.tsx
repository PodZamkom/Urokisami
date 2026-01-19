import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { SessionRecord } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  useEffect(() => {
    const data = db.getSessions();
    setSessions(data.sort((a, b) => b.startTime - a.startTime));
  }, []);

  const formatDate = (ts: number) => new Date(ts).toLocaleString('ru-RU');
  
  const getDuration = (s: SessionRecord) => {
    if (!s.endTime) return 'Не завершено';
    const diff = Math.floor((s.endTime - s.startTime) / 1000);
    const m = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${m}м ${sec}с`;
  };

  const handleClearAll = () => {
    if (window.confirm("Вы уверены, что хотите удалить ВСЮ историю сессий?")) {
      db.clearSessions();
      setSessions([]);
      setSelectedSession(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Админка: <span className="text-indigo-600">УРОКИСАМИ</span></h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleClearAll} className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors">Очистить базу</button>
          <button onClick={onLogout} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-black transition-colors">Выйти</button>
        </div>
      </header>

      <div className="flex-grow flex overflow-hidden">
        <div className="w-80 bg-white border-r overflow-y-auto no-scrollbar">
          <div className="p-4 bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">История ({sessions.length})</div>
          {sessions.length === 0 && (
            <div className="p-12 text-center opacity-30">
              <div className="text-5xl mb-4">🏜️</div>
              <p className="text-xs font-bold">Пусто</p>
            </div>
          )}
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className={`p-5 border-b cursor-pointer transition-all hover:bg-gray-50 ${selectedSession?.id === session.id ? 'bg-indigo-50/50 border-r-4 border-r-indigo-600' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-black text-gray-900 leading-tight">{session.username}</span>
                <span className="text-[9px] text-gray-400 font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded uppercase">{getDuration(session)}</span>
              </div>
              <div className="text-[10px] text-gray-400 font-bold mb-2">{session.contact || 'Без контакта'}</div>
              <div className="text-[11px] text-gray-500 line-clamp-2 italic leading-relaxed">
                 {session.logs.find(l => l.sender === 'user')?.text || 'Аудио-сессия без транскрипции'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-grow overflow-y-auto p-10 bg-gray-50 no-scrollbar">
          {selectedSession ? (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              <div className="bg-white rounded-[2rem] shadow-sm p-8 flex items-start justify-between border border-gray-100">
                <div className="space-y-1">
                   <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedSession.username}</h3>
                   <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-600">{selectedSession.contact}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm font-medium text-gray-400">{formatDate(selectedSession.startTime)}</span>
                   </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Время в уроке</div>
                  <div className="text-2xl font-black text-gray-900 tabular-nums">{getDuration(selectedSession)}</div>
                </div>
              </div>

              {selectedSession.image && (
                <div className="bg-white rounded-[2rem] shadow-sm p-8 space-y-4 border border-gray-100">
                  <h4 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] mb-4">Фотография задачи</h4>
                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex justify-center p-4">
                    <img src={selectedSession.image} alt="Task" className="max-w-full h-auto max-h-[600px] object-contain rounded-lg shadow-lg shadow-black/5" />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2rem] shadow-sm p-8 border border-gray-100">
                 <h4 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] mb-8">Стенограмма диалога</h4>
                 <div className="space-y-8">
                    {selectedSession.logs.map((log, idx) => (
                      <div key={idx} className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}>
                         <div className={`px-6 py-4 rounded-[1.5rem] max-w-[80%] shadow-sm text-sm font-medium leading-relaxed ${
                           log.sender === 'user' 
                             ? 'bg-indigo-600 text-white rounded-tr-none' 
                             : 'bg-white text-gray-800 rounded-tl-none border-2 border-indigo-50'
                         }`}>
                           {log.text}
                         </div>
                         <div className="flex items-center gap-2 mt-2 px-2">
                           <span className={`text-[9px] font-black uppercase tracking-wider ${log.sender === 'user' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                             {log.sender === 'user' ? 'Ученик' : 'Учитель (AI)'}
                           </span>
                           <span className="text-gray-200">•</span>
                           <span className="text-[9px] text-gray-400 font-bold tabular-nums">
                             {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                         </div>
                      </div>
                    ))}
                    {selectedSession.logs.length === 0 && (
                      <div className="text-center py-20 border-4 border-dashed border-gray-50 rounded-[2rem]">
                        <p className="text-gray-300 font-bold italic">Логи пусты</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <div className="text-8xl mb-6">🔭</div>
              <p className="text-xl font-black uppercase tracking-widest text-gray-900">Выберите ученика</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};