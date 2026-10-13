export function PaperCardSkeleton() {
  return (
    <div className="p-7 rounded-3xl glass-card space-y-6 relative overflow-hidden">
      {/* Subtle sweeping shimmer across the card */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

      <div className="flex justify-between items-start gap-6 relative z-10">
        <div className="h-6 bg-white/5 rounded-xl w-3/4 shimmer" />
        <div className="h-6 bg-white/5 rounded-xl w-20 flex-shrink-0 shimmer" />
      </div>

      <div className="h-4 bg-white/5 rounded-xl w-1/3 shimmer relative z-10" />

      <div className="flex gap-3 relative z-10">
        <div className="h-8 bg-white/5 rounded-lg w-20 shimmer" />
        <div className="h-8 bg-white/5 rounded-lg w-28 shimmer" />
      </div>
      
      <div className="space-y-3 pt-2 relative z-10">
        <div className="h-4 bg-white/5 rounded-xl w-full shimmer" />
        <div className="h-4 bg-white/5 rounded-xl w-full shimmer" />
        <div className="h-4 bg-white/5 rounded-xl w-2/3 shimmer" />
      </div>
      
      <div className="flex gap-3 pt-6 border-t border-white/5 relative z-10">
        <div className="h-10 bg-white/5 rounded-xl w-28 shimmer" />
        <div className="h-10 bg-white/5 rounded-xl w-24 shimmer" />
      </div>
    </div>
  )
}
