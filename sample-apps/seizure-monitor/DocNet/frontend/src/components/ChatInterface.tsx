import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';

interface ChatInterfaceProps {
  onClose: () => void;
  user: User | null;
}

interface TriageTurn {
  question: string;
  answer: string;
}

export default function ChatInterface({ onClose, user }: ChatInterfaceProps) {
  const userName = user?.user_metadata?.full_name || user?.email || 'there';
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState<TriageTurn[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    setMessages([
      { role: 'ai', text: `Hello ${userName}. I'm the DocNet triage assistant. Please briefly describe your primary symptom or reason for consultation today.` }
    ]);
  }, [userName]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isComplete) return;

    const currentInput = input;
    setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
    setInput('');
    setLoading(true);

    let currentSymptoms = symptoms;
    let currentHistory = [...history];

    if (!symptoms) {
      currentSymptoms = currentInput;
      setSymptoms(currentInput);
    } else {
      const lastAiMessage = [...messages].reverse().find(m => m.role === 'ai');
      if (lastAiMessage) {
        currentHistory.push({ question: lastAiMessage.text, answer: currentInput });
        setHistory(currentHistory);
      }
    }

    try {
      const response = await fetch('http://localhost:3005/api/triage/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: currentSymptoms,
          history: currentHistory,
          userProfile: user?.user_metadata || null,
          userId: user?.id || null,
          sessionId: sessionId
        })
      });
      const data = await response.json();

      if (!data.success) {
         setMessages(prev => [...prev, { role: 'ai', text: `Server Error: ${data.error || 'Please check the backend logs.'}` }]);
      } else if (data.isComplete) {
         setMessages(prev => [...prev, { role: 'ai', text: "Thank you for all the information. I am generating your clinical summary..." }]);
         const sumRes = await fetch('http://localhost:3005/api/triage/summary', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ symptoms: currentSymptoms, history: currentHistory, userId: user?.id })
         });
         const sumData = await sumRes.json();
         const specialty = sumData.summary?.specialty || 'General Practice';
         setMessages(prev => [...prev, { role: 'ai', text: `Triage Complete.\n\nRecommended Specialty: ${specialty}\n\nSummary: ${sumData.summary?.summary || 'N/A'}` }]);
         setIsComplete(true);
         
         try {
           const docRes = await fetch(`http://localhost:3005/api/doctors?specialty=${encodeURIComponent(specialty)}`);
           const docData = await docRes.json();
           if (docData.success && docData.doctors?.length > 0) {
             setDoctors(docData.doctors);
           }
         } catch(e) {
           console.error("Failed to fetch doctors", e);
         }
      } else {
         setMessages(prev => [...prev, { role: 'ai', text: data.nextQuestion || "Could you tell me more about that?" }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, there was an error connecting to the server. Is the backend running on port 3005?" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (doc: any, slot: string) => {
    try {
      // Hardcoded test email for debugging (bypass Supabase auth for now)
      const patientEmail = user?.email || 'test@example.com';
      const bookingPayload = {
        doctorId: doc.id,
        doctorName: doc.name,
        slot,
        userId: user?.id,
        userEmail: patientEmail,
        // Hardcoded test data to ensure email dispatch works
        testEmail: 'test@example.com',
        timestamp: new Date().toISOString()
      };

      console.log('[Frontend] 📤 Emitting on_booking_confirmed event:', bookingPayload);

      // Call backend to emit Nitro event
      const res = await fetch('http://localhost:3005/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });

      const data = await res.json();

      if (data.success) {
        console.log('[Frontend] ✅ Booking confirmed. Nitro event dispatched.');
        alert(`Booking confirmed with ${doc.name} at ${slot}!\nAn email confirmation has been triggered by Nitro.`);
      } else {
        console.error('[Frontend] ❌ Booking failed:', data.error);
        alert('Booking failed: ' + data.error);
      }
    } catch (e) {
      console.error('[Frontend] ❌ Error confirming booking:', e);
      alert('Error confirming booking: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="h-screen max-w-5xl mx-auto flex flex-col bg-primary-dark relative">
      <header className="p-8 flex justify-between items-center border-b border-primary-light/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-light/10 flex items-center justify-center text-primary-light font-serif text-2xl">D</div>
          <span className="text-primary-light font-serif text-3xl tracking-tight">DocNet Triage</span>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full flex items-center justify-center text-primary-light text-2xl hover:bg-primary-light/10 transition-colors"
        >
          &#x2715;
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-12 flex flex-col gap-8">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`max-w-[80%] px-8 py-5 rounded-[2rem] whitespace-pre-wrap ${
              msg.role === 'ai' 
                ? 'self-start bg-primary-light/5 text-primary-light rounded-tl-sm' 
                : 'self-end bg-primary-light text-primary-dark rounded-tr-sm'
            }`}
          >
            <p className="font-sans leading-relaxed text-xl">{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="self-start max-w-[80%] px-8 py-5 rounded-[2rem] bg-primary-light/5 text-primary-light/50 rounded-tl-sm">
            <p className="font-sans leading-relaxed text-xl animate-pulse">Typing...</p>
          </div>
        )}
        {doctors.length > 0 && (
          <div className="flex flex-col gap-4 mt-4 animate-fade-in">
            <h3 className="text-2xl font-serif text-primary-light">Recommended Specialists for you</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {doctors.map(doc => (
                <div key={doc.id} className="p-6 rounded-2xl bg-primary-light/5 border border-primary-light/10">
                  <h4 className="text-xl font-bold text-primary-light">{doc.name}</h4>
                  <p className="text-primary-light/70">{doc.specialty} • {doc.clinic}</p>
                  <div className="mt-2 text-yellow-400">★ {doc.rating}</div>
                  <div className="mt-4">
                    <p className="text-sm text-primary-light/50 mb-2">Available Slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {doc.available_slots?.map((slot: string, i: number) => (
                        <button 
                          key={i} 
                          onClick={() => handleBooking(doc, slot)}
                          className="px-3 py-1 text-sm rounded-full bg-primary-light/10 text-primary-light hover:bg-primary-light hover:text-primary-dark transition-colors"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-12 pt-4">
        <form 
          onSubmit={handleSend}
          className="relative max-w-4xl mx-auto flex items-center bg-primary-light/10 rounded-full p-2 pl-8 focus-within:bg-primary-light/20 transition-colors border border-primary-light/20"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || isComplete}
            placeholder={isComplete ? "Triage completed." : "Type your message..."}
            className="flex-1 bg-transparent border-none outline-none text-primary-light placeholder:text-primary-light/50 font-sans text-xl py-4 disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={loading || isComplete || !input.trim()}
            className="w-14 h-14 rounded-full bg-primary-light text-primary-dark flex items-center justify-center font-bold text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            &uarr;
          </button>
        </form>
      </div>
    </div>
  );
}
