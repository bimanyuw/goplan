'use client';
import { Area, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Transaction } from '@/types/finance';
import { formatRupiah } from '@/lib/finance';
export default function SpendingChart({ transactions, elapsed, days, allowance, target, month }: {
    transactions: Transaction[];
    elapsed: number;
    days: number;
    allowance: number;
    target: number;
    month: string;
}) {
    const data = Array.from({ length: days }, (_, i) => ({ day: i + 1, actual: i < elapsed ? transactions.filter(t => Number(t.date.slice(-2)) <= i + 1).reduce((s, t) => s + t.amount, 0) : null, planned: Math.round((allowance - target) * (i + 1) / days) }));
    const spent = transactions.reduce((s, t) => s + t.amount, 0);
    const pace = Math.round((spent / ((allowance - target) * elapsed / days) - 1) * 100);
    return <section className="card chart-card"><div className="section-heading"><div><h2>Monthly Spending</h2><p>{month} · cumulative spending</p></div><span className="subtle-icon"><TrendingUp size={19}/></span></div><div className={`pace ${pace > 0 ? 'warning' : ''}`}>{pace > 0 ? `You’re spending ${pace}% faster than your recommended pace.` : 'Your spending is within the recommended pace.'}</div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%" minWidth={0}><ComposedChart data={data} margin={{ top: 16, right: 8, left: -15, bottom: 0 }}><defs><linearGradient id="spending-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.16}/><stop offset="100%" stopColor="var(--green)" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0ef"/><XAxis dataKey="day" ticks={[1, 5, 10, 15, 20, 25, days]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7a8481' }} tickFormatter={v => `${v}`}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7a8481' }} tickFormatter={v => `${v / 1000}k`}/><Tooltip labelFormatter={v => `Day ${v}`} formatter={value => formatRupiah(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#e6ebe8', fontSize: 12 }}/><Line type="monotone" dataKey="planned" isAnimationActive={false} name="Recommended Spending" stroke="#a6afab" strokeDasharray="5 5" dot={false} strokeWidth={2}/><Area type="monotone" dataKey="actual" name="Actual Spending" stroke="var(--green)" strokeWidth={3} fill="url(#spending-fill)" connectNulls={false} isAnimationActive={false}/></ComposedChart></ResponsiveContainer></div><div className="chart-legend"><span><i />Actual Spending</span><span><i className="dashed"/>Recommended Spending</span><small>Amounts in IDR</small></div></section>;
}
