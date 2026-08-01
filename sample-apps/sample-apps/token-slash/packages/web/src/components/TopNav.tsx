import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Bell, 
  Settings, 
  User, 
  UserPlus, 
  ChevronDown, 
  Check, 
  Plus, 
  X, 
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface TopNavProps {
  status: 'connected' | 'analyzing' | 'offline' | 'waiting';
  currentUser: UserProfile;
  userProfiles: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onCreateUser: (newUser: { name: string; email: string; role: string }) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  status,
  currentUser,
  userProfiles,
  onSelectUser,
  onCreateUser,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New user form fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Senior AI Engineer');

  const getStatusBadge = () => {
    switch (status) {
      case 'analyzing':
        return {
          label: 'Analyzing Prompt...',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          dot: 'bg-cyan-400 animate-ping',
        };
      case 'offline':
        return {
          label: 'Offline (Mock Mode)',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'waiting':
        return {
          label: 'Waiting for Input',
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
          dot: 'bg-slate-400 animate-pulse',
        };
      case 'connected':
      default:
        return {
          label: 'MCP Server Connected',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          dot: 'bg-emerald-400 animate-pulse',
        };
    }
  };

  const badge = getStatusBadge();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    onCreateUser({
      name: newUserName.trim(),
      email: newUserEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      role: newUserRole,
    });
    setNewUserName('');
    setNewUserEmail('');
    setIsCreateModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full px-6 bg-[#0B0F14]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between transition-all">
      {/* Left: Branding */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              TokenSlash
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
              PRO
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

        <span className="text-xs font-mono text-slate-400 hidden sm:block">
          NitroStack MCP Engine v1.4
        </span>
      </div>

      {/* Middle: Search bar */}
      <div className="hidden md:flex items-center max-w-md w-full mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search prompts, history, models..."
            className="w-full bg-[#161B22]/80 border border-white/[0.06] rounded-xl pl-10 pr-12 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-[#0B0F14] border border-white/10 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: User Creation & Switcher Point */}
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        <div className={`px-3 py-1 rounded-full border flex items-center gap-2 text-xs font-mono transition-all ${badge.color}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dot}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dot}`}></span>
          </span>
          <span className="font-medium hidden sm:inline">{badge.label}</span>
        </div>

        {/* User Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl bg-[#141A24] border border-white/[0.08] hover:border-cyan-500/40 transition-all group"
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block pr-1">
              <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-mono text-slate-400 leading-tight">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-64 bg-[#141A24] border border-cyan-500/30 rounded-2xl p-2 shadow-2xl z-50 space-y-1"
              >
                <div className="px-3 py-2 border-b border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>ACTIVE USER CONTEXT</span>
                  <span className="text-cyan-400 font-bold">{currentUser.id}</span>
                </div>

                {/* Profiles List */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 py-1">
                  {userProfiles.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSelectUser(user);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                        currentUser.id === user.id
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold'
                          : 'text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-tr ${user.avatarColor} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{user.role}</div>
                        </div>
                      </div>
                      {currentUser.id === user.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>

                {/* Create User Button */}
                <div className="pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New User Profile</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141A24] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  <span>Create User Profile</span>
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">User Name / Display Name</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Abhishek Bharathi"
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. abhishek@enterprise.com"
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Role / Organization Title</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-[#0E131A] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Senior AI Engineer">Senior AI Engineer</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Product Owner">Product Owner</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono text-cyan-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Isolated MCP Context</span>
                  </div>
                  <div>
                    Creating a user profile generates a unique `userId` token to isolate history logs and ML satisfaction preferences.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-slate-300 hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
                  >
                    Create User Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
