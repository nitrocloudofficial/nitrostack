import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRelativeISO(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Seed Expenses if empty
  const expenseCount = await prisma.expense.count();
  if (expenseCount === 0) {
    console.log('Seeding initial expenses...');
    await prisma.expense.createMany({
      data: [
        { amount: 45.99,  merchant: 'Whole Foods',       category: 'groceries',     date: getRelativeISO(5),  status: 'expense', description: 'Weekly groceries' },
        { amount: 12.50,  merchant: 'Starbucks',         category: 'coffee',        date: getRelativeISO(4),  status: 'expense', description: 'Morning coffee' },
        { amount: 85.00,  merchant: 'Shell Gas Station', category: 'transport',     date: getRelativeISO(3),  status: 'expense', description: 'Fuel fillup' },
        { amount: 29.99,  merchant: 'Netflix',           category: 'entertainment', date: getRelativeISO(7),  status: 'expense', description: 'Monthly subscription' },
        { amount: 156.78, merchant: 'Target',            category: 'shopping',      date: getRelativeISO(6),  status: 'expense', description: 'Household items' },
        { amount: 65.00,  merchant: 'Uber',              category: 'transport',     date: getRelativeISO(2),  status: 'expense', description: 'Ride to airport' },
        { amount: 8.99,   merchant: 'Spotify',           category: 'entertainment', date: getRelativeISO(10), status: 'expense', description: 'Music streaming' },
        { amount: 92.45,  merchant: 'Safeway',           category: 'groceries',     date: getRelativeISO(1),  status: 'expense', description: 'Groceries' },
        { amount: 38.75,  merchant: 'Olive Garden',      category: 'dining',        date: getRelativeISO(8),  status: 'expense', description: 'Dinner with friends' },
        { amount: 125.00, merchant: 'PG&E',              category: 'utilities',     date: getRelativeISO(9),  status: 'expense', description: 'Electricity bill' },
        { amount: 15.99,  merchant: 'CVS Pharmacy',      category: 'healthcare',    date: getRelativeISO(0),  status: 'expense', description: 'Meds' },
        { amount: 72.30,  merchant: 'Chipotle',          category: 'dining',        date: getRelativeISO(1),  status: 'expense', description: 'Lunch' },
        { amount: 5000,   merchant: 'Salary Deposit',    category: 'other',         date: getRelativeISO(0),  status: 'income',  description: 'Monthly salary' },
      ]
    });
  }

  // 2. Seed Debts if empty
  const debtCount = await prisma.debt.count();
  if (debtCount === 0) {
    console.log('Seeding initial debts...');
    await prisma.debt.createMany({
      data: [
        { debtorName: 'Alex', creditorName: 'me', amount: 500, status: 'unpaid', createdAt: getRelativeISO(3) },
        { debtorName: 'me', creditorName: 'Sarah', amount: 1200, status: 'unpaid', createdAt: getRelativeISO(10) },
        { debtorName: 'Ravi', creditorName: 'me', amount: 250, status: 'unpaid', createdAt: getRelativeISO(1) },
      ]
    });
  }

  // 3. Seed Assets if empty
  const assetCount = await prisma.asset.count();
  if (assetCount === 0) {
    console.log('Seeding initial portfolio assets...');
    await prisma.asset.createMany({
      data: [
        { ticker: 'RELIANCE', name: 'Reliance Industries', type: 'stock', shares: 50, avgPrice: 2450, currentPrice: 2980 },
        { ticker: 'TCS', name: 'Tata Consultancy Services', type: 'stock', shares: 20, avgPrice: 3200, currentPrice: 3850 },
        { ticker: 'NIFTYBEES', name: 'Nippon India Nifty 50 BeES', type: 'mutual_fund', shares: 500, avgPrice: 205, currentPrice: 240 },
        { ticker: 'SGB', name: 'Sovereign Gold Bond', type: 'gold', shares: 10, avgPrice: 5900, currentPrice: 7100 },
        { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', shares: 0.05, avgPrice: 2500000, currentPrice: 5200000 },
      ]
    });
  }

  console.log('✅ Database seeding complete!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
