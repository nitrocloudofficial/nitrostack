export interface Bank {
  bankId: string;
  bankName: string;
  aaProvider: 'setu' | 'finvu' | 'onemoney';
}

export const SUPPORTED_BANKS: Bank[] = [
  {
    bankId: 'sbi',
    bankName: 'State Bank of India',
    aaProvider: 'setu',
  },
  {
    bankId: 'hdfc',
    bankName: 'HDFC Bank',
    aaProvider: 'finvu',
  },
  {
    bankId: 'icici',
    bankName: 'ICICI Bank',
    aaProvider: 'finvu',
  },
  {
    bankId: 'axis',
    bankName: 'Axis Bank',
    aaProvider: 'onemoney',
  },
  {
    bankId: 'kotak',
    bankName: 'Kotak Mahindra Bank',
    aaProvider: 'setu',
  },
  {
    bankId: 'pnb',
    bankName: 'Punjab National Bank',
    aaProvider: 'onemoney',
  },
];
