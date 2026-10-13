import type { Product } from '../modules/gateway/gateway.types.js';

/**
 * NovaGear catalog. Prices are in paise (₹8,499 -> 849900).
 *
 * `typicalQty` / `maxNormalQty` are what make the order-size anomaly signal
 * meaningful: 40 headsets is only suspicious relative to a SKU that normally
 * sells one at a time.
 */
export const PRODUCTS: Product[] = [
  {
    sku: 'NG-KB-01',
    name: 'Nova Mechanical Keyboard TKL',
    category: 'keyboards',
    priceMinor: 849900,
    typicalQty: 1,
    maxNormalQty: 3,
  },
  {
    sku: 'NG-KB-02',
    name: 'Nova Compact 65% Keyboard',
    category: 'keyboards',
    priceMinor: 629900,
    typicalQty: 1,
    maxNormalQty: 3,
  },
  {
    sku: 'NG-HS-01',
    name: 'NovaSound H500 Headset',
    category: 'headsets',
    priceMinor: 499900,
    typicalQty: 1,
    maxNormalQty: 4,
  },
  {
    sku: 'NG-HS-02',
    name: 'NovaSound Pro ANC Headset',
    category: 'headsets',
    priceMinor: 1299900,
    typicalQty: 1,
    maxNormalQty: 2,
  },
  {
    sku: 'NG-WC-01',
    name: 'NovaView 1080p Webcam',
    category: 'webcams',
    priceMinor: 349900,
    typicalQty: 1,
    maxNormalQty: 5,
  },
  {
    sku: 'NG-WC-02',
    name: 'NovaView 4K Streamcam',
    category: 'webcams',
    priceMinor: 999900,
    typicalQty: 1,
    maxNormalQty: 2,
  },
  {
    sku: 'NG-MS-01',
    name: 'NovaGlide Wireless Mouse',
    category: 'accessories',
    priceMinor: 279900,
    typicalQty: 1,
    maxNormalQty: 6,
  },
  {
    sku: 'NG-DK-01',
    name: 'NovaDock USB-C Hub',
    category: 'accessories',
    priceMinor: 549900,
    typicalQty: 1,
    maxNormalQty: 4,
  },
];
