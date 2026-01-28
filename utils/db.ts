import { SessionRecord, User, ActiveSession, ChatLog, SessionEvent } from '../types';

const USER_KEY = 'urokisami_auth_user_v2';
const ACTIVE_SESSION_KEY = 'urokisami_active_session_v3';

export const db = {
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

  // NEW: Backend API calls
  startSession: async (session: { id: string, username: string, contact: string, startTime: number }) => {
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  },

  addLog: async (sessionId: string, log: ChatLog) => {
    await fetch(`/api/sessions/${sessionId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  },

  addEvent: async (sessionId: string, event: SessionEvent) => {
    await fetch(`/api/sessions/${sessionId}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  },

  endSession: async (sessionId: string, data: { endTime: number, image: string }) => {
    await fetch(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  },

  getSessions: async (): Promise<SessionRecord[]> => {
    const res = await fetch('/api/admin/sessions');
    return await res.json();
  },

  clearSessions: async () => {
    await fetch('/api/admin/sessions', { method: 'DELETE' });
  },

  // Local active session management (still useful for UI state if refreshed)
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
};