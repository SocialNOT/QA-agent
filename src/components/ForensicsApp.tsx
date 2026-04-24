import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Activity, FileAudio, LayoutGrid, FileText, Clock, Sun, Moon, ChevronDown, ChevronUp, X, CheckCircle2, AlertTriangle, Lightbulb, ShieldCheck, Database, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../store';
import AnalyzeView from './AnalyzeView';
import GridView from './views/GridView';
import DocumentView from './views/DocumentView';
import TimelineView from './views/TimelineView';
import HistoryView from './views/HistoryView';
import AdminView from './views/AdminView';

export default function ForensicsApp() {
  const { 
    appState, 
    setAppState, 
    activeForensicView, 
    setActiveForensicView, 
    logs, 
    currentResult,
    theme,
    toggleTheme,
    isTerminalOpen,
    toggleTerminal,
    activeModal,
    setActiveModal,
    isProcessing,
    user,
    logout
  } = useAppStore();
  const { token, setGeminiKey } = useAppStore();
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetch('/api/settings/gemini-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.key) setGeminiKey(data.key);
      })
      .catch(err => console.error('Failed to fetch gemini key', err));
    }
  }, [token, setGeminiKey]);

  useEffect(() => {
    if (isTerminalOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isTerminalOpen]);

  const getModalContent = () => {
    if (!currentResult || !activeModal) return null;
    const insight = currentResult.insights?.[activeModal];
    if (!insight) return null;

    let title = '';
    let icon = null;
    let colorClass = '';

    switch (activeModal) {
      case 'sentiment':
        title = 'Sentiment Analysis Insights';
        icon = <Activity className="text-blue-500" />;
        colorClass = 'text-blue-500';
        break;
      case 'risk':
        title = 'Risk Assessment Insights';
        icon = <AlertTriangle className="text-red-500" />;
        colorClass = 'text-red-500';
        break;
      case 'compliance':
        title = 'Compliance Audit Insights';
        icon = <ShieldCheck className="text-emerald-500" />;
        colorClass = 'text-emerald-500';
        break;
      case 'duration':
        title = 'Talk Ratio & Duration Insights';
        icon = <FileText className="text-purple-500" />;
        colorClass = 'text-purple-500';
        break;
    }

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col font-sans"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-zinc-800 dark:text-zinc-200">
            {icon}
            {title}
          </div>
          <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="space-y-2">
            <h3 className={`font-bold uppercase tracking-widest flex items-center gap-2 ${colorClass}`}>
              <Lightbulb size={16} /> Elaboration
            </h3>
            <p className="leading-relaxed">{insight.elaboration}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Recommended Steps</h3>
            <ul className="list-disc pl-5 space-y-1">
              {insight.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded border border-emerald-100 dark:border-emerald-500/20">
              <h3 className="font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} /> Do's
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-emerald-800 dark:text-emerald-300">
                {insight.dos.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="space-y-2 bg-red-50 dark:bg-red-500/5 p-4 rounded border border-red-100 dark:border-red-500/20">
              <h3 className="font-bold uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Don'ts
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-red-800 dark:text-red-300">
                {insight.donts.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="flex flex-col h-screen w-full bg-zinc-50 dark:bg-black text-zinc-800 dark:text-zinc-300 font-mono overflow-hidden transition-colors duration-300">
        {/* Header Tabs */}
        <header className="flex-none border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300">
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest text-sm">
              <Terminal size={18} />
              <span>BPO_FORENSICS_NODE_v4.0</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 md:hidden text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <div className="flex gap-2 min-w-max">
              <button 
                onClick={() => setAppState('ingestion')} 
                className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                  appState === 'ingestion' 
                    ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                }`}
              >
                <FileAudio size={14} />
                [01_INGESTION]
              </button>
              
              <button 
                onClick={() => setAppState('history')} 
                className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                  appState === 'history' 
                    ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                }`}
              >
                <Database size={14} />
                [02_HISTORY]
              </button>
              
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setAppState('admin')} 
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                    appState === 'admin' 
                      ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                  }`}
                >
                  <ShieldCheck size={14} />
                  [03_ADMIN]
                </button>
              )}
              
              {(currentResult || isProcessing) && (
                <>
                  <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block"></div>
                  
                  <button 
                    onClick={() => { setAppState('forensics'); setActiveForensicView('grid'); }} 
                    className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                      appState === 'forensics' && activeForensicView === 'grid'
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    [GRID_VIEW]
                  </button>
                  
                  <button 
                    onClick={() => { setAppState('forensics'); setActiveForensicView('document'); }} 
                    className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                      appState === 'forensics' && activeForensicView === 'document'
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                    }`}
                  >
                    <FileText size={14} />
                    [DOC_VIEW]
                  </button>
                  
                  <button 
                    onClick={() => { setAppState('forensics'); setActiveForensicView('timeline'); }} 
                    className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                      appState === 'forensics' && activeForensicView === 'timeline'
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                    }`}
                  >
                    <Clock size={14} />
                    [TIME_VIEW]
                  </button>
                </>
              )}
            </div>

            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors hidden md:flex shrink-0 ml-auto"
              title="Save as Document / Print"
            >
              <FileText size={14} />
              [ PRINT_REPORT ]
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => toggleTheme()}
                className="p-2 hidden md:block text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <button 
              onClick={logout}
              className="p-2 hidden md:block text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden bg-zinc-50 dark:bg-black p-2 md:p-4 transition-colors duration-300">
          {appState === 'ingestion' ? (
            <AnalyzeView />
          ) : appState === 'history' ? (
            <HistoryView />
          ) : appState === 'admin' ? (
            <AdminView />
          ) : (
            <>
              {activeForensicView === 'grid' && <GridView />}
              {activeForensicView === 'document' && <DocumentView />}
              {activeForensicView === 'timeline' && <TimelineView />}
            </>
          )}
        </main>

        {/* Bottom Module: Live Event Bus */}
        <footer className={`flex-none border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col transition-all duration-300 ${isTerminalOpen ? 'h-40 md:h-48' : 'h-10'}`}>
          <div 
            className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black p-1.5 px-4 flex items-center justify-between cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors h-10 shrink-0"
            onClick={toggleTerminal}
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
              <Activity size={12} className={isTerminalOpen ? "animate-pulse" : ""} />
              [ LIVE_EVENT_BUS_TERMINAL ]
            </div>
            <div className="text-zinc-500">
              {isTerminalOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </div>
          
          {isTerminalOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs font-mono">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-400 dark:text-zinc-600 shrink-0">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
                  <span className={
                    log.includes('ERROR') ? 'text-red-600 dark:text-red-500' : 
                    log.includes('OK') || log.includes('COMPLETE') ? 'text-emerald-600 dark:text-emerald-500' : 
                    'text-zinc-700 dark:text-zinc-400'
                  }>
                    {log}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </footer>

        {/* Footer Credit */}
        <div className="flex-none border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 no-print">
          Made with <span className="text-red-500 text-xs inline-block animate-pulse">❤️</span> by{' '}
          <a 
            href="https://www.eastindiaautomation.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-text hover:opacity-80 transition-opacity"
          >
            Rajib Singh
          </a>
        </div>

        {/* Insights Modal */}
        <AnimatePresence>
          {activeModal && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            >
              {getModalContent()}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
