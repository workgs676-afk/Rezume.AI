/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  Download,
  AlertCircle,
  Loader2,
  Trophy,
  Target,
  Zap,
  Layout,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  ExternalLink,
  History,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  Ban,
  MoreVertical,
  Save,
  User
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ai, RESUME_MODEL } from './lib/gemini';
import { SYSTEM_PROMPT, getPrompt } from './lib/prompts';
import { cn } from './lib/utils';
import { Type } from '@google/genai';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './lib/firebase-utils';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { ResumeLibrary } from './components/ResumeLibrary';
import { JobTracker } from './components/JobTracker';

interface ResumeAnalysis {
  analysisSummary: string;
  quantificationSuggestions: {
    original: string;
    suggestedMetric: string;
    rewrittenPoint: string;
  }[];
  keywordGaps: {
    keyword: string;
    priority: "high" | "medium";
    integrationSuggestion: string;
  }[];
  keyImprovements: string[];
  optimizedResume: string;
  matchScore: number;
  finalTips: string[];
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentView, setCurrentView] = useState<'optimizer' | 'library' | 'tracker'>('optimizer');
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your resume...');

  const loadingMessages = [
    'Scanning for keywords...',
    'Identifying experience gaps...',
    'Optimizing bullet points using STAR method...',
    'Checking ATS compatibility...',
    'Tailoring for job requirements...',
    'Fine-tuning your professional summary...',
    'Calculating match score...',
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setResult(null);
    setCurrentView('optimizer');
  };

  const handleSaveToLibrary = async () => {
    if (!user || !result) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'resumes'), {
        userId: user.uid,
        originalResume: resume,
        optimizedResume: result.optimizedResume,
        jobDescription: jobDescription,
        matchScore: result.matchScore,
        createdAt: serverTimestamp()
      });
      alert('Resume saved to your library!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'resumes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptimize = async () => {
    if (!resume || !jobDescription) {
      setError('Please provide both your current resume and the target job description.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      setLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
      messageIndex++;
    }, 2000);

    try {
      const prompt = getPrompt(resume, jobDescription, preferences);
      const response = await ai.models.generateContent({
        model: RESUME_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisSummary: { type: Type.STRING },
              quantificationSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    suggestedMetric: { type: Type.STRING },
                    rewrittenPoint: { type: Type.STRING }
                  },
                  required: ['original', 'suggestedMetric', 'rewrittenPoint']
                }
              },
              keywordGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    integrationSuggestion: { type: Type.STRING }
                  },
                  required: ['keyword', 'priority', 'integrationSuggestion']
                }
              },
              keyImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
              optimizedResume: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              finalTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['analysisSummary', 'quantificationSuggestions', 'keywordGaps', 'keyImprovements', 'optimizedResume', 'matchScore', 'finalTips']
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as ResumeAnalysis;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to optimize resume. Please check your data and try again.');
    } finally {
      clearInterval(messageInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const downloadResume = () => {
    if (!result) return;
    const element = document.createElement('a');
    const file = new Blob([result.optimizedResume], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = 'optimized_resume.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Rezume<span className="text-indigo-600 italic">.ai</span></span>
          </div>
          <div className="flex gap-6 items-center text-sm font-medium text-slate-500">
            <button 
              onClick={() => setCurrentView('optimizer')}
              className={cn("py-5 transition-all outline-none", currentView === 'optimizer' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-slate-900")}
            >
              Optimizer
            </button>
            <button 
              onClick={() => setCurrentView('library')}
              className={cn("py-5 transition-all outline-none hidden sm:inline", currentView === 'library' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-slate-900")}
            >
              Resume Library
            </button>
            <button 
              onClick={() => setCurrentView('tracker')}
              className={cn("py-5 transition-all outline-none hidden sm:inline", currentView === 'tracker' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-slate-900")}
            >
              Job Tracker
            </button>
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden hidden sm:block">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-2 text-slate-400" />
                  )}
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {currentView === 'optimizer' ? (
            !result ? (
              <motion.div
                key="optimizer-input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
              {/* Hero */}
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                  Tailor your resume for <span className="text-indigo-600">maximum impact.</span>
                </h1>
                <p className="text-lg text-slate-600 font-medium">
                  Upload your experience and target job. Our AI optimizes your resume for ATS compliance and professional clarity.
                </p>
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2>Your Current Resume</h2>
                  </div>
                  <textarea
                    id="resume-input"
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="Paste your resume text here..."
                    className="w-full h-80 p-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none shadow-sm text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    <h2>Target Job Description</h2>
                  </div>
                  <textarea
                    id="job-input"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job requirements here..."
                    className="w-full h-80 p-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none shadow-sm text-sm leading-relaxed"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <h2>Optional Preferences</h2>
                </div>
                <input
                  type="text"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g., Focus on my leadership roles, emphasize cloud skills..."
                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none shadow-sm"
                />
              </div>

              {/* Action */}
              <div className="flex flex-col items-center gap-4 pt-4">
                <button
                  id="optimize-btn"
                  onClick={handleOptimize}
                  disabled={isLoading || !resume || !jobDescription}
                  className={cn(
                    "px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 transition-all transform active:scale-95 shadow-lg",
                    isLoading || !resume || !jobDescription
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>Tailor My Resume</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {isLoading && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium text-indigo-600 animate-pulse"
                  >
                    {loadingMessage}
                  </motion.p>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Features list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 border-t border-slate-200">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold">ATS Keywords</h3>
                  <p className="text-sm text-slate-500">Automatically identifies and integrates relevant skills.</p>
                </div>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">STAR Method</h3>
                  <p className="text-sm text-slate-500">Rewrites achievements to showcase measurable results.</p>
                </div>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <Layout className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold">Match Score</h3>
                  <p className="text-sm text-slate-500">Know exactly how well you align with the job description.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Results Header */}
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-slate-200 pb-8">
                <div className="space-y-2">
                  <button
                    onClick={handleReset}
                    className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Back to Inputs
                  </button>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Optimization Report</h1>
                </div>
                <div className="flex items-center gap-4">
                  {user && (
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save to Library
                    </button>
                  )}
                  <button
                    onClick={downloadResume}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Download Version
                  </button>
                </div>
              </div>

              {/* Results Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar Analysis (4 columns) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Summary Card */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analysis Summary</h2>
                    <div className="prose prose-sm text-slate-600 leading-relaxed">
                      <ReactMarkdown>{result.analysisSummary}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Score Card */}
                  <div className="bg-indigo-900 rounded-xl shadow-lg p-8 text-white flex flex-col items-center justify-center text-center">
                    <div className="text-xs uppercase tracking-[0.2em] opacity-70 mb-4">ATS Match Score</div>
                    <div className="relative flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          fill="transparent"
                          stroke="white"
                          strokeWidth="8"
                          strokeDasharray={364.42}
                          strokeDashoffset={364.42 - (364.42 * result.matchScore) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <span className="absolute text-4xl font-bold">{result.matchScore}%</span>
                    </div>
                    <div className="mt-6 text-sm font-medium bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm">
                      {result.matchScore > 80 ? "Ready to Apply" : "Needs Improvement"}
                    </div>
                  </div>

                  {/* Keyword Gaps Card */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Missing Keywords</h2>
                    <div className="flex flex-wrap gap-2">
                      {result.keywordGaps.map((gap, i) => (
                        <div 
                          key={i} 
                          title={gap.integrationSuggestion}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter border",
                            gap.priority === 'high' 
                              ? "bg-red-50 text-red-600 border-red-100" 
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}
                        >
                          {gap.keyword}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Hover to see integration tips.</p>
                  </div>

                  {/* Quantification Suggestions Card */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantification Pointers</h2>
                    <div className="space-y-4">
                      {result.quantificationSuggestions.slice(0, 3).map((sug, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[11px] text-slate-400 line-through truncate">{sug.original}</p>
                          <p className="text-[11px] text-indigo-600 font-medium font-mono">Suggested Metric: {sug.suggestedMetric}</p>
                          <p className="text-[11px] text-slate-700 font-semibold italic bg-slate-50 p-2 rounded border border-slate-100">
                            "{sug.rewrittenPoint}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations Card */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Key Recommendations</h2>
                    <ul className="space-y-4">
                      {result.keyImprovements.map((improvement, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold font-mono">
                            0{i + 1}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">{improvement}</p>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Final Tips</h3>
                      <ul className="space-y-2">
                        {result.finalTips.map((tip, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-500 italic">
                            <span>•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Resume Preview (8 columns) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-slate-100 px-6 py-3 border border-slate-200 rounded-t-xl border-b-0 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Optimized Resume Preview</span>
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-2xl overflow-hidden min-h-[900px] flex flex-col">
                    <div className="p-12 sm:p-16 flex-1">
                      <div className="max-w-prose mx-auto prose prose-slate prose-sm prose-headings:font-serif prose-headings:text-slate-900 prose-headings:border-b prose-headings:border-slate-200 prose-headings:pb-2 prose-headings:mt-8 first:prose-headings:mt-0 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-indigo-600">
                        <ReactMarkdown>{result.optimizedResume}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="p-8 border-t border-slate-50 flex justify-center opacity-40">
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter italic">
                        Optimized by Rezume.ai Professional Engine v4.2
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )) : currentView === 'library' ? (
            <ResumeLibrary user={user} onSignIn={handleSignIn} setView={setCurrentView} onEdit={(r, jd) => { setResume(r); setJobDescription(jd); setCurrentView('optimizer'); }} />
          ) : (
            <JobTracker user={user} onSignIn={handleSignIn} />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 grayscale brightness-50">
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span className="text-sm font-bold uppercase tracking-widest text-slate-900">Rezume AI</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Helping you land your dream job with AI-powered optimization. © 2026 Rezume.ai
          </p>
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100"></div>
             <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
