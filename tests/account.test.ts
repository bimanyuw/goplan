import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, monthlySummary, newPlan, todayJakarta, money, type AccountData } from '../src/lib/account';
const data:AccountData={profile:{user_id:'a',policy_version:'2026-09-07',consent_at:'2026-09-07',created_at:'2026-09-07'},wallets:[{id:'w',name:'Cash',kind:'cash',opening_balance:100000}],entries:[],plans:[]};
test('new accounts have no seeded plan or forecast',()=>{const s=monthlySummary(data,'2026-09','2026-09-07');assert.equal(s.spent,0);assert.equal(s.forecast,null);assert.equal(s.safeDaily,null);assert.equal(s.plan.goal_saved,0);});
test('Jakarta date handles UTC month rollover',()=>{assert.equal(todayJakarta(new Date('2026-08-31T18:00:00Z')),'2026-09-01');});
test('income and transfers change balances without inventing spending or budget',()=>{
  const d:AccountData={...data,wallets:[...data.wallets,{id:'b',name:'Bank',kind:'bank',opening_balance:0}],entries:[
    {id:'i',kind:'income',wallet_id:'w',to_wallet_id:null,category:null,name:'Income',amount:100000,date:'2026-09-01'},
    {id:'t',kind:'transfer',wallet_id:'w',to_wallet_id:'b',category:null,name:'Transfer',amount:50000,date:'2026-09-02'},
    {id:'e',kind:'expense',wallet_id:'w',to_wallet_id:null,category:'food',name:'Lunch',amount:25000,date:'2026-09-03'},
  ],plans:[{...newPlan('2026-09'),allowance:200000,savings_target:50000}]};
  const s=monthlySummary(d,'2026-09','2026-09-07'); assert.equal(s.spent,25000);assert.equal(s.income,100000);assert.equal(s.cash,175000);assert.equal(s.remaining,175000);assert.equal(balance(d.wallets[1],d.entries),50000);assert.equal(s.safeDaily,5208);assert.equal(monthlySummary(d,'2026-08','2026-09-07').spent,0);assert.equal(monthlySummary(d,'2026-08','2026-09-07').safeDaily,null);
});
test('overspending stays visible and daily capacity cannot be negative',()=>{
  const d:AccountData={...data,plans:[{...newPlan('2026-09'),allowance:1000}],entries:[{id:'e',kind:'expense',wallet_id:'w',to_wallet_id:null,category:'food',name:'Lunch',amount:5000,date:'2026-09-01'}]};
  const s=monthlySummary(d,'2026-09','2026-09-07');assert.equal(s.remaining,-4000);assert.equal(s.safeDaily,0);assert.ok(s.forecast!<0);
});
test('money rejects absent, fractional, exponential and oversized input',()=>{for(const raw of [null,'','1.5','-1','1e3','100000001']) assert.throws(()=>money(raw));assert.equal(money('0',true),0);assert.equal(money('12000'),12000);});
