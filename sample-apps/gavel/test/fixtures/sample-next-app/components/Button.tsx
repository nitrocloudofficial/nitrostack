export function Button({ variant = "primary", children }: { variant?: string; children: React.ReactNode }) {
  return (
    <button variant={variant} className="px-4 py-2 bg-[#10B981] font-sans">
      {children}
    </button>
  );
}
