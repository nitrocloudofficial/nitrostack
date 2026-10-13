import React from 'react';

export default function ValueProposition() {
  const features = [
    {
      title: "Immediate Analysis",
      description: "No waiting rooms. Get instant, clinical-grade analysis of your symptoms anytime, anywhere."
    },
    {
      title: "Expert Matching",
      description: "Our AI identifies the precise specialist you need, ensuring you get the right care on the first try."
    },
    {
      title: "Secure & Private",
      description: "Your health data is anonymized, secured, and processed with the highest privacy standards."
    }
  ];

  return (
    <section className="py-24 px-8 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-3 gap-12">
        {features.map((feature, idx) => (
          <div key={idx} className="flex flex-col items-center text-center p-12 rounded-[3rem] bg-white shadow-xl shadow-black/5 border border-black/5 hover:-translate-y-2 transition-transform duration-300">
            <h3 className="font-serif text-2xl text-text-dark mb-4">{feature.title}</h3>
            <p className="font-sans text-lg text-text-dark/70 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
