const price = "₹35,000 (market avg: ₹56,000)";
const priceMatches = String(price).match(/(?:₹|Rs\.?)\s*([\d,]+)/gi);
let numericPrice = 0;
let providedMarketMedian = 0;

if (priceMatches && priceMatches.length >= 1) {
  numericPrice = parseFloat(priceMatches[0].replace(/[^\d]/g, ''));
}

if (priceMatches && priceMatches.length >= 2) {
  providedMarketMedian = parseFloat(priceMatches[1].replace(/[^\d]/g, ''));
}

console.log("Price Matches:", priceMatches);
console.log("Numeric Price:", numericPrice);
console.log("Provided Market Median:", providedMarketMedian);

let estimatedMedian = providedMarketMedian;
let isDangerouslyLow = false;
if (numericPrice > 0 && numericPrice <= estimatedMedian * 0.70) {
  isDangerouslyLow = true;
}

console.log("Is Dangerously Low:", isDangerouslyLow);
