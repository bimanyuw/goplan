import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categories, initialTransactions, ALLOWANCE, goal } from '../src/data/mock';
import { calculateSafeDailySpending, calculateMonthEndForecast, getCoach, summarize } from '../src/lib/finance';
test('seed ledger and plan reconcile to allowance', () => {
    const s = summarize(initialTransactions, ALLOWANCE, goal.target, 13, 30);
    assert.equal(s.totalSpent, 760000);
    assert.equal(s.remainingBudget, 1240000);
    assert.equal(categories.reduce((sum, c) => sum + c.limit, 0) + goal.target, ALLOWANCE);
    assert.equal(s.safeDailySpending, Math.floor(940000 / 18));
});
test('expense affects spending, remaining, safe daily amount and projection', () => {
    const before = summarize(initialTransactions, ALLOWANCE, goal.target, 13, 30);
    const after = summarize([...initialTransactions, { id: 'new', name: 'Coffee', category: 'entertainment', amount: 85000, date: '2026-09-13', method: 'GoPay', walletId: 'cash' }], ALLOWANCE, goal.target, 13, 30);
    assert.equal(after.totalSpent, 845000);
    assert.equal(after.remainingBudget, 1155000);
    assert.ok(after.safeDailySpending < before.safeDailySpending);
    assert.ok(after.forecast < before.forecast);
});
test('planned adjustment changes forecast, never actual cash', () => {
    const before = summarize(initialTransactions, ALLOWANCE, goal.target, 13, 30);
    const after = summarize(initialTransactions, ALLOWANCE, goal.target, 13, 30, 18000);
    assert.equal(after.forecast, before.forecast + 18000);
    assert.equal(after.totalSpent, before.totalSpent);
    assert.equal(after.remainingBudget, before.remainingBudget);
});
test('overspending and exhausted months never produce negative capacities', () => {
    assert.equal(calculateSafeDailySpending(1000, 300000, 0), 0);
    assert.equal(calculateMonthEndForecast(2000000, 2500000, 13, 30, 18000), 0);
});
test('coach reacts to category pressure with protected tradeoffs', () => {
    assert.equal(getCoach(categories, initialTransactions, 13, 30).category, 'Entertainment');
    for (const category of ['food', 'transport'] as const) {
        const result = getCoach(categories, [...initialTransactions, { id: 'high', name: 'High spend', category, amount: 1000000, date: '2026-09-13', method: 'Cash', walletId: 'cash' }], 13, 30);
        assert.equal(result.category, category === 'food' ? 'Food' : 'Transportation');
        assert.equal(result.recommendations.length, 3);
        assert.ok(result.recommendations.every(r => r.tradeoff && r.category !== 'academic'));
    }
});
