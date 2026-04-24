import React from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, ShieldCheck, FileText, PieChart as PieChartIcon, TrendingUp, Lightbulb, CheckCircle2, XCircle, Clock, Star, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../../store';

export default function GridView() {
  const { currentResult, setActiveModal, isProcessing } = useAppStore();

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

  const pieData = [
    { name: 'Agent', value: currentResult.talkRatio?.agent || 0 },
    { name: 'Customer', value: currentResult.talkRatio?.customer || 0 },
    { name: 'Silence', value: currentResult.talkRatio?.silence || 0 },
  ];
  const COLORS = ['#3b82f6', '#a855f7', '#3f3f46'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="h-full flex flex-col gap-4 overflow-y-auto"
    >
      {/* Top Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 break-inside-avoid">
        <div 
          onClick={() => setActiveModal('sentiment')}
          title="Overall emotional tone of the call, from 0 (very negative) to 100 (very positive)."
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 flex flex-col gap-2 cursor-pointer hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><Activity size={14} /> Sentiment Score</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-500">VIEW INSIGHTS</span>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{currentResult.sentimentScore ?? '--'}/100</div>
        </div>
        
        <div 
          onClick={() => setActiveModal('risk')}
          title="Probability of compliance violation, churn, or escalation, from 0 (safe) to 100 (high risk)."
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 flex flex-col gap-2 cursor-pointer hover:border-red-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> Risk Level</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-500">VIEW INSIGHTS</span>
          </div>
          <div className={`text-3xl font-bold ${(currentResult.riskScore || 0) > 50 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
            {currentResult.riskScore ?? '--'}/100
          </div>
        </div>

        <div 
          onClick={() => setActiveModal('compliance')}
          title="Percentage of mandatory compliance checks successfully passed during the call."
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 flex flex-col gap-2 cursor-pointer hover:border-emerald-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> Compliance Score</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-500">VIEW INSIGHTS</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{currentResult.complianceScore ?? '--'}%</div>
        </div>

        <div 
          onClick={() => setActiveModal('duration')}
          title="Total length of the audio recording."
          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 flex flex-col gap-2 cursor-pointer hover:border-purple-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><FileText size={14} /> Duration</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-purple-500">VIEW INSIGHTS</span>
          </div>
          <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">{currentResult.duration || '--:--'}</div>
        </div>
      </motion.div>

      {/* Extracted Data Row */}
      {currentResult.extractedData && currentResult.extractedData.length > 0 && (
        <motion.div variants={itemVariants} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col shrink-0 break-inside-avoid">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between gap-2 text-blue-600 dark:text-blue-500 text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Database size={14} /> [ EXTRACTED_DATA_ENTITIES ]
            </div>
            {isProcessing && <Activity size={14} className="animate-pulse text-emerald-500" />}
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {currentResult.extractedData.map((data, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold truncate" title={data.field}>{data.field}</span>
                <span className="text-sm font-mono text-zinc-800 dark:text-zinc-200 truncate" title={data.value}>{data.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Custom Parameters Row */}
      {currentResult.customParametersResult && currentResult.customParametersResult.length > 0 && (
        <motion.div variants={itemVariants} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col shrink-0 break-inside-avoid">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest">
            <Star size={14} /> [ CUSTOM_PARAMETERS_EVALUATION ]
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentResult.customParametersResult.map((param, i) => (
              <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{param.name}</span>
                <span className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">{param.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Predictive Data & Summary Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 break-inside-avoid">
        <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <FileText size={14} /> [ EXECUTIVE_SUMMARY & KEY_POINTS ]
          </div>
          <div className="p-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="leading-relaxed">{currentResult.summary}</p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Key Points</h4>
              <ul className="list-disc pl-5 space-y-1">
                {currentResult.keyPoints?.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <Clock size={14} /> [ CRITICAL_MOMENTS ]
          </div>
          <div className="p-4 space-y-3 overflow-y-auto max-h-[300px]">
            {currentResult.criticalMoments?.map((moment, i) => {
              let colorClass = 'text-zinc-500';
              let bgClass = 'bg-zinc-50 dark:bg-zinc-900/50';
              if (moment.type === 'hooked') { colorClass = 'text-emerald-500'; bgClass = 'bg-emerald-50 dark:bg-emerald-500/5'; }
              if (moment.type === 'exhausted') { colorClass = 'text-amber-500'; bgClass = 'bg-amber-50 dark:bg-amber-500/5'; }
              if (moment.type === 'escalation') { colorClass = 'text-red-500'; bgClass = 'bg-red-50 dark:bg-red-500/5'; }
              if (moment.type === 'resolution') { colorClass = 'text-blue-500'; bgClass = 'bg-blue-50 dark:bg-blue-500/5'; }

              return (
                <div key={i} className={`p-3 border border-zinc-200 dark:border-zinc-800 ${bgClass} rounded-sm`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>{moment.type}</span>
                    <span className="text-xs font-mono text-zinc-500">{moment.time}</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{moment.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Do's, Don'ts & Custom Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0 break-inside-avoid">
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 size={14} /> [ IMPROVEMENTS_TO_MAKE ]
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {currentResult.improvements?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-red-600 dark:text-red-500 text-xs font-bold uppercase tracking-widest">
            <XCircle size={14} /> [ THINGS_TO_AVOID ]
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {currentResult.thingsToAvoid?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {currentResult.customInsights && currentResult.customInsights.length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col lg:col-span-1 md:col-span-2">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-purple-600 dark:text-purple-500 text-xs font-bold uppercase tracking-widest">
              <Star size={14} /> [ CUSTOM_INSIGHTS ]
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[300px]">
              {currentResult.customInsights.map((insight, i) => (
                <div key={i} className="space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-800 dark:text-zinc-200">{insight.title}</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{insight.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[300px] break-inside-avoid">
        {/* Sentiment Trend */}
        <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <TrendingUp size={14} /> [ SENTIMENT_TREND_ANALYSIS ]
          </div>
          <div className="flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentResult.sentimentTrend || []}>
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0px' }}
                  itemStyle={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '10px', marginBottom: '4px' }}
                />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981' }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Talk Ratio */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            <PieChartIcon size={14} /> [ TALK_TO_LISTEN_RATIO ]
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{currentResult.talkRatio?.agent || 0}%</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">AGENT</span>
            </div>
          </div>
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div> AGENT ({currentResult.talkRatio?.agent || 0}%)</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500"></div> CUST ({currentResult.talkRatio?.customer || 0}%)</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-600"></div> SILENCE ({currentResult.talkRatio?.silence || 0}%)</div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Lists Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 break-inside-avoid">
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            [ COMPLIANCE_FAILURES ]
          </div>
          <div className="p-4 space-y-2">
            {!currentResult.complianceResults ? (
              <div className="text-sm text-zinc-500 font-mono">Analyzing compliance...</div>
            ) : currentResult.complianceResults.filter(c => !c.passed).length === 0 ? (
              <div className="text-sm text-emerald-600 dark:text-emerald-500 font-mono">No compliance failures detected.</div>
            ) : (
              currentResult.complianceResults.filter(c => !c.passed).map((c, i) => (
                <div key={i} className="text-sm text-red-600 dark:text-red-500 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  {c.check}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
            [ KEYWORDS_DETECTED ]
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {!currentResult.matchedKeywords ? (
              <div className="text-sm text-zinc-500 font-mono">Analyzing keywords...</div>
            ) : currentResult.matchedKeywords.length === 0 ? (
              <div className="text-sm text-zinc-500 font-mono">No targeted keywords detected.</div>
            ) : (
              currentResult.matchedKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-mono uppercase tracking-widest border border-amber-200 dark:border-amber-500/20">
                  {kw}
                </span>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
