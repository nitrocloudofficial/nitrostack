import React from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  onOpenChat: () => void;
  onOpenAuth: () => void;
  user: User | null;
}

export default function Header({ onOpenChat, onOpenAuth, user }: HeaderProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-dark flex items-center justify-center">
          <span className="text-primary-light font-serif font-bold text-2xl">D</span>
        </div>
        <span className="text-text-dark font-serif font-bold text-3xl tracking-tight">DocNet</span>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-text-dark/80 font-medium">
              Welcome, {user.user_metadata.full_name || user.email}
            </span>
            <button 
              onClick={handleSignOut}
              className="px-6 py-2 rounded-full border-2 border-primary-dark/20 text-primary-dark font-medium hover:bg-primary-dark/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="px-6 py-2 rounded-full border-2 border-primary-dark/20 text-primary-dark font-medium hover:bg-primary-dark/5 transition-colors"
          >
            Sign In
          </button>
        )}
        <button 
          onClick={onOpenChat}
          className="px-8 py-3 rounded-full bg-primary-dark text-primary-light font-medium text-lg hover:opacity-90 transition-opacity"
        >
          Consult AI
        </button>
      </div>
    </header>
  );
}
