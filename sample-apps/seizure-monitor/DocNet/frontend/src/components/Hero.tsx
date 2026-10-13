import React from 'react';

interface HeroProps {
  onOpenChat: () => void;
}

export default function Hero({ onOpenChat }: HeroProps) {
  return (
    <section className="py-24 md:py-32 px-8 max-w-5xl mx-auto text-center flex flex-col items-center">
      <h1 className="font-serif text-5xl md:text-7xl text-text-dark mb-8 leading-tight tracking-tight">
        Intelligent Triage,<br /> Instant Guidance.
      </h1>
      <p className="font-sans text-xl text-text-dark/80 mb-12 max-w-2xl leading-relaxed">
        Experience the future of medical consultation. Our advanced AI instantly analyzes your symptoms to guide you to the right care.
      </p>
      <button 
        onClick={onOpenChat}
        className="px-8 py-5 text-xl rounded-full bg-primary-dark text-primary-light font-semibold hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-dark/20 transition-all duration-300 flex items-center gap-3"
      >
        Describe Your Symptoms
        <span className="text-2xl">&rarr;</span>
      </button>
    </section>
  );
}
