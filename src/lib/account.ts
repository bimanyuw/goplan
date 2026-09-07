export const POLICY_VERSION = '2026-09-07';
export const MAX_MONEY = 100_000_000;
export const CATEGORY_NAMES = {
  food: 'Makan & minum', transport: 'Transportasi', entertainment: 'Hiburan',
  academic: 'Kuliah', personal: 'Kebutuhan pribadi', other: 'Lainnya',
} as const;
export type Category = keyof typeof CATEGORY_NAMES;
export interface AccountWallet { id: string; name: string; kind: 'cash' | 'bank' | 'ewallet'; opening_balance: number }
export interface Entry { id: string; kind: 'expense' | 'income' | 'transfer'; wallet_id: string; to_wallet_id: string | null; category: Category | null; name: string; amount: number; date: string }
export interface Plan { month: string; allowance: number; savings_target: number; goal_name: string; goal_saved: number; category_limits: Record<Category, number> }
export interface Profile { user_id: string; policy_version: string; consent_at: string; created_at: string }
export interface AccountData { profile: Profile; wallets: AccountWallet[]; entries: Entry[]; plans: Plan[] }
export const emptyLimits = (): Record<Category, number> => ({ food: 0, transport: 0, entertainment: 0, academic: 0, personal: 0, other: 0 });
export function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function newPlan(month: string): Plan {
  return { month: month + '-01', allowance: 0, savings_target: 0, goal_name: '', goal_saved: 0, category_limits: emptyLimits() };
}
export function balance(wallet: AccountWallet, entries: Entry[]) {
  return entries.reduce((sum, e) => sum + (e.to_wallet_id === wallet.id ? e.amount : 0)
    + (e.wallet_id === wallet.id ? (e.kind === 'income' ? e.amount : -e.amount) : 0), wallet.opening_balance);
}
export function monthlySummary(data: AccountData, month: string, today = todayJakarta()) {
  const plan = data.plans.find(p => p.month.startsWith(month)) ?? newPlan(month);
  const entries = data.entries.filter(e => e.date.startsWith(month));
  const spent = entries.filter(e => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = entries.filter(e => e.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const cash = data.wallets.reduce((s, w) => s + balance(w, data.entries), 0);
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const current = month === today.slice(0, 7);
  const elapsed = current ? Number(today.slice(-2)) : days;
  const remaining = plan.allowance - spent;
  // This is a planning estimate. A wallet is a manual record, not a bank balance.
  const safeDaily = current && plan.allowance > 0 ? Math.max(0, Math.floor((Math.min(remaining, cash) - plan.savings_target) / (days - elapsed + 1))) : null;
  const forecast = plan.allowance > 0 && entries.some(e => e.kind === 'expense') ? Math.round(plan.allowance - spent / elapsed * days) : null;
  return { plan, entries, spent, income, cash, remaining, safeDaily, forecast, days, elapsed, current };
}
export function money(value: FormDataEntryValue | null, allowZero = false) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) throw new Error('Masukkan nominal Rupiah bulat tanpa titik atau koma.');
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1) || amount > MAX_MONEY) throw new Error('Nominal harus antara ' + (allowZero ? '0' : '1') + ' dan 100.000.000 Rupiah.');
  return amount;
}
