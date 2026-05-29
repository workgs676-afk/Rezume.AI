import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Trash2, 
  ChevronRight, 
  Plus, 
  Loader2, 
  Calendar, 
  History,
  Target,
  Trophy,
  Download,
  AlertCircle,
  LogIn
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';

interface Resume {
  id: string;
  originalResume: string;
  optimizedResume: string;
  jobDescription: string;
  matchScore: number;
  createdAt: any;
}

interface ResumeLibraryProps {
  user: User | null;
  onSignIn: () => void;
  setView: (view: 'optimizer' | 'library' | 'tracker') => void;
  onEdit: (resume: string, jobDescription: string) => void;
}

export const ResumeLibrary: React.FC<ResumeLibraryProps> = ({ user, onSignIn, setView, onEdit }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const path = 'resumes';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resume[];
      setResumes(docs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await deleteDoc(doc(db, 'resumes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resumes/${id}`);
    }
  };

  const downloadResume = (resumeText: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([resumeText], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center">
          <History className="w-10 h-10 text-indigo-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign in to view your library</h2>
          <p className="text-slate-500 max-w-sm">Save your optimized resumes and access them anywhere, anytime.</p>
        </div>
        <button 
          onClick={onSignIn}
          className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
        >
          <LogIn className="w-5 h-5" />
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Your Resume Library</h1>
          <p className="text-slate-500 text-sm">Manage all your tailored resume versions.</p>
        </div>
        <button 
          onClick={() => setView('optimizer')}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Resume
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Loading library...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">No saved resumes yet</h3>
            <p className="text-sm text-slate-500">Run an optimization to save your first resume to the library.</p>
          </div>
          <button 
            onClick={() => setView('optimizer')}
            className="text-indigo-600 font-bold hover:underline"
          >
            Start Optimizing →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <motion.div 
              key={resume.id}
              layout
              className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</div>
                    <div className={cn(
                      "text-xl font-black",
                      resume.matchScore > 80 ? "text-emerald-500" : resume.matchScore > 60 ? "text-blue-500" : "text-amber-500"
                    )}>
                      {resume.matchScore}%
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 line-clamp-1">Tailored Resume</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {resume.createdAt?.toDate ? resume.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Target className="w-3 h-3" />
                    Target Job
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 italic">
                    {resume.jobDescription}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => handleDelete(resume.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadResume(resume.optimizedResume, `optimized_resume_${resume.id}.md`)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onEdit(resume.originalResume, resume.jobDescription)}
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:border-indigo-600 transition-all flex items-center gap-1"
                  >
                    Load
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
