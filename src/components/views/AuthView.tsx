import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, User as UserIcon, Lock, Activity, AlertTriangle, Mail, Database } from 'lucide-react';
import { useAppStore } from '../../store';

export default function AuthView() {
  const { setUser } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to fetch departments', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body = isLogin 
        ? { username: email, password }
        : { username: email, password, department_id: departmentId };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Authentication failed');

        if (isLogin) {
          setUser(data.user, data.token);
        } else {
          setMessage(data.message || 'Registration successful. Please wait for admin approval.');
          setIsLogin(true);
        }
      } else {
        // Handle non-JSON response (deployment routing error)
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Cloud Error (${response.status}): The API might be misconfigured. Please check server logs.`);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-900 dark:text-zinc-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-2xl p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={32} className="text-emerald-600 dark:text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Call Forensics</h1>
          <p className="text-sm text-zinc-500 font-mono mt-2 uppercase tracking-widest text-center">
            {isLogin ? 'Secure Access Portal' : 'Agent Access Request'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex flex-col gap-3 text-red-600 dark:text-red-400 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {message && (
          <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Username / Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors dark:text-white"
                  placeholder="System credentials"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors dark:text-white"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Target Department</label>
                <div className="relative">
                  <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <select 
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors dark:text-white appearance-none"
                    required
                  >
                    <option value="">Select a Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Activity size={16} className="animate-pulse" /> : null}
              {isLogin ? 'Authenticate' : 'Request Access'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center pt-6 border-t border-zinc-100 dark:border-zinc-900">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
            className="text-xs text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono uppercase tracking-widest transition-colors"
          >
            {isLogin ? 'Need an account?' : 'Return to Login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
