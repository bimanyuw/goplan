'use client';
import { useState } from 'react';
import { ArrowLeftRight, Banknote, CreditCard, Plus, Smartphone } from 'lucide-react';
import type { MoneyWallet, Transaction, WalletTransfer } from '@/types/finance';
import { formatRupiah } from '@/lib/finance';
import { walletBalance, validateTransfer } from '@/lib/wallets';

export default function Wallets({ wallets, transactions, transfers, onAdd, onTransfer, date }: {
    wallets: MoneyWallet[]; transactions: Transaction[]; transfers: WalletTransfer[];
    onAdd: (wallet: MoneyWallet) => void; onTransfer: (transfer: WalletTransfer) => void; date: string;
}) {
    const [action, setAction] = useState<'add' | 'transfer' | null>(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const total = wallets.reduce((sum, wallet) => sum + walletBalance(wallet, transactions, transfers), 0);
    return <div className="wallet-page">
        <section className="card wallet-summary"><div><span className="eyebrow">ALL YOUR MONEY, IN ONE PLACE</span><h2>Total wallet balance</h2><strong>{formatRupiah(total)}</strong><p>{wallets.length} wallets · Balances across all recorded dates</p></div><div className="wallet-actions"><button className="secondary-button" onClick={() => { setAction(action === 'transfer' ? null : 'transfer'); setError(''); }}><ArrowLeftRight size={16} /> Transfer</button><button className="primary-button" onClick={() => { setAction(action === 'add' ? null : 'add'); setError(''); }}><Plus size={16} /> Add Wallet</button></div></section>
        <p className="wallet-context">Wallets show where your money is. Your monthly budget sets your spending plan. Moving money between wallets does not count as spending.</p>
        {action && <section className="card wallet-form"><h2>{action === 'add' ? 'Add a wallet' : 'Transfer between wallets'}</h2><form key={action} onSubmit={e => {
            e.preventDefault(); const form = new FormData(e.currentTarget); const amount = Number(form.get('amount'));
            if (action === 'add') {
                const name = String(form.get('name')).trim();
                if (!name || wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) { setError('Give this wallet a unique name.'); return; }
                if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000) { setError('Enter an opening balance between Rp0 and Rp100.000.000.'); return; }
                onAdd({ id: crypto.randomUUID(), name, kind: form.get('kind') as MoneyWallet['kind'], openingBalance: amount });
            } else {
                const fromId = String(form.get('from')); const toId = String(form.get('to'));
                const issue = validateTransfer(fromId, toId, amount, wallets, transactions, transfers);
                if (issue) { setError(issue); return; }
                onTransfer({ id: crypto.randomUUID(), fromId, toId, amount, date });
            }
            setAction(null); setError('');
        }}>
            {action === 'add' ? <><label>Wallet name<input name="name" placeholder="e.g. BNI Debit" maxLength={40} required /></label><label>Wallet type<select name="kind"><option>Debit Card</option><option>E-wallet</option><option>Cash</option></select></label></> : <><label>From wallet<select name="from" defaultValue={wallets[0]?.id}>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} · {formatRupiah(walletBalance(w, transactions, transfers))}</option>)}</select></label><label>To wallet<select name="to" defaultValue={wallets[1]?.id}>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></>}
            <label>{action === 'add' ? 'Opening balance (Rp)' : 'Transfer amount (Rp)'}<input name="amount" type="number" min={action === 'add' ? 0 : 1} max="100000000" step="1" defaultValue={action === 'add' ? '0' : ''} required /></label>
            <p className="card-footnote">{action === 'add' ? 'Enter money already held in this wallet. This does not increase your monthly allowance. To move existing tracked money here, start at zero and use Transfer.' : 'Transfers are recorded separately from expenses. No transfer fee is assumed.'}</p>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="wallet-actions"><button type="button" className="secondary-button" onClick={() => setAction(null)}>Cancel</button><button className="primary-button" type="submit">{action === 'add' ? 'Save Wallet' : 'Confirm Transfer'}</button></div>
        </form></section>}
        <div className="wallet-grid">{wallets.map(w => { const Icon = w.kind === 'Debit Card' ? CreditCard : w.kind === 'Cash' ? Banknote : Smartphone; return <section className="card wallet-card" key={w.id}><div className="section-heading"><span className="category-icon"><Icon size={20} /></span><span className="eyebrow">{w.kind}</span></div><h2>{w.name}</h2><strong>{formatRupiah(walletBalance(w, transactions, transfers))}</strong><small>Available balance</small><button className="text-button" onClick={() => setFilter(w.id)}>View activity</button></section>; })}</div>
        <section className="card"><div className="section-heading"><div><h2>Wallet activity</h2><p>Expenses and transfers · All recorded dates</p></div><select className="wallet-filter" aria-label="Filter wallet activity" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All wallets</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            {[...transactions.filter(t => filter === 'all' || t.walletId === filter).map(t => ({ id: t.id, date: t.date, title: t.name, detail: wallets.find(w => w.id === t.walletId)?.name, amount: `−${formatRupiah(t.amount)}`, type: 'Expense' })), ...transfers.filter(t => filter === 'all' || t.fromId === filter || t.toId === filter).map(t => ({ id: t.id, date: t.date, title: `${wallets.find(w => w.id === t.fromId)?.name} → ${wallets.find(w => w.id === t.toId)?.name}`, detail: 'Internal transfer', amount: `${filter === 'all' ? '' : t.fromId === filter ? '−' : '+'}${formatRupiah(t.amount)}`, type: 'Transfer' }))].sort((a, b) => b.date.localeCompare(a.date)).map(item => <div className="transaction-row" key={item.id}><div><strong>{item.title}</strong><small>{item.detail} · {item.type}</small></div><time>{item.date}</time><strong className="transaction-amount">{item.amount}</strong></div>)}
            {!transactions.some(t => filter === 'all' || t.walletId === filter) && !transfers.some(t => filter === 'all' || t.fromId === filter || t.toId === filter) && <p className="empty-state">No activity for this wallet yet.</p>}
        </section>
    </div>;
}
