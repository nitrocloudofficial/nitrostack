export function formatPaise(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN');
}
