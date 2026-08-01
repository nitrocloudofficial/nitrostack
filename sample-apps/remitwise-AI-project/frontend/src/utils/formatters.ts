export const formatCurrency = (
  amount: number,
  currencyCode: string = 'USD',
  symbol: string = '$'
): string => {
  if (isNaN(amount)) return `${symbol}0.00`;

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (currencyCode === 'INR') return `₹${formatted}`;
    if (currencyCode === 'USD') return `$${formatted}`;
    if (currencyCode === 'EUR') return `€${formatted}`;
    if (currencyCode === 'GBP') return `£${formatted}`;
    if (currencyCode === 'AED') return `AED ${formatted}`;

    return `${symbol}${formatted}`;
  } catch (e) {
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const formatPercent = (val: number): string => {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

export const formatTimestamp = (date: Date = new Date()): string => {
  return date.toTimeString().split(' ')[0];
};
