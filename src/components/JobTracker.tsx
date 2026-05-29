import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Building, 
  CheckCircle, 
  Clock, 
  Ban, 
  MoreVertical,
  Briefcase,
  Target,
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Edit2,
  X,
  LogIn
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { cn } from '../lib/utils';

interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  status: 'Interested' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected' | 'Declined';
  createdAt: any;
  updatedAt: any;
  notes?: string;
}

interface JobTrackerProps {
  user: User | null;
  onSignIn: () => void;
}

const statusConfig = {
  Interested: { color: 'bg-slate-100 text-slate-600', icon: Target },
  Applied: { color: 'bg-blue-100 text-blue-600', icon: Clock },
  Interviewing: { color: 'bg-purple-100 text-purple-600', icon: Briefcase },
  Offer: { color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  Rejected: { color: 'bg-red-100 text-red-600', icon: Ban },
  Declined: { color: 'bg-gray-100 text-gray-600', icon: X },
};

export const JobTracker: React.FC<JobTrackerProps> = ({ user, onSignIn }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newApp, setNewApp] = useState({
    companyName: '',
    jobTitle: '',
    status: 'Interested' as JobApplication['status'],
    notes: ''
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const path = 'applications';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobApplication[];
      setApplications(docs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'applications'), {
        userId: user.uid,
        ...newApp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewApp({
        companyName: '',
        jobTitle: '',
        status: 'Interested',
        notes: ''
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  const handleStatusChange = async (id: string, newStatus: JobApplication['status']) => {
    try {
      await updateDoc(doc(db, 'applications', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this application?')) return;
    try {
      await deleteDoc(doc(db, 'applications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `applications/${id}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center">
          <Calendar className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign in to track your jobs</h2>
          <p className="text-slate-500 max-w-sm">Keep track of your applications, interviews, and offers in one organized dashboard.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Job Application Tracker</h1>
          <p className="text-slate-500 text-sm">Visualize and manage your job search progress.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-indigo-200 rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Name</label>
              <input 
                required
                value={newApp.companyName}
                onChange={(e) => setNewApp({...newApp, companyName: e.target.value})}
                placeholder="Google"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Job Title</label>
              <input 
                required
                value={newApp.jobTitle}
                onChange={(e) => setNewApp({...newApp, jobTitle: e.target.value})}
                placeholder="Senior UX Designer"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initial Status</label>
              <select 
                value={newApp.status}
                onChange={(e) => setNewApp({...newApp, status: e.target.value as JobApplication['status']})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
              >
                {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit"
                className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
              >
                Create
              </button>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
            <Building className="w-8 h-8 text-emerald-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Your tracker is empty</h3>
            <p className="text-sm text-slate-500">Add your first job application to start tracking your journey.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-emerald-600 font-bold hover:underline"
          >
            Add Now →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company & Role</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Logged</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Update</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{app.companyName}</div>
                        <div className="text-xs text-slate-500">{app.jobTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <select 
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as JobApplication['status'])}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight outline-none cursor-pointer border-none",
                        statusConfig[app.status].color
                      )}
                    >
                      {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-slate-600 font-medium">
                      {app.createdAt ? app.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-slate-400 italic">
                      {app.updatedAt ? new Date(app.updatedAt.toDate()).toLocaleDateString() : 'Just now'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleDelete(app.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
