import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, UserCheck, UserX, Trash2, Activity, Database, Clock, Terminal, UserPlus, X, Lock, User as UserIcon, Settings } from 'lucide-react';
import { useAppStore } from '../../store';

export default function AdminView() {
  const { token, departments, setDepartments, config: currentStoreConfig, geminiKey, setGeminiKey } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'calls' | 'settings'>('users');
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', department_id: '' });
  
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ 
    name: '', 
    config: { ...currentStoreConfig } 
  });

  const [tempGeminiKey, setTempGeminiKey] = useState(geminiKey);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setTempGeminiKey(geminiKey);
  }, [geminiKey]);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalCalls: 0,
    averageRisk: 0
  });

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      
      const [usersRes, callsRes, deptsRes] = await Promise.all([
        fetch('/api/users', { headers: authHeaders }),
        fetch('/api/calls', { headers: authHeaders }),
        fetch('/api/departments', { headers: authHeaders })
      ]);

      const fetchedUsers = await usersRes.json();
      const fetchedCalls = await callsRes.json();
      const fetchedDepts = await deptsRes.json();

      setDepartments(fetchedDepts);

      let pendingCount = 0;
      const formattedUsers = fetchedUsers.map((u: any) => {
        if (!u.is_verified) pendingCount++;
        return u;
      });

      setUsers(formattedUsers);
      setCalls(fetchedCalls);

      setStats({
        totalUsers: fetchedUsers.length,
        pendingUsers: pendingCount,
        totalCalls: fetchedCalls.length,
        averageRisk: fetchedCalls.length > 0 
          ? Math.round(fetchedCalls.reduce((acc: number, c: any) => acc + (c.risk_score || 0), 0) / fetchedCalls.length) 
          : 0
      });

    } catch (error) {
      console.error('Failed to fetch admin data from API', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newUser)
      });
      if (!res.ok) throw new Error('Failed to create user');
      
      setIsAddingUser(false);
      setNewUser({ username: '', password: '', role: 'user', department_id: '' });
      fetchData();
    } catch (err) {
      alert('Error creating user: ' + err);
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(deptForm)
      });
      
      if (!res.ok) throw new Error('Failed to save department');
      
      setIsEditingDept(false);
      setEditingDept(null);
      fetchData();
    } catch (err) {
      alert('Error saving department: ' + err);
    }
  };

  const deleteDept = async (id: string) => {
    if (!confirm('Are you sure? Users attached to this department will lose their config.')) return;
    try {
      await fetch(`/api/departments/${id}`, { method: 'DELETE', headers: authHeaders });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const verifyUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/verify`, { method: 'PATCH', headers: authHeaders });
      if (!res.ok) throw new Error('Failed to verify');
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: true } : u));
      setStats(prev => ({ ...prev, pendingUsers: prev.pendingUsers - 1 }));
    } catch (error) {
      console.error('Failed to verify user', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const res = await fetch('/api/settings/gemini-key', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key: tempGeminiKey })
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setGeminiKey(tempGeminiKey);
      alert('Settings updated successfully');
    } catch (err) {
      alert('Error: ' + err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error('Failed to delete');
      setUsers(users.filter(u => u.id !== userId));
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col gap-4 overflow-hidden relative"
    >
      {/* Admin Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">TOTAL_AUTH_USERS</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <UserCheck size={20} className="text-emerald-500" />
            {stats.totalUsers}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">PENDING_VERIFICATION</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <Activity size={20} className={stats.pendingUsers > 0 ? "text-amber-500 animate-pulse" : "text-zinc-500"} />
            {stats.pendingUsers}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">TOTAL_FORENSIC_CALLS</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <Database size={20} className="text-blue-500" />
            {stats.totalCalls}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">SYSTEM_DEPARTMENTS</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-purple-500" />
            {departments.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 scrollbar-hide">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${activeTab === 'users' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}
        >
          [ 01_USER_MANAGEMENT ]
        </button>
        <button 
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${activeTab === 'departments' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}
        >
          [ 02_DEPARTMENT_CONTROL ]
        </button>
        <button 
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${activeTab === 'calls' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}
        >
          [ 03_FULL_SYSTEM_LOGS ]
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}
        >
          [ 04_SYSTEM_SETTINGS ]
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                  <UserIcon size={14} /> [ USER_AUTH_CONTROL ]
                </div>
                <button 
                  onClick={() => setIsAddingUser(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-3 transition-colors"
                >
                  <UserPlus size={14} /> Create User
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <Activity size={32} className="animate-pulse mb-4 text-emerald-500" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <UserX size={32} className="mb-4 opacity-50" />
                    <div className="text-sm font-bold uppercase tracking-widest">NO_ACCESS_RECORDS</div>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-emerald-500/30 transition-colors group">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-2">
                           {user.username} 
                           <span className={`px-1.5 py-0.5 text-[8px] rounded-sm ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            {user.role.toUpperCase()}
                          </span>
                          {user.department_name && (
                            <span className="px-1.5 py-0.5 text-[8px] rounded-sm bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold">
                              DEPT: {user.department_name.toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 mt-1 truncate tracking-tighter opacity-70">
                          ID: {user.id} | CREATED: {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!user.is_verified && (
                          <button 
                            onClick={() => verifyUser(user.id)}
                            className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                          >
                            VERIFY
                          </button>
                        )}
                        <button 
                          onClick={() => deleteUser(user.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          disabled={user.id === 'root-admin'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'departments' && (
            <motion.div 
              key="departments"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-500">
                  <Database size={14} /> [ DEPARTMENT_CONFIG_REGISTRY ]
                </div>
                <button 
                  onClick={() => {
                    setEditingDept(null);
                    setDeptForm({ name: '', config: { ...currentStoreConfig } });
                    setIsEditingDept(true);
                  }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-3 transition-colors"
                >
                  <Activity size={14} /> Create Department
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">{dept.name}</h4>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono opacity-60">
                          <span>KEYWORDS: {dept.config.keywords.length}</span>
                          <span>COMPLIANCE: {dept.config.complianceChecks.length}</span>
                          <span>FIELDS: {dept.config.dataExtractionFields.length}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptForm({ name: dept.name, config: dept.config });
                            setIsEditingDept(true);
                          }}
                          className="px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                        >
                          EDIT_CONFIG
                        </button>
                        <button 
                          onClick={() => deleteDept(dept.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50 py-12">
                    <Activity size={32} className="mb-4" />
                    <div className="text-sm font-bold uppercase tracking-widest">NO_DEPARTMENTS_DEFINED</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'calls' && (
            <motion.div 
              key="calls"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500">
                  <Terminal size={14} /> [ GLOBAL_SYSTEM_TRAFFIC ]
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[10px]">
                {calls.map((call, i) => (
                  <div key={i} className="p-3 border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-zinc-800 dark:text-zinc-200 font-bold">CALL_{call.id.substring(0,8)}</span>
                       <span className="text-zinc-400">{new Date(call.created_at).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 uppercase opacity-70">
                      <div>AGENT: {call.agent_name || 'N/A'}</div>
                      <div>DEPT: {call.department_name || 'N/A'}</div>
                      <div>RISK: {Math.round(call.risk_score)}%</div>
                      <div>SENTIMENT: {call.sentiment_score}</div>
                    </div>
                  </div>
                ))}
                {!isLoading && calls.length === 0 && <div className="text-center mt-10 opacity-40 uppercase tracking-widest">NO_RECENT_ACTIVITY</div>}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">
                  <Settings size={14} /> [ GLOBAL_SYSTEM_PARAMETERS ]
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="max-w-xl space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Google Gemini API Key</label>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        value={tempGeminiKey}
                        onChange={(e) => setTempGeminiKey(e.target.value)}
                        placeholder="Paste your Gemini API key here..."
                        className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 italic">
                      This key will be used system-wide for all forensic analysis pipelines. Ensure you have sufficient quotas on your Google AI Studio account.
                    </p>
                  </div>

                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-3 px-6 transition-all disabled:opacity-50"
                  >
                    {isSavingSettings ? <Activity size={14} className="animate-pulse" /> : <ShieldCheck size={14} />}
                    COMMIT_SYSTEM_CHANGES
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals... */}
      <AnimatePresence>
        {isAddingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <UserPlus size={16} /> NESTED_USER_GENERATION
                </h3>
                <button onClick={() => setIsAddingUser(false)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Agent Username</label>
                  <div className="relative">
                    <UserIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      required
                      value={newUser.username}
                      onChange={e => setNewUser({...newUser, username: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-emerald-500/5 border border-zinc-200 dark:border-emerald-500/20 pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="agent_username"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Access Key (Password)</label>
                  <div className="relative">
                    <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="password" 
                      required
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-emerald-500/5 border border-zinc-200 dark:border-emerald-500/20 pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Permissions Tier</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full bg-zinc-50 dark:bg-emerald-500/5 border border-zinc-200 dark:border-emerald-500/20 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="user">USER_GATEWAY (Limited)</option>
                    <option value="admin">ADMIN_GATEWAY (Full Control)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Department Binding</label>
                  <select 
                    required
                    value={newUser.department_id}
                    onChange={e => setNewUser({...newUser, department_id: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-emerald-500/5 border border-zinc-200 dark:border-emerald-500/20 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">SELECT_DEPARTMENT</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-3 mt-4 transition-all"
                >
                  INITIALIZE_USER_CREDENTIALS
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isEditingDept && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
                  <Database size={16} /> {editingDept ? 'UPDATE_DEPARTMENT_CONFIG' : 'CREATE_NEW_DEPARTMENT'}
                </h3>
                <button onClick={() => setIsEditingDept(false)} className="text-zinc-400 hover:text-purple-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveDept} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Department Name</label>
                      <input 
                        type="text" 
                        required
                        value={deptForm.name}
                        onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="e.g. Sales, Support, Collections"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Keywords (comma separated)</label>
                      <textarea 
                        value={deptForm.config.keywords.join(', ')}
                        onChange={e => setDeptForm({
                          ...deptForm, 
                          config: { ...deptForm.config, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) }
                        })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] font-mono h-20 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Compliance Checks (comma separated)</label>
                      <textarea 
                        value={deptForm.config.complianceChecks.join(', ')}
                        onChange={e => setDeptForm({
                          ...deptForm, 
                          config: { ...deptForm.config, complianceChecks: e.target.value.split(',').map(k => k.trim()).filter(k => k) }
                        })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] font-mono h-20 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Data Extraction Fields (comma separated)</label>
                      <textarea 
                        value={deptForm.config.dataExtractionFields.join(', ')}
                        onChange={e => setDeptForm({
                          ...deptForm, 
                          config: { ...deptForm.config, dataExtractionFields: e.target.value.split(',').map(k => k.trim()).filter(k => k) }
                        })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] font-mono h-20 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase text-zinc-500 tracking-widest">Custom Parameters (JSON Format - name/description)</label>
                      <textarea 
                        value={JSON.stringify(deptForm.config.customParameters, null, 2)}
                        onChange={e => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setDeptForm({
                              ...deptForm, 
                              config: { ...deptForm.config, customParameters: parsed }
                            });
                          } catch (err) {}
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[10px] font-mono h-32 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      <div className="text-[10px] text-zinc-500 italic mt-1">Format: [&#123; "name": "...", "description": "..." &#125;]</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditingDept(false)}
                    className="flex-1 border border-zinc-200 dark:border-zinc-800 text-zinc-500 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    CANCEL_ACTION
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest py-3 transition-all"
                  >
                    COMMIT_DEPARTMENT_STATE
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
