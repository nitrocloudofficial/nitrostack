export function Modal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black/50">Modal Content</div>;
}
