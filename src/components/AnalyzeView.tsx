import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Play, Settings, ShieldCheck, MessageSquare, FileAudio, TerminalSquare, Plus, Trash2, X, Database } from 'lucide-react';
import { useAppStore } from '../store';
import { GoogleGenAI, Type } from '@google/genai';
import { jsonrepair } from 'jsonrepair';

export default function AnalyzeView() {
  const { config, updateConfig, setCurrentResult, addLog, updateLastLog, setAppState, isProcessing, setProcessing, token, user, geminiKey } = useAppStore();
  const [files, setFiles] = useState<File[]>([]);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomPrompt, setNewCustomPrompt] = useState('');
  const [newParamName, setNewParamName] = useState('');
  const [newParamDesc, setNewParamDesc] = useState('');

  const isAdmin = user?.role === 'admin';

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
      addLog(`> FILES_LOADED: ${newFiles.map((f: File) => f.name).join(', ')}`);
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomPrompt = () => {
    if (newCustomTitle && newCustomPrompt) {
      updateConfig({
        customPrompts: [...config.customPrompts, { title: newCustomTitle, prompt: newCustomPrompt }]
      });
      setNewCustomTitle('');
      setNewCustomPrompt('');
      addLog(`> CUSTOM_PROMPT_ADDED: ${newCustomTitle}`);
    }
  };

  const removeCustomPrompt = (index: number) => {
    const newPrompts = [...config.customPrompts];
    newPrompts.splice(index, 1);
    updateConfig({ customPrompts: newPrompts });
  };

  const addCustomParameter = () => {
    if (newParamName && newParamDesc) {
      updateConfig({
        customParameters: [...config.customParameters, { name: newParamName, description: newParamDesc }]
      });
      setNewParamName('');
      setNewParamDesc('');
      addLog(`> CUSTOM_PARAMETER_ADDED: ${newParamName}`);
    }
  };

  const removeCustomParameter = (index: number) => {
    const newParams = [...config.customParameters];
    newParams.splice(index, 1);
    updateConfig({ customParameters: newParams });
  };

  const simulateProgress = async (taskName: string, duration: number) => {
    addLog(`> ${taskName} [0%]`);
    const steps = 10;
    const stepDuration = duration / steps;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      const percentage = i * 10;
      const bar = '#'.repeat(i) + '.'.repeat(steps - i);
      updateLastLog(`> ${taskName} [${bar}] ${percentage}%`);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    addLog(`> INITIATING_FORENSIC_PIPELINE [FILES: ${files.length}]`);
    addLog(`> ASR_MODEL_SELECTED: ${config.transcriptionModel}`);
    
    // Immediately transition to forensics view
    setAppState('forensics');
    
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey || process.env.GEMINI_API_KEY });

      await simulateProgress('UPLOADING_AUDIO_STREAMS', 500); // Reduced delay

      const audioParts = await Promise.all(files.map(async (file) => {
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = error => reject(error);
        });
        return {
          inlineData: {
            mimeType: file.type || 'audio/mp3',
            data: base64Audio,
          },
        };
      }));

      const customPromptsText = config.customPrompts.map(p => `- ${p.title}: ${p.prompt}`).join('\n');
      const customParamsText = config.customParameters.map(p => `- ${p.name}: ${p.description}`).join('\n');

      const prompt = `
        You are an expert audio forensics AI. Analyze the provided audio file(s), which may represent one or multiple sequential calls between an Agent and a Customer.
        Department Context: ${config.department}
        Keywords to spot: ${config.keywords.join(', ')}
        Compliance checks to evaluate: ${config.complianceChecks.join(', ')}

        Provide a detailed transcript with accurate timestamps (in seconds), speaker identification ('Agent' or 'Customer'), sentiment per utterance ('positive', 'neutral', or 'negative'), and risk scores (0-100). If there are multiple files, treat them as a continuous interaction and continue the timestamps accordingly.
        Calculate overall metrics including talk ratio (agent vs customer vs silence percentages), overall sentiment score (0-100), overall risk score (0-100), and an overall compliance score (0-100).
        Also provide a sentiment trend over time (e.g., every 10-15 seconds).
        Generate actionable insights for each of the 4 main metrics (sentiment, risk, compliance, duration/talk ratio). For each, provide an elaboration, recommended steps, do's, and don'ts.
        
        Additionally, provide:
        1. A concise summary of the call(s).
        2. Key points discussed.
        3. Critical moments: Identify specific times where the customer was "hooked" (engaged/positive), "exhausted" (frustrated/tired), an "escalation" occurred, or a "resolution" was reached.
        4. Improvements: Bullet points on what the agent could do better.
        5. Things to avoid: Bullet points on what the agent should avoid doing in the future.
        
        Extract the following specifically requested data points if mentioned during the interaction: ${config.dataExtractionFields.join(', ')}. 
        ${config.automaticDataExtraction ? "Additionally, automatically identify and extract any other highly relevant or important data points mentioned in the call (e.g., account numbers, dates, monetary amounts, specific product names, addresses, confirmation numbers, contact details)." : ""}
        For all extracted data, provide a clear 'field' name and the extracted 'value'. If a specifically requested data point is not mentioned, set its value to "Not mentioned".
        
        Evaluate these custom parameters based on the call:
        ${customParamsText}
        For each custom parameter, provide the 'name' and the evaluated 'value' based on your analysis.

        Finally, address these custom insights requested by the user:
        ${customPromptsText}
      `;

      const insightSchema = {
        type: Type.OBJECT,
        properties: {
          elaboration: { type: Type.STRING },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          dos: { type: Type.ARRAY, items: { type: Type.STRING } },
          donts: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          durationSec: { type: Type.NUMBER, description: "Total duration of the audio in seconds" },
          sentimentScore: { type: Type.NUMBER, description: "Overall sentiment score from 0 to 100" },
          riskScore: { type: Type.NUMBER, description: "Overall risk score from 0 to 100" },
          complianceScore: { type: Type.NUMBER, description: "Overall compliance score from 0 to 100" },
          talkRatio: {
            type: Type.OBJECT,
            properties: {
              agent: { type: Type.NUMBER },
              customer: { type: Type.NUMBER },
              silence: { type: Type.NUMBER }
            }
          },
          extractedData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                field: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          },
          customParametersResult: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          },
          matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          complianceResults: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                check: { type: Type.STRING },
                passed: { type: Type.BOOLEAN },
                timestamp: { type: Type.STRING, description: "Formatted time like '00:00' if passed" }
              }
            }
          },
          criticalMoments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "Formatted time like '00:00'" },
                description: { type: Type.STRING },
                type: { type: Type.STRING, description: "'hooked', 'exhausted', 'escalation', or 'resolution'" }
              }
            }
          },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          thingsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
          customInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          },
          insights: {
            type: Type.OBJECT,
            properties: {
              sentiment: insightSchema,
              risk: insightSchema,
              compliance: insightSchema,
              duration: insightSchema
            }
          },
          sentimentTrend: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "Formatted time like '0:00'" },
                score: { type: Type.NUMBER, description: "Sentiment score at this time (0-100)" }
              }
            }
          },
          transcript: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                speaker: { type: Type.STRING, description: "'Agent' or 'Customer'" },
                text: { type: Type.STRING },
                startTime: { type: Type.NUMBER, description: "Start time in seconds" },
                endTime: { type: Type.NUMBER, description: "End time in seconds" },
                sentiment: { type: Type.STRING, description: "'positive', 'neutral', or 'negative'" },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskScore: { type: Type.NUMBER, description: "Risk score for this specific utterance (0-100)" }
              }
            }
          }
        }
      };

      addLog(`> CONNECTING_TO_GEMINI_API...`);
      
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview", // Using faster model for streaming
        contents: { parts: [...audioParts, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      addLog(`> ANALYZING_AND_GENERATING_INSIGHTS...`);
      
      let fullText = '';
      let finalJson = null;
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          try {
            const repaired = jsonrepair(fullText);
            const partialJson = JSON.parse(repaired);
            
            const formatTimeStr = (seconds: number) => {
              const mins = Math.floor(seconds / 60);
              const secs = Math.floor(seconds % 60);
              return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            };

            partialJson.fileNames = files.map(f => f.name);
            partialJson.duration = formatTimeStr(partialJson.durationSec || 0);
            
            setCurrentResult(partialJson);
            finalJson = partialJson;
          } catch (e) {
            // Ignore parse errors for intermediate chunks
          }
        }
      }

      // Save to backend
      if (finalJson && token) {
        try {
          addLog(`> SAVING_CALL_TO_DATABASE...`);
          
          const formattedResult = {
            ...finalJson,
            id: crypto.randomUUID(),
            file_names: files.map(f => f.name),
            duration_sec: finalJson.durationSec || 0,
            sentiment_score: finalJson.sentimentScore || 0,
            risk_score: finalJson.riskScore || 0,
            compliance_score: finalJson.complianceScore || 0,
            full_result_json: JSON.stringify(finalJson)
          };
          
          const response = await fetch('/api/calls', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formattedResult)
          });

          if (!response.ok) throw new Error('Backend rejection');
          
          addLog(`> CALL_SAVED_SUCCESSFULLY`);
        } catch (dbError) {
          console.error("Failed to save call to Backend:", dbError);
          addLog(`> WARNING: FAILED_TO_SAVE_CALL_TO_DATABASE`);
        }
      }

      updateLastLog(`> PARSING_RESULTS [##########] 100%`);
      addLog(`> FORENSIC_ANALYSIS_COMPLETE. SWITCHING_TO_INVESTIGATION_MODE...`);
    } catch (error) {
      console.error("Analysis Error:", error);
      addLog(`> ERROR: ANALYSIS_FAILED [${error instanceof Error ? error.message : 'Unknown Error'}]`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col lg:flex-row gap-4 h-full overflow-y-auto lg:overflow-hidden"
    >
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/2 flex flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black min-h-[500px] lg:min-h-0">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2 flex items-center justify-between gap-2 text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={14} />
            [ ENGINE_CONFIGURATION ]
          </div>
          {!isAdmin && user?.department && (
            <div className="bg-emerald-500 text-black px-2 py-0.5 rounded-sm text-[10px]">
              DEPT: {user.department.name.toUpperCase()}
            </div>
          )}
        </div>
        
        {!isAdmin && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest text-center">
            [ READ_ONLY_DEPARTMENT_ENFORCEMENT_ACTIVE ]
          </div>
        )}

        <div className="flex-1 p-4 overflow-y-auto space-y-6 text-xs text-emerald-700 dark:text-emerald-400/80">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="uppercase tracking-widest block opacity-70">TARGET_DEPARTMENT</label>
              <input 
                type="text" 
                readOnly={!isAdmin}
                value={config.department}
                onChange={(e) => updateConfig({ department: e.target.value })}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <label className="uppercase tracking-widest block opacity-70">TRANSCRIPTION_MODEL</label>
              <select 
                disabled={!isAdmin}
                value={config.transcriptionModel}
                onChange={(e) => updateConfig({ transcriptionModel: e.target.value })}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <option value="whisper-base">whisper-base (Fast)</option>
                <option value="whisper-small">whisper-small (Balanced)</option>
                <option value="whisper-large-v3">whisper-large-v3 (Accurate)</option>
              </select>
            </div>

            <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} /> SENTIMENT_ANALYSIS
              </div>
              <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  className="sr-only peer" 
                  checked={config.sentimentAnalysis}
                  onChange={(e) => updateConfig({ sentimentAnalysis: e.target.checked })}
                />
                <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-400 after:border after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white dark:peer-checked:after:bg-black"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} /> PII_REDACTION
              </div>
              <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  className="sr-only peer" 
                  checked={config.piiRedaction}
                  onChange={(e) => updateConfig({ piiRedaction: e.target.checked })}
                />
                <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-400 after:border after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white dark:peer-checked:after:bg-black"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-2">
              <div className="flex items-center gap-2">
                <Database size={14} /> AUTO_DATA_EXTRACTION
              </div>
              <label className={`relative inline-flex items-center ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input 
                  type="checkbox" 
                  disabled={!isAdmin}
                  className="sr-only peer" 
                  checked={config.automaticDataExtraction}
                  onChange={(e) => updateConfig({ automaticDataExtraction: e.target.checked })}
                />
                <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-400 after:border after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white dark:peer-checked:after:bg-black"></div>
              </label>
            </div>

            <div className="space-y-1">
              <label className="uppercase tracking-widest block opacity-70">TARGET_KEYWORDS (CSV)</label>
              <textarea 
                readOnly={!isAdmin}
                value={config.keywords.join(', ')}
                onChange={(e) => updateConfig({ keywords: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <label className="uppercase tracking-widest block opacity-70">COMPLIANCE_CHECKS (CSV)</label>
              <textarea 
                readOnly={!isAdmin}
                value={config.complianceChecks.join(', ')}
                onChange={(e) => updateConfig({ complianceChecks: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>
            
            <div className="space-y-1">
              <label className="uppercase tracking-widest block opacity-70">DATA_EXTRACTION_FIELDS (CSV)</label>
              <textarea 
                readOnly={!isAdmin}
                value={config.dataExtractionFields.join(', ')}
                onChange={(e) => updateConfig({ dataExtractionFields: e.target.value.split(',').map(s => s.trim()) })}
                rows={2}
                className={`w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Custom Parameters Section */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
            <label className="uppercase tracking-widest block opacity-70 text-emerald-600 dark:text-emerald-500 font-bold">CUSTOM_PARAMETERS_ENGINE</label>
            
            <div className="space-y-2">
              {config.customParameters.map((param, index) => (
                <div key={index} className="flex items-start justify-between gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex-1">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{param.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{param.description}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => removeCustomParameter(index)} className="text-red-500 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="space-y-2 border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
                <input 
                  type="text" 
                  placeholder="Parameter Name (e.g., Competitor Mention)"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 p-2 focus:border-emerald-500 outline-none"
                />
                <textarea 
                  placeholder="Description / Question to answer..."
                  value={newParamDesc}
                  onChange={(e) => setNewParamDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 p-2 focus:border-emerald-500 outline-none resize-none"
                />
                <button 
                  onClick={addCustomParameter}
                  disabled={!newParamName || !newParamDesc}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={14} /> ADD_PARAMETER
                </button>
              </div>
            )}
          </div>

          {/* Custom Prompts Section */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
            <label className="uppercase tracking-widest block opacity-70 text-emerald-600 dark:text-emerald-500 font-bold">CUSTOM_INSIGHT_CARDS</label>
            
            <div className="space-y-2">
              {config.customPrompts.map((prompt, index) => (
                <div key={index} className="flex items-start justify-between gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex-1">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{prompt.title}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{prompt.prompt}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => removeCustomPrompt(index)} className="text-red-500 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="space-y-2 border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
                <input 
                  type="text" 
                  placeholder="Card Title (e.g., Churn Risk)"
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 p-2 focus:border-emerald-500 outline-none"
                />
                <textarea 
                  placeholder="Prompt (e.g., Analyze the likelihood of churn...)"
                  value={newCustomPrompt}
                  onChange={(e) => setNewCustomPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 p-2 focus:border-emerald-500 outline-none resize-none"
                />
                <button 
                  onClick={addCustomPrompt}
                  disabled={!newCustomTitle || !newCustomPrompt}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={14} /> ADD_CUSTOM_CARD
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload & Process Panel */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4 min-h-[500px] lg:min-h-0">
        <div 
          className={`flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col items-center justify-center text-center p-4 transition-colors relative overflow-hidden ${
            files.length > 0 ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5' : 'hover:border-emerald-500/30 cursor-pointer'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => document.getElementById('audio-upload')?.click()}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
          <input type="file" id="audio-upload" className="hidden" accept="audio/*" multiple onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
          
          {files.length > 0 ? (
            <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 w-full max-w-md">
              <FileAudio size={40} className="mb-2" />
              <div className="text-sm font-bold tracking-widest mb-4">FILES_READY [{files.length}]</div>
              <div className="w-full space-y-2 max-h-[200px] overflow-y-auto px-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-emerald-500/30 p-2 text-xs">
                    <span className="truncate mr-2">{f.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="opacity-70">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                      <button 
                        onClick={(e) => removeFile(i, e)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[10px] opacity-70 uppercase tracking-widest">CLICK_OR_DRAG_TO_ADD_MORE</div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-zinc-400 dark:text-zinc-500">
              <Upload size={40} className="mb-2 opacity-50" />
              <div className="text-sm font-bold tracking-widest text-zinc-500 dark:text-zinc-400">AWAITING_AUDIO_INPUT</div>
              <div className="text-[10px] mt-1 uppercase tracking-widest">DRAG_&_DROP OR CLICK_TO_BROWSE</div>
              <div className="text-[10px] mt-2 opacity-50">[ MP3, WAV, FLAC | MULTIPLE FILES SUPPORTED ]</div>
            </div>
          )}
        </div>

        <button 
          onClick={handleAnalyze}
          disabled={files.length === 0 || isProcessing}
          className={`h-16 flex items-center justify-center gap-2 border text-sm font-bold uppercase tracking-widest transition-all ${
            files.length === 0 || isProcessing 
              ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed' 
              : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:text-black shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          }`}
        >
          {isProcessing ? (
            <><TerminalSquare size={16} className="animate-pulse" /> EXECUTING_PIPELINE...</>
          ) : (
            <><Play size={16} /> [ EXECUTE_ANALYSIS ]</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
