import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWallets, initialTransactions } from '../src/data/mock';
import { walletBalance, validateTransfer } from '../src/lib/wallets';
test('all transactions reference wallets and balances reconcile', () => {
    assert.ok(initialTransactions.every(t => initialWallets.some(w => w.id === t.walletId)));
    assert.equal(initialWallets.reduce((sum, w) => sum + walletBalance(w, initialTransactions, []), 0), 1240000);
    assert.equal(walletBalance(initialWallets.find(w => w.id === 'gopay')!, initialTransactions, []), 160000);
});
test('expense debits only its selected wallet', () => {
    const expense = { ...initialTransactions[0], id: 'new', amount: 85000, walletId: 'dana' };
    for (const wallet of initialWallets) {
        const before = walletBalance(wallet, initialTransactions, []);
        assert.equal(walletBalance(wallet, [...initialTransactions, expense], []), before - (wallet.id === 'dana' ? 85000 : 0));
    }
});
test('transfer preserves total money and validates source funds', () => {
    const transfer = { id: 'transfer', fromId: 'bca', toId: 'gopay', amount: 100000, date: '2026-09-13' };
    assert.equal(validateTransfer('bca', 'gopay', 100000, initialWallets, initialTransactions, []), null);
    assert.equal(initialWallets.reduce((sum, w) => sum + walletBalance(w, initialTransactions, [transfer]), 0), 1240000);
    assert.equal(walletBalance(initialWallets.find(w => w.id === 'gopay')!, initialTransactions, [transfer]), 260000);
    for (const [from, to, amount] of [['bca', 'bca', 1], ['unknown', 'gopay', 1], ['bca', 'gopay', 9999999], ['bca', 'gopay', -1], ['bca', 'gopay', 1.5]] as const) {
        assert.ok(validateTransfer(from, to, amount, initialWallets, initialTransactions, []));
    }
});
