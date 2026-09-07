import type { BudgetCategory, FinancialGoal, Transaction, MoneyWallet } from '@/types/finance';
export const DEMO_DATE = '2026-09-13';
export const ALLOWANCE = 2000000;
export const goal: FinancialGoal = { name: 'A little security for tomorrow', target: 300000, saved: 150000 };
export const categories: BudgetCategory[] = [
    { id: 'food', name: 'Food', limit: 750000 }, { id: 'transport', name: 'Transportation', limit: 300000 },
    { id: 'entertainment', name: 'Entertainment', limit: 250000 }, { id: 'academic', name: 'Academic', limit: 150000 },
    { id: 'personal', name: 'Personal Needs', limit: 150000 }, { id: 'other', name: 'Other', limit: 100000 },
];
export const initialTransactions: Transaction[] = [
    { id: '1', name: 'Kopi Kenangan', category: 'entertainment', amount: 45000, date: DEMO_DATE, method: 'GoPay', walletId: 'gopay' },
    { id: '2', name: 'GoRide to Campus', category: 'transport', amount: 22000, date: DEMO_DATE, method: 'GoPay', walletId: 'gopay' },
    { id: '3', name: 'Lunch', category: 'food', amount: 28000, date: '2026-09-12', method: 'Cash', walletId: 'cash' },
    { id: '4', name: 'Photocopy & Printing', category: 'academic', amount: 12000, date: '2026-09-12', method: 'Cash', walletId: 'cash' },
    { id: '5', name: 'Campus meals · Sep 1–11', category: 'food', amount: 322000, date: '2026-09-11', method: 'Cash', walletId: 'cash' },
    { id: '6', name: 'Campus commute · Sep 1–10', category: 'transport', amount: 123000, date: '2026-09-10', method: 'GoPay', walletId: 'gopay' },
    { id: '7', name: 'Movie & weekend outings', category: 'entertainment', amount: 135000, date: '2026-09-08', method: 'Debit Card', walletId: 'bca' },
    { id: '8', name: 'Course materials', category: 'academic', amount: 53000, date: '2026-09-04', method: 'Bank Transfer', walletId: 'mandiri' },
    { id: '9', name: 'Laundry', category: 'personal', amount: 20000, date: '2026-09-03', method: 'Cash', walletId: 'cash' },
];

export const initialWallets: MoneyWallet[] = [
 { id: 'bca', name: 'BCA Debit', kind: 'Debit Card', openingBalance: 600000 },
 { id: 'mandiri', name: 'Mandiri Debit', kind: 'Debit Card', openingBalance: 400000 },
 { id: 'gopay', name: 'GoPay', kind: 'E-wallet', openingBalance: 350000 },
 { id: 'dana', name: 'DANA', kind: 'E-wallet', openingBalance: 150000 },
 { id: 'cash', name: 'Cash', kind: 'Cash', openingBalance: 500000 },
];
