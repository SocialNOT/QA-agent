import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, MessageSquare, Play, Pause, FastForward, Rewind, Volume2, VolumeX, User, Headphones } from 'lucide-react';
import { useAppStore } from '../../store';

export default function TimelineView() {
  const { currentResult, isProcessing } = useAppStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentResult) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= (currentResult.durationSec || 135)) {
            setIsPlaying(false);
            return currentResult.durationSec || 135;
          }
          return prev + 0.1; // Update every 100ms
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentResult]);

  // Auto-scroll to active line
  useEffect(() => {
    if (isPlaying && activeLineRef.current && transcriptRef.current && !isDragging) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, isPlaying, isDragging]);

  // Global mouse events for drag scrubbing
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && waveformRef.current && currentResult) {
        const rect = waveformRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const ratio = x / rect.width;
        const totalDuration = currentResult.durationSec || 135;
        setCurrentTime(ratio * totalDuration);
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, currentResult]);

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

  const totalDuration = currentResult.durationSec || 135;

  // Generate fake waveform bars
  const waveformBars = Array.from({ length: 150 }, (_, i) => {
    const timeRatio = i / 150;
    const timeInSec = timeRatio * totalDuration;
    
    const activeLine = currentResult.transcript.find(t => timeInSec >= t.startTime && timeInSec <= t.endTime);
    
    let color = 'bg-zinc-300 dark:bg-zinc-700';
    let height = Math.random() * 30 + 10;

    if (activeLine) {
      height = Math.random() * 50 + 40;
      if (activeLine.sentiment === 'negative') color = 'bg-red-500';
      else if (activeLine.sentiment === 'positive') color = 'bg-emerald-500';
      else color = activeLine.speaker === 'Agent' ? 'bg-blue-500' : 'bg-purple-500';
    }

    return { height, color, timeInSec };
  });

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    setCurrentTime(ratio * totalDuration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeek(e);
  };

  // Generate markers for critical moments, compliance, and risk
  const markers: Array<{ time: number; type: string; color: string; label: string }> = [];
  
  if (currentResult.transcript) {
    currentResult.transcript.forEach(line => {
      if (line.riskScore >= 70) {
        markers.push({ time: line.startTime, type: 'risk', color: 'bg-red-500', label: `High Risk (${line.riskScore})` });
      }
      if (line.sentiment === 'positive') {
        markers.push({ time: line.startTime, type: 'positive', color: 'bg-emerald-500', label: 'Positive Sentiment' });
      }
    });
  }

  if (currentResult.complianceResults) {
    currentResult.complianceResults.forEach(comp => {
      if (!comp.passed && comp.timestamp && comp.timestamp !== 'Not mentioned') {
        const parts = comp.timestamp.split(':');
        if (parts.length === 2) {
          const timeInSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (!isNaN(timeInSec)) {
            markers.push({ time: timeInSec, type: 'compliance', color: 'bg-amber-500', label: `Compliance Flag: ${comp.check}` });
          }
        }
      }
    });
  }

  if (currentResult.criticalMoments) {
    currentResult.criticalMoments.forEach(cm => {
      if (cm.time && cm.time !== 'Not mentioned') {
        const parts = cm.time.split(':');
        if (parts.length === 2) {
          const timeInSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (!isNaN(timeInSec)) {
            markers.push({ time: timeInSec, type: 'critical', color: 'bg-purple-500', label: cm.description });
          }
        }
      }
    });
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightTextTimeline = (text: string, keywords: string[], isActive: boolean) => {
    if (!keywords || keywords.length === 0) return text;
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${sortedKeywords.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(pattern);
    
    return parts.map((part, i) => {
      const isMatch = sortedKeywords.some(kw => kw.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <span key={i} className={`px-1 rounded-sm mx-0.5 font-bold ${isActive ? 'bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-300' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-600'}`}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col gap-6 overflow-hidden"
    >
      {/* Top Panel: Timeline & Waveform */}
      <div className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col p-4 md:p-6 gap-4 shrink-0">
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            [ TEMPORAL_ANALYSIS_WAVEFORM ]
          </div>
          <span className="text-zinc-500 font-mono">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
        </div>

        <div 
          ref={waveformRef}
          className="h-24 md:h-32 flex items-end gap-0.5 md:gap-1 relative w-full cursor-pointer group" 
          onMouseDown={handleMouseDown}
        >
          {waveformBars.map((bar, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-t-sm transition-all duration-200 ${bar.color} ${currentTime >= bar.timeInSec ? 'opacity-100' : 'opacity-40'}`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
          
          {/* Markers */}
          {markers.map((marker, i) => (
            <div
              key={`marker-${i}`}
              className={`absolute top-0 w-1.5 h-1.5 rounded-full ${marker.color} z-10 shadow-sm transition-transform hover:scale-150 cursor-help`}
              style={{ left: `${(marker.time / totalDuration) * 100}%`, transform: 'translateX(-50%)' }}
              title={marker.label}
            />
          ))}

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-20 pointer-events-none transition-all duration-75"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between mt-2">
          {/* Volume Control */}
          <div className="flex items-center gap-2 w-32">
            <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (Number(e.target.value) > 0) setIsMuted(false);
              }}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Rewind size={20} />
            </button>
            <button 
              onClick={() => {
                if (currentTime >= totalDuration) setCurrentTime(0);
                setIsPlaying(!isPlaying);
              }}
              className="w-12 h-12 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <button 
              onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 10))}
              className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <FastForward size={20} />
            </button>
          </div>
          
          <div className="w-32 text-right text-[10px] text-zinc-500 dark:text-zinc-600 font-mono uppercase tracking-widest hidden md:block">
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </div>
        </div>
      </div>

      {/* Bottom Panel: Synced Transcript */}
      <div className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest shrink-0">
          <MessageSquare size={14} />
          [ SYNCED_TRANSCRIPT_FEED ]
        </div>
        <div ref={transcriptRef} className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 text-sm font-mono scroll-smooth">
          {!currentResult.transcript ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 font-mono">
              <Activity size={24} className="animate-pulse mb-2 text-emerald-500" />
              <div className="text-xs uppercase tracking-widest">Generating Transcript...</div>
            </div>
          ) : (
            currentResult.transcript.map((line, i) => {
              const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
              const isPast = currentTime > line.endTime;
              
              return (
                <div 
                  key={i} 
                  ref={isActive ? activeLineRef : null}
                  className={`flex gap-3 md:gap-4 p-3 border-l-2 transition-all duration-300 cursor-pointer break-inside-avoid ${
                    isActive 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-zinc-900 dark:text-zinc-200 shadow-sm dark:shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' 
                      : isPast 
                        ? 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50' 
                        : 'border-transparent text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                  onClick={() => {
                    setCurrentTime(line.startTime);
                    setIsPlaying(true);
                  }}
                >
                  <div className="w-12 md:w-16 text-xs pt-1 shrink-0 opacity-70">
                    {formatTime(line.startTime)}
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold uppercase tracking-widest mb-1 text-[10px] flex items-center gap-1 ${
                      isActive ? (line.speaker === 'Agent' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400') : 'opacity-50'
                    }`}>
                      {line.speaker === 'Agent' ? <Headphones size={10} /> : <User size={10} />}
                      &lt;{line.speaker}&gt;
                    </div>
                    <div className="leading-relaxed">
                      {highlightTextTimeline(line.text, currentResult.matchedKeywords || [], isActive)}
                    </div>
                    {line.riskScore > 50 && (
                      <div className="mt-2 text-[10px] text-red-600 dark:text-red-500 flex items-center gap-1 uppercase tracking-widest font-bold">
                        <AlertTriangle size={12} /> [ HIGH_RISK_DETECTED: {line.riskScore} ]
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
