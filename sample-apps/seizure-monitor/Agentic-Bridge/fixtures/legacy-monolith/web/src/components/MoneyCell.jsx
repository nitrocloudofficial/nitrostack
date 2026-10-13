import React from 'react';
/** All currency in Aurora is stored in cents and rendered through this component. */
export default function MoneyCell({ cents, currency = 'USD' }) {
  return <span className="font-mono">{(cents / 100).toFixed(2)} {currency}</span>;
}
