import { SessionRecord, User, ActiveSession } from '../types';

const STORAGE_KEY = 'urokisami_sessions_v2';
const ACTIVE_SESSION_KEY = 'urokisami_active_session_v2';
const USER_KEY = 'urokisami_auth_user_v2';

export const db = {
  // Теперь просто возвращает объект пользователя без проверки пароля
  login: (username: string, contact: string): User => {
    const role = (username.toLowerCase() === 'admin' || username.toLowerCase() === 'админ') ? 'admin' : 'student';
    return { username, contact, role };
  },

  persistUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getPersistedUser: (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  clearPersistedUser: () => {
    localStorage.removeItem(USER_KEY);
  },

  saveSession: (session: SessionRecord) => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const sessions: SessionRecord[] = existing ? JSON.parse(existing) : [];
      sessions.push(session);
      const trimmedSessions = sessions.slice(-100); 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSessions));
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (e) {
      console.error("Storage error:", e);
    }
  },

  setActiveSession: (session: ActiveSession) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  },

  getActiveSession: (): ActiveSession | null => {
    const data = localStorage.getItem(ACTIVE_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  clearActiveSession: () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  },

  getSessions: (): SessionRecord[] => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const data: SessionRecord[] = existing ? JSON.parse(existing) : [];
      return data;
    } catch (e) {
      return [];
    }
  },

  clearSessions: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};