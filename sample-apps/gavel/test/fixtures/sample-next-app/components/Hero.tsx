import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="p-8 bg-[#0F172A]">
      <motion.h1 animate={{ opacity: 1 }} className="text-4xl text-[#6366F1]">
        Welcome to Dashboard
      </motion.h1>
      <img src="/hero-banner.png" className="w-full rounded-lg" />
      <button className="px-4 py-2 bg-[#6366F1] text-white rounded">
        Get Started
      </button>
      <div onClick={() => console.log("clicked")} className="cursor-pointer">
        Non-interactive div clicker
      </div>
    </section>
  );
}
