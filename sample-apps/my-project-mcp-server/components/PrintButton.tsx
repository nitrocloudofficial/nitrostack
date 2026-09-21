'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cm-button no-print"
    >
      Download case summary
    </button>
  );
}
