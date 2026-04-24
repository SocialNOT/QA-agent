import React from 'react';
import { motion } from 'motion/react';
import { FileAudio, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, User, Headphones, Activity } from 'lucide-react';
import { useAppStore } from '../../store';

export default function DocumentView() {
  const { currentResult, isProcessing } = useAppStore();

  if (!currentResult && isProcessing) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 font-mono">
        <Activity size={48} className="animate-pulse mb-4 text-emerald-500" />
        <div className="text-sm font-bold uppercase tracking-widest mb-2">ANALYZING_AUDIO_STREAMS...</div>
        <div className="text-xs opacity-70">PLEASE WAIT WHILE THE AI ENGINE EXTRACTS INSIGHTS</div>
      </div>
    );
  }

  if (!currentResult) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) return text;
    
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${sortedKeywords.map(escapeRegExp).join('|')})`, 'gi');
    
    const parts = text.split(pattern);
    
    return parts.map((part, i) => {
      const isMatch = sortedKeywords.some(kw => kw.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark key={i} className="bg-amber-200 text-amber-900 px-1 rounded-sm font-bold shadow-sm">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden"
    >
      {/* Left Panel: The Document */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-[#f5f5f0] border border-zinc-200 dark:border-zinc-300 shadow-xl flex flex-col overflow-hidden text-zinc-900 font-serif min-h-[500px] lg:min-h-0 shrink-0 lg:shrink">
        <div className="border-b border-zinc-200 dark:border-zinc-300 bg-zinc-50 dark:bg-white p-6 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Forensic Audit Report</h1>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>
          <div className="text-sm text-zinc-600 flex items-center gap-4 font-sans">
            <span><strong>File:</strong> {currentResult.fileNames?.join(', ') || '...'}</span>
            <span><strong>Duration:</strong> {currentResult.duration || '--:--'}</span>
            <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 text-base leading-relaxed bg-white dark:bg-[#f5f5f0]">
          {!currentResult.transcript ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 font-mono">
              <Activity size={24} className="animate-pulse mb-2 text-emerald-500" />
              <div className="text-xs uppercase tracking-widest">Generating Transcript...</div>
            </div>
          ) : (
            currentResult.transcript.map((line, i) => (
              <div key={i} className="flex gap-3 md:gap-4 group break-inside-avoid">
                <div className="w-12 md:w-16 text-xs text-zinc-400 font-mono pt-1 shrink-0 select-none">
                  {formatTime(line.startTime)}
                </div>
                <div className="flex-1">
                  <div className={`font-bold mr-2 font-sans text-sm flex items-center gap-1.5 mb-1 ${line.speaker === 'Agent' ? 'text-blue-700' : 'text-purple-700'}`}>
                    {line.speaker === 'Agent' ? <Headphones size={14} /> : <User size={14} />}
                    {line.speaker}:
                  </div>
                  <span className="text-zinc-800">
                    {highlightText(line.text, currentResult.matchedKeywords || [])}
                  </span>
                  {line.sentiment !== 'neutral' && (
                    <span className={`ml-2 text-[10px] font-sans uppercase tracking-widest px-1.5 py-0.5 rounded-full ${line.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {line.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Audit Checklist */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0 lg:shrink overflow-y-visible lg:overflow-y-auto">
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 flex flex-col gap-4 break-inside-avoid shrink-0">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-sm font-bold uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <ShieldCheck size={16} />
            [ COMPLIANCE_AUDIT ]
          </div>
          <div className="space-y-4">
            {!currentResult.complianceResults ? (
              <div className="text-xs text-zinc-500 font-mono">Analyzing compliance...</div>
            ) : (
              currentResult.complianceResults.map((check, i) => (
                <div key={i} className="flex items-start justify-between break-inside-avoid">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 font-mono uppercase tracking-widest">{check.check}</span>
                    {check.timestamp && (
                      <span className="text-[10px] text-zinc-500 font-mono mt-1">Found at: {check.timestamp}</span>
                    )}
                  </div>
                  {check.passed ? (
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 flex flex-col gap-4 break-inside-avoid">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm font-bold uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <AlertTriangle size={16} />
            [ RISK_ASSESSMENT ]
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Overall Risk Score</span>
            <span className={`text-2xl font-bold ${(currentResult.riskScore || 0) > 50 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
              {currentResult.riskScore ?? '--'}/100
            </span>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-2 leading-relaxed">
            {(currentResult.riskScore || 0) > 50 
              ? "> HIGH_RISK_DETECTED. Escalation language and compliance failures present. Immediate review required."
              : "> LOW_RISK. Call meets standard operating procedures."}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
