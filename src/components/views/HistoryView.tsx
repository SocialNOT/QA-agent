import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Database, Activity, Clock, ShieldCheck, AlertTriangle, Play, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';

interface CallRecord {
  id: string;
  created_at: string;
  file_names: string; // JSON string from SQLite
  duration_sec: number;
  sentiment_score: number;
  risk_score: number;
  compliance_score: number;
  summary: string;
  full_result_json: string;
  created_by: string;
}

export default function HistoryView() {
  const { setAppState, setCurrentResult, addLog, user, token } = useAppStore();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchCalls();
  }, [user, token]);

  const fetchCalls = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const res = await fetch('/api/calls', { headers: authHeaders });
      if (!res.ok) throw new Error('API Rejection');
      const data = await res.json();
      setCalls(data);
    } catch (error) {
      console.error("Failed to fetch calls from API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCall = async (call: CallRecord) => {
    try {
      addLog(`> FETCHING_HISTORICAL_CALL_RECORD [ID: ${call.id}]`);
      const result = JSON.parse(call.full_result_json);
      setCurrentResult(result);
      setAppState('forensics');
      addLog(`> HISTORICAL_CALL_LOADED_SUCCESSFULLY`);
    } catch (error) {
      console.error("Failed to load call:", error);
      addLog(`> ERROR: FAILED_TO_LOAD_HISTORICAL_CALL`);
    }
  };

  const deleteCall = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call record?')) return;
    try {
      addLog(`> DELETING_HISTORICAL_CALL_RECORD [ID: ${callId}]`);
      const res = await fetch(`/api/calls/${callId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error('API Rejection');
      setCalls(calls.filter(c => c.id !== callId));
      addLog(`> HISTORICAL_CALL_DELETED_SUCCESSFULLY`);
    } catch (error) {
      console.error("Failed to delete call from API:", error);
      addLog(`> ERROR: FAILED_TO_DELETE_HISTORICAL_CALL`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col gap-4 overflow-hidden"
    >
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 md:p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest">
          <Database size={20} />
          [ HISTORICAL_CALL_DATABASE ]
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          TOTAL_RECORDS: {calls.length}
        </div>
      </div>

      <div className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono">
            <Activity size={32} className="animate-pulse mb-4 text-emerald-500" />
            <div className="text-sm font-bold uppercase tracking-widest">QUERYING_DATABASE...</div>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono">
            <Database size={32} className="mb-4 opacity-50" />
            <div className="text-sm font-bold uppercase tracking-widest">NO_RECORDS_FOUND</div>
            <div className="text-xs mt-2 opacity-70">Analyze a call to populate the database.</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {calls.map((call) => {
              const fileNames = JSON.parse(call.file_names || '[]');
              return (
                <div 
                  key={call.id}
                  className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-500/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {fileNames.join(', ') || 'Unknown Audio'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {call.created_at ? new Date(call.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
                      {call.summary || 'No summary available.'}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex flex-col items-center" title="Duration">
                        <Clock size={14} className="text-purple-500 mb-1" />
                        <span>{formatTime(call.duration_sec)}</span>
                      </div>
                      <div className="flex flex-col items-center" title="Sentiment">
                        <Activity size={14} className="text-blue-500 mb-1" />
                        <span className={call.sentiment_score > 60 ? 'text-emerald-500' : call.sentiment_score < 40 ? 'text-red-500' : ''}>{call.sentiment_score}</span>
                      </div>
                      <div className="flex flex-col items-center" title="Risk">
                        <AlertTriangle size={14} className="text-red-500 mb-1" />
                        <span className={call.risk_score > 60 ? 'text-red-500' : ''}>{call.risk_score}</span>
                      </div>
                      <div className="flex flex-col items-center" title="Compliance">
                        <ShieldCheck size={14} className="text-emerald-500 mb-1" />
                        <span className={call.compliance_score < 100 ? 'text-amber-500' : 'text-emerald-500'}>{call.compliance_score}%</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => loadCall(call)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white dark:hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      <Play size={14} /> LOAD
                    </button>
                    <button 
                      onClick={() => deleteCall(call.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete Call"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
