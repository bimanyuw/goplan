import type { MoneyWallet, Transaction, WalletTransfer } from '@/types/finance';

export function walletBalance(wallet: MoneyWallet, transactions: Transaction[], transfers: WalletTransfer[]) {
    return wallet.openingBalance
        - transactions.filter(t => t.walletId === wallet.id).reduce((s, t) => s + t.amount, 0)
        + transfers.reduce((s, t) => s + (t.toId === wallet.id ? t.amount : 0) - (t.fromId === wallet.id ? t.amount : 0), 0);
}

export function validateTransfer(fromId: string, toId: string, amount: number, wallets: MoneyWallet[], transactions: Transaction[], transfers: WalletTransfer[]) {
    const source = wallets.find(w => w.id === fromId);
    if (!source || !wallets.some(w => w.id === toId)) return 'Choose two valid wallets.';
    if (fromId === toId) return 'Choose a different destination wallet.';
    if (!Number.isSafeInteger(amount) || amount <= 0) return 'Enter a positive whole Rupiah amount.';
    if (amount > walletBalance(source, transactions, transfers)) return 'This wallet does not have enough funds.';
    return null;
}
