import { BookOpen, Bus, Coffee, Film, MoreHorizontal, ShoppingBag } from 'lucide-react';
import type { CategoryId } from '@/types/finance';
export const categoryIcons = { food: Coffee, transport: Bus, entertainment: Film, academic: BookOpen, personal: ShoppingBag, other: MoreHorizontal };
export function CategoryIcon({ category }: {
    category: CategoryId;
}) { const Icon = categoryIcons[category]; return <span className="category-icon"><Icon size={18}/></span>; }
export function Progress({ value, savings = false }: {
    value: number;
    savings?: boolean;
}) { return <div className="progress" role="progressbar" aria-label={savings ? 'Savings progress' : 'Budget used'} aria-valuenow={Math.min(100, value)} aria-valuemin={0} aria-valuemax={100}><span className={!savings && value > 90 ? 'red' : !savings && value >= 75 ? 'amber' : ''} style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></div>; }
