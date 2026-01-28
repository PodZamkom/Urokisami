import React, { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { TutorSession } from './components/TutorSession';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { AppState, User, ChatLog, ActiveSession } from './types';
import { db } from './utils/db';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Автоматическое распознавание девайса через сохраненного пользователя
    const checkAuth = () => {
      const persistedUser = db.getPersistedUser();
      const savedActive = db.getActiveSession();

      if (persistedUser) {
        setCurrentUser(persistedUser);
        if (persistedUser.role === 'admin') {
          setAppState(AppState.ADMIN);
        } else {
          setAppState(AppState.LANDING);
          if (savedActive) {
            setActiveSession(savedActive);
          }
        }
      }
      setIsInitializing(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (user: User, remember: boolean) => {
    setCurrentUser(user);
    if (remember) {
      db.persistUser(user);
    }

    if (user.role === 'admin') {
      setAppState(AppState.ADMIN);
    } else {
      const savedActive = db.getActiveSession();
      if (savedActive) {
        setActiveSession(savedActive);
      }
      setAppState(AppState.LANDING);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    db.clearPersistedUser();
    db.clearActiveSession();
    setActiveSession(null);
    setAppState(AppState.LOGIN);
  };

  const handleStartNew = () => {
    db.clearActiveSession();
    setActiveSession(null);
    setAppState(AppState.CAMERA);
  };

  const handleResume = () => {
    if (activeSession) {
      setAppState(AppState.TUTOR);
    }
  };

  const handleCapture = (base64Image: string) => {
    const session: ActiveSession = {
      id: crypto.randomUUID(),
      image: base64Image,
      startTime: Date.now(),
      logs: [],
      events: []
    };
    setActiveSession(session);
    db.setActiveSession(session);
    setAppState(AppState.TUTOR);
  };

  const handleEndTutorSession = async (logs: ChatLog[]) => {
    if (currentUser && activeSession) {
      await db.endSession(activeSession.id, {
        endTime: Date.now(),
        image: activeSession.image
      });
    }
    setActiveSession(null);
    db.clearActiveSession();
    setAppState(AppState.LANDING);
  };

  if (isInitializing) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white">
        <div className="relative">
          <div className="w-24 h-24 bg-indigo-600 rounded-full animate-bounce flex items-center justify-center text-white text-5xl shadow-2xl shadow-indigo-200 border-4 border-white">🦉</div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center">
            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em] animate-pulse">УрокиСами</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && appState !== AppState.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="w-full h-full flex flex-col font-sans selection:bg-indigo-100">
      {appState !== AppState.LOGIN && appState !== AppState.ADMIN && (
        <header className="flex-none p-5 bg-white border-b border-gray-100 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-100 font-bold border-2 border-white">🦉</div>
            <h1 className="text-xl font-black text-indigo-950 tracking-tighter">УРОКИСАМИ</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-gray-900 leading-none tracking-tight">{currentUser?.username}</span>
              <span className="text-[9px] text-indigo-400 uppercase font-black tracking-widest mt-0.5">Личный кабинет</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>
      )}

      <main className="flex-grow relative overflow-hidden bg-white h-full">
        {appState === AppState.LOGIN && <Login onLogin={handleLogin} />}
        {appState === AppState.ADMIN && <AdminDashboard onLogout={handleLogout} />}

        {appState === AppState.LANDING && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-10 animate-fade-in">
            <div className="relative group cursor-default">
              <div className="w-56 h-56 bg-indigo-50 rounded-[3rem] flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 rounded-[3rem] border-8 border-indigo-100/50 animate-pulse"></div>
                <span className="text-8xl group-hover:rotate-12 transition-transform duration-500">🦉</span>
              </div>
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-[10px] font-black px-4 py-2 rounded-2xl shadow-lg border-4 border-white animate-bounce">ОНЛАЙН</div>
            </div>

            <div className="space-y-4 max-w-sm">
              <h2 className="text-4xl font-black text-gray-950 tracking-tighter leading-tight">Рады тебя видеть, {currentUser?.username}!</h2>
              <p className="text-gray-400 font-bold leading-relaxed text-sm">
                Готов к продуктивному занятию? Твой ИИ-наставник уже изучил новые темы и ждет твоего вопроса.
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-xs">
              {activeSession && (
                <button
                  onClick={handleResume}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-black py-5 rounded-[1.5rem] shadow-xl shadow-emerald-100 transition-all active:scale-[0.97] flex items-center justify-center gap-4 border-b-4 border-emerald-700"
                >
                  <span className="text-2xl">🔄</span>
                  <span>Продолжить</span>
                </button>
              )}
              <button
                onClick={handleStartNew}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 transition-all active:scale-[0.97] flex items-center justify-center gap-4 border-b-4 border-indigo-800"
              >
                <span className="text-2xl">📸</span>
                <span>Новое занятие</span>
              </button>
            </div>
          </div>
        )}

        {appState === AppState.CAMERA && <CameraCapture onCapture={handleCapture} onBack={() => setAppState(AppState.LANDING)} />}

        {appState === AppState.TUTOR && activeSession && (
          <TutorSession
            initialSession={activeSession}
            onBack={handleEndTutorSession}
          />
        )}
      </main>
      <footer className="flex-none py-4 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
        v1.27.0
      </footer>
    </div>
  );
}