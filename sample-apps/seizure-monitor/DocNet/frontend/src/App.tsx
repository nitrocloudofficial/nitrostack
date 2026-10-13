import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Hero from './components/Hero';
import ValueProposition from './components/ValueProposition';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<'chat' | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Automatically redirect to chat if they just logged in and wanted to chat
    if (user && pendingAction === 'chat') {
      setIsChatOpen(true);
      setPendingAction(null);
      setIsAuthOpen(false);
    }
  }, [user, pendingAction]);

  const openChat = () => {
    if (user) {
      setIsChatOpen(true);
    } else {
      setPendingAction('chat');
      setIsAuthOpen(true);
    }
  };
  const closeChat = () => setIsChatOpen(false);

  const openAuth = () => setIsAuthOpen(true);
  const closeAuth = () => {
    setIsAuthOpen(false);
    setPendingAction(null);
  };

  if (isChatOpen) {
    return (
      <div className="min-h-screen bg-primary-dark">
        <ChatInterface onClose={closeChat} user={user} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-light flex flex-col">
      <Header onOpenChat={openChat} onOpenAuth={openAuth} user={user} />
      <main className="flex-1">
        <Hero onOpenChat={openChat} />
        <ValueProposition />
      </main>
      <AuthModal isOpen={isAuthOpen} onClose={closeAuth} />
    </div>
  );
}

export default App;
