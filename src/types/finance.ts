export type CategoryId = 'food' | 'transport' | 'entertainment' | 'academic' | 'personal' | 'other';
export interface BudgetCategory {
    id: CategoryId;
    name: string;
    limit: number;
}
export interface Transaction {
    id: string;
    name: string;
    category: CategoryId;
    amount: number;
    date: string;
    method: string;
    walletId: string;
}
export interface MoneyWallet {
    id: string;
    name: string;
    kind: 'Debit Card' | 'E-wallet' | 'Cash';
    openingBalance: number;
}
export interface WalletTransfer {
    id: string;
    fromId: string;
    toId: string;
    amount: number;
    date: string;
}
export interface Recommendation {
    id: string;
    title: string;
    description: string;
    saving: number;
    category: CategoryId;
    tradeoff: string;
}
export interface FinancialGoal {
    name: string;
    target: number;
    saved: number;
}
export interface FinancialSummary {
    totalSpent: number;
    remainingBudget: number;
    safeDailySpending: number;
    forecast: number;
    health: number;
}
