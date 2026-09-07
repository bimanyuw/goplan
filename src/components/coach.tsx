import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import type { Recommendation } from '@/types/finance';
import { formatRupiah } from '@/lib/finance';
import { CategoryIcon } from './ui';
export default function Coach({ category, excess, recommendations, selected, onSelect }: {
    category: string;
    excess: number;
    recommendations: Recommendation[];
    selected: Recommendation | null;
    onSelect: (r: Recommendation | null) => void;
}) {
    return <section className="coach-card"><div className="coach-heading"><Sparkles size={19}/><h2>AI Financial Coach</h2><span>ADAPTIVE</span></div><h3>{excess > 0 ? `${category} is ${formatRupiah(excess)} above its planned pace.` : 'A little planning goes a long way.'}</h3><p>Keep your monthly savings target in sight. Choose one adjustment for tomorrow.</p><div className="recommendations">{recommendations.map(r => <button key={r.id} className={`recommendation ${selected?.id === r.id ? 'selected' : ''}`} aria-pressed={selected?.id === r.id} onClick={() => onSelect(selected?.id === r.id ? null : r)}><CategoryIcon category={r.category}/><span><strong>{r.title}</strong><span className="rec-description">{r.description}</span><em>{selected?.id === r.id ? 'Adjustment applied · ' : 'Save '}{formatRupiah(r.saving)}</em></span>{selected?.id === r.id ? <Check size={17}/> : <ArrowUpRight size={17}/>}</button>)}</div><div className="tradeoff"><Sparkles size={15}/><p>{selected ? selected.tradeoff : recommendations[0].tradeoff}</p></div><small className="coach-footnote">{selected ? 'Forecast updated. Savings depend on following this plan.' : 'Rule-based guidance · Your essentials stay protected'}</small></section>;
}
