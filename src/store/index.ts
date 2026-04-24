import { create } from 'zustand';

export interface EngineConfig {
  department: string;
  transcriptionModel: string;
  sentimentAnalysis: boolean;
  piiRedaction: boolean;
  automaticDataExtraction: boolean;
  keywords: string[];
  complianceChecks: string[];
  dataExtractionFields: string[];
  customPrompts: Array<{ title: string; prompt: string }>;
  customParameters: Array<{ name: string; description: string }>;
}

export interface TranscriptLine {
  id: string;
  speaker: 'Agent' | 'Customer';
  text: string;
  startTime: number;
  endTime: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  riskScore: number;
}

export interface InsightDetails {
  elaboration: string;
  steps: string[];
  dos: string[];
  donts: string[];
}

export interface CriticalMoment {
  time: string;
  description: string;
  type: 'hooked' | 'exhausted' | 'escalation' | 'resolution';
}

export interface CustomInsightResult {
  title: string;
  content: string;
}

export interface ExtractedData {
  field: string;
  value: string;
}

export interface AnalysisResult {
  fileNames: string[];
  duration: string;
  durationSec: number;
  sentimentScore: number;
  riskScore: number;
  talkRatio: { agent: number; customer: number; silence: number };
  complianceScore: number;
  transcript: TranscriptLine[];
  matchedKeywords: string[];
  complianceResults: Array<{ check: string; passed: boolean; timestamp?: string }>;
  sentimentTrend: Array<{ time: string; score: number }>;
  insights: {
    sentiment: InsightDetails;
    risk: InsightDetails;
    compliance: InsightDetails;
    duration: InsightDetails;
  };
  summary: string;
  keyPoints: string[];
  criticalMoments: CriticalMoment[];
  improvements: string[];
  thingsToAvoid: string[];
  customInsights: CustomInsightResult[];
  extractedData: ExtractedData[];
  customParametersResult: Array<{ name: string; value: string }>;
}

const defaultConfig: EngineConfig = {
  department: 'Forensics & QA',
  transcriptionModel: 'whisper-large-v3',
  sentimentAnalysis: true,
  piiRedaction: true,
  automaticDataExtraction: true,
  keywords: ['cancel', 'lawyer', 'sue', 'manager', 'ridiculous', 'discount', 'refund', 'escalate'],
  complianceChecks: ['Standard Greeting', 'Recording Consent', 'Account Verification', 'Empathy Shown', 'Resolution Offered'],
  dataExtractionFields: ['Name', 'Business Name', 'MPRN', 'MPAN', 'CED (Contract Expiry Date)', 'Consumption'],
  customPrompts: [
    { title: 'Customer Churn Probability', prompt: 'Analyze the likelihood of this customer churning in the next 30 days based on their tone and language.' }
  ],
  customParameters: [
    { name: 'Competitor Mention Details', description: 'Did the customer mention about any other supplier/broker or BOTH. In that case what customer asked and what the agent replied.' },
    { name: 'Authorization Verification', description: 'Did the agent confirmed/verified that is he/she authorized the sign or sign on behalf of the contract. Is informed did the authorized person signed the contract' }
  ]
};

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_verified: boolean;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
    config: EngineConfig;
  } | null;
}

export interface Department {
  id: string;
  name: string;
  config: EngineConfig;
  created_at: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  activeModal: 'sentiment' | 'risk' | 'compliance' | 'duration' | null;
  setActiveModal: (modal: 'sentiment' | 'risk' | 'compliance' | 'duration' | null) => void;
  appState: 'ingestion' | 'forensics' | 'history' | 'admin';
  setAppState: (state: 'ingestion' | 'forensics' | 'history' | 'admin') => void;
  activeForensicView: 'timeline' | 'document' | 'grid';
  setActiveForensicView: (view: 'timeline' | 'document' | 'grid') => void;
  config: EngineConfig;
  updateConfig: (updates: Partial<EngineConfig>) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  departments: Department[];
  setDepartments: (depts: Department[]) => void;
  currentResult: AnalysisResult | null;
  setCurrentResult: (result: AnalysisResult | null) => void;
  isProcessing: boolean;
  setProcessing: (status: boolean) => void;
  logs: string[];
  addLog: (log: string) => void;
  updateLastLog: (log: string) => void;
  clearLogs: () => void;
}

const getInitialUser = () => {
  const saved = localStorage.getItem('forensics_session');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      return data;
    } catch {
      return { user: null, token: null };
    }
  }
  return { user: null, token: null };
};

const { user: initialUser, token: initialToken } = getInitialUser();

export const useAppStore = create<AppState>((set) => ({
  user: initialUser,
  token: initialToken,
  setUser: (user, token) => {
    localStorage.setItem('forensics_session', JSON.stringify({ user, token }));
    if (user?.department?.config) {
      set({ user, token, config: user.department.config });
    } else {
      set({ user, token });
    }
  },
  logout: () => {
    localStorage.removeItem('forensics_session');
    set({ user: null, token: null, appState: 'ingestion', currentResult: null });
  },
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  isTerminalOpen: true,
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  appState: 'ingestion',
  setAppState: (state) => set({ appState: state }),
  activeForensicView: 'grid',
  setActiveForensicView: (view) => set({ activeForensicView: view }),
  config: initialUser?.department?.config || defaultConfig,
  updateConfig: (updates) => set((state) => ({ config: { ...state.config, ...updates } })),
  geminiKey: '',
  setGeminiKey: (geminiKey) => set({ geminiKey }),
  departments: [],
  setDepartments: (departments) => set({ departments }),
  currentResult: null,
  setCurrentResult: (result) => set({ currentResult: result }),
  isProcessing: false,
  setProcessing: (status) => set({ isProcessing: status }),
  logs: ['> FORENSICS ENGINE BOOT SEQUENCE INITIATED...', '> LOADING PRE-CONFIGURED QA ENGINE...', '> ENGINE READY. AWAITING AUDIO INGESTION.'],
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  updateLastLog: (log) => set((state) => {
    const newLogs = [...state.logs];
    if (newLogs.length > 0) {
      newLogs[newLogs.length - 1] = log;
    } else {
      newLogs.push(log);
    }
    return { logs: newLogs };
  }),
  clearLogs: () => set({ logs: [] }),
}));
