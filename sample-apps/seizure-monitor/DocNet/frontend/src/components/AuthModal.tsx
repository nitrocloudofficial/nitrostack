import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        if (!fullName.trim()) {
          throw new Error('Full Name is required for registration');
        }
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
           setError('Registration successful! Please check your email to verify your account before signing in.');
           return; // Don't close the modal yet
        }
        
        // Registration successful and auto-logged in
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-primary-dark w-full max-w-md p-8 rounded-3xl border border-primary-light/20 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-primary-light/60 hover:text-primary-light transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-3xl font-serif text-primary-light mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div>
              <label className="block text-primary-light/80 text-sm mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="w-full bg-primary-light/5 border border-primary-light/20 rounded-xl px-4 py-3 text-primary-light focus:outline-none focus:border-primary-light/50 transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div>
            <label className="block text-primary-light/80 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-primary-light/5 border border-primary-light/20 rounded-xl px-4 py-3 text-primary-light focus:outline-none focus:border-primary-light/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-primary-light/80 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-primary-light/5 border border-primary-light/20 rounded-xl px-4 py-3 text-primary-light focus:outline-none focus:border-primary-light/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-light text-primary-dark font-bold rounded-xl py-3 mt-4 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center text-primary-light/60 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-primary-light hover:underline font-semibold"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
