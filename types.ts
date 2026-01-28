export enum AppState {
  LOGIN = 'LOGIN',
  LANDING = 'LANDING',
  CAMERA = 'CAMERA',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN'
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isListening: boolean;
  isSpeaking: boolean;
}

export interface ChatLog {
  timestamp: number;
  sender: 'user' | 'ai';
  text: string;
}

export interface SessionEvent {
  timestamp: number;
  type: 'action' | 'error';
  content: string;
}

export interface SessionRecord {
  id: string;
  username: string;
  contact?: string;
  startTime: number;
  endTime?: number;
  image?: string;
  logs: ChatLog[];
  events: SessionEvent[];
}

export interface ActiveSession {
  id: string;
  image: string;
  startTime: number;
  logs: ChatLog[];
  events: SessionEvent[];
}

export interface User {
  username: string;
  contact: string;
  role: 'student' | 'admin';
}