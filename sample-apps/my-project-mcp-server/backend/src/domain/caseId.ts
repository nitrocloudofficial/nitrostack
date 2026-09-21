// Matches the format the frontend already generates client-side in
// app/hospital/page.tsx (`generateCaseId`) so IDs look consistent
// regardless of which side minted them.
export function generateCaseId(): string {
  const now = Date.now();
  return `CM-${now.toString(36).toUpperCase().slice(-6)}`;
}
