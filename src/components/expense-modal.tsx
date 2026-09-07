'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { formatRupiah } from '@/lib/finance';
import { categories } from '@/data/mock';
import type { CategoryId, Transaction, MoneyWallet } from '@/types/finance';
export default function ExpenseModal({ onClose, onAdd, date, wallets }: {
    onClose: () => void;
    onAdd: (t: Transaction) => void;
    date: string;
    wallets: (MoneyWallet & { balance: number })[];
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [error, setError] = useState('');
    useEffect(() => { const dialog = ref.current; const previous = document.getElementById('add-expense-trigger'); dialog?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); }; }, []);
    return <dialog ref={ref} aria-label="Add Expense" className="expense-modal" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className="section-heading"><div><h2>Add Expense</h2><p>A little update. A smarter plan.</p></div><button className="icon-button" onClick={onClose} aria-label="Close add expense"><X size={20}/></button></div><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const amount = Number(f.get('amount')); const name = String(f.get('name')).trim(); const selectedDate = String(f.get('date')); if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000 || !name || selectedDate > date || selectedDate < date.slice(0, 7) + '-01') {
        setError('Enter a valid name, whole Rupiah amount, and a date in the selected demo month.');
        return;
    } const wallet = wallets.find(w => w.id === f.get('wallet')); if (!wallet || amount > wallet.balance) { setError('This wallet does not have enough funds. Choose another wallet or transfer money first.'); return; } onAdd({ id: crypto.randomUUID(), name, amount, category: f.get('category') as CategoryId, date: selectedDate, method: wallet.kind, walletId: wallet.id }); }}><label>Amount <span className="input-currency"><span>Rp</span><input autoFocus name="amount" type="number" min="1" max="100000000" step="1" defaultValue="85000" required/></span></label><label>Expense Name<input name="name" defaultValue="Coffee with friends" maxLength={80} required/></label><div className="form-grid"><label>Category<select name="category" defaultValue="entertainment">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Date<input name="date" type="date" min={date.slice(0, 7) + '-01'} max={date} defaultValue={date} required/></label></div><label>Pay from wallet<select name="wallet" defaultValue="gopay">{wallets.map(w => <option key={w.id} value={w.id}>{w.name} ? {formatRupiah(w.balance)}</option>)}</select></label><p className="form-note"><ShieldCheck size={16}/> Your protected savings stay in your plan.</p>{error && <p role="alert" className="error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Add Expense</button></div></form></dialog>;
}
