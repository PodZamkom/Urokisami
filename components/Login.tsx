import React, { useState } from 'react';
import { db } from '../utils/db';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User, remember: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [remember, setRemember] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    const user = db.login(username.trim(), contact.trim());
    onLogin(user, remember);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 space-y-8 animate-fade-in border border-gray-100">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-4xl mx-auto shadow-indigo-200 shadow-2xl border-4 border-white animate-bounce">
            🦉
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-indigo-900 tracking-tight">УРОКИСАМИ</h2>
            <p className="text-gray-400 text-sm font-medium">Твой личный репетитор всегда рядом</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Как тебя зовут?</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-lg font-semibold text-gray-800 placeholder:text-gray-300"
              placeholder="Иван Иванов"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Телефон или Почта</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-lg font-semibold text-gray-800 placeholder:text-gray-300"
              placeholder="+7 (900) ..."
              required
            />
          </div>

          <div className="flex items-center px-1">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="hidden"
              />
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${remember ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 bg-white'}`}>
                {remember && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </div>
              <span className="ml-3 text-sm font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">Запомнить меня на этом устройстве</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-b-4 border-indigo-800"
          >
            Начать учиться
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-300 uppercase font-black tracking-tighter">
          Используя приложение, ты становишься умнее с каждой минутой
        </p>
      </div>
    </div>
  );
};