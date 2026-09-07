import type { BudgetCategory, FinancialSummary, Recommendation, Transaction } from '@/types/finance';
export const formatRupiah = (value: number) => 'Rp' + Math.round(value).toLocaleString('id-ID');
export const calculateRemainingBudget = (allowance: number, spent: number) => Math.max(0, allowance - spent);
export const calculateSafeDailySpending = (remaining: number, savings: number, days: number) => Math.max(0, Math.floor((remaining - savings) / Math.max(1, days)));
export const calculateBudgetPercentage = (spent: number, limit: number) => limit > 0 ? Math.round(spent / limit * 100) : 0;
export const calculateMonthEndForecast = (allowance: number, spent: number, elapsed: number, days: number, adjustment = 0) => Math.max(0, Math.min(allowance - spent, allowance - spent / Math.max(1, elapsed) * days + adjustment));
export function summarize(transactions: Transaction[], allowance: number, savings: number, elapsed: number, days: number, adjustment = 0): FinancialSummary {
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const remainingBudget = calculateRemainingBudget(allowance, totalSpent);
    const forecast = calculateMonthEndForecast(allowance, totalSpent, elapsed, days, adjustment);
    return { totalSpent, remainingBudget, safeDailySpending: calculateSafeDailySpending(remainingBudget, savings, days - elapsed + 1), forecast, health: Math.max(0, Math.min(100, Math.round(60 + forecast / savings * 30))) };
}
export function getCoach(categories: BudgetCategory[], transactions: Transaction[], elapsed: number, days: number) {
    const pressure = categories.map(c => ({ ...c, spent: transactions.filter(t => t.category === c.id).reduce((s, t) => s + t.amount, 0) })).filter(c => ['food', 'transport', 'entertainment'].includes(c.id)).sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];
    const excess = Math.max(0, Math.round(pressure.spent - pressure.limit * elapsed / days));
    const recommendations: Recommendation[] = pressure.id === 'food' ? [
        { id: 'meal', title: 'Set a meal budget', description: 'Plan three balanced campus meals for tomorrow.', saving: 15000, category: 'food', tradeoff: 'Keep at least Rp25.000 per day for essential meals; save on extras only.' },
        { id: 'canteen', title: 'Choose the campus canteen', description: 'Swap a delivery order for a canteen meal.', saving: 18000, category: 'food', tradeoff: 'Pickup takes a little time, but keeps your meal allowance intact.' },
        { id: 'snacks', title: 'Bring your own coffee', description: 'Skip one café visit this week.', saving: 35000, category: 'entertainment', tradeoff: 'Keep your regular meals and academic budget protected.' },
    ] : pressure.id === 'transport' ? [
        { id: 'bus', title: 'Public Transport', description: 'Take public transport instead of ride-hailing tomorrow.', saving: 18000, category: 'transport', tradeoff: 'Allow extra travel time. Keeping GoRide means finding Rp18.000 from optional spending.' },
        { id: 'walk', title: 'Walk a short trip', description: 'Walk a short, safe campus route in daylight.', saving: 12000, category: 'transport', tradeoff: 'Only choose this when distance, weather, and accessibility suit you.' },
        { id: 'rides', title: 'Combine your trips', description: 'Group errands into one ride this week.', saving: 25000, category: 'transport', tradeoff: 'A little planning preserves your essential commute budget.' },
    ] : [
        { id: 'bus', title: 'Public Transport', description: 'Take public transport instead of ride-hailing tomorrow.', saving: 18000, category: 'transport', tradeoff: 'Keeping GoRide would require Rp6.000 less in optional food extras for 3 days. Essential meals stay protected.' },
        { id: 'lunch', title: 'Budget Lunch', description: 'Keep tomorrow’s lunch below Rp20.000.', saving: 15000, category: 'food', tradeoff: 'Choose an affordable meal; keep at least Rp25.000 for total daily essential food.' },
        { id: 'entertainment', title: 'Reduce Entertainment', description: 'Skip one non-essential purchase this week.', saving: 35000, category: 'entertainment', tradeoff: 'Trade one optional purchase for more room toward your savings target.' },
    ];
    return { category: pressure.name, excess, recommendations };
}
