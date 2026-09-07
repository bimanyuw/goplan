import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { testDatabase, addUser, asUser, mutate } from './helpers/database';
import { newPlan, type AccountData } from '../src/lib/account';
let db: PGlite;
const alice='10000000-0000-4000-8000-000000000001', bob='10000000-0000-4000-8000-000000000002';
const wa='20000000-0000-4000-8000-000000000001', wb='20000000-0000-4000-8000-000000000002', wc='20000000-0000-4000-8000-000000000003';
const expense='30000000-0000-4000-8000-000000000001';
before(async()=>{db=await testDatabase();await addUser(db,alice);await addUser(db,bob);});
after(async()=>{await db?.close();});
const account=async()=>(await db.query<{data:AccountData}>('select public.get_account() as data')).rows[0].data;
test('registration rejects absent or declined consent',async()=>{
  await assert.rejects(addUser(db,crypto.randomUUID(),{}),/Persetujuan/);
  await assert.rejects(addUser(db,crypto.randomUUID(),{policy_version:'2026-09-07',privacy_consent:false,adult_confirmed:true}),/Persetujuan/);
});
test('empty accounts, anonymous denial, direct write denial',async()=>{
  await asUser(db,alice); assert.deepEqual((await account()).entries,[]); assert.deepEqual((await account()).wallets,[]);
  await assert.rejects(db.query('insert into public.wallets(id,user_id,name,kind,opening_balance) values($1,$2,$3,$4,$5)',[wa,alice,'Bad','cash',10]),/permission denied/);
  await db.exec('set role anon'); await assert.rejects(db.query('select public.get_account()'),/permission denied/);
  await assert.rejects(mutate(db,'save_wallet',{id:wa,name:'Bad',kind:'cash',opening_balance:0}),/permission denied/);
});
test('RLS and ownership prevent cross-account reads and writes',async()=>{
  await asUser(db,alice);
  await mutate(db,'save_wallet',{id:wa,user_id:bob,name:'Tunai',kind:'cash',opening_balance:100000});
  await mutate(db,'save_wallet',{id:wb,name:'Bank',kind:'bank',opening_balance:0});
  assert.equal((await account()).wallets.length,2);
  await asUser(db,bob); assert.equal((await account()).wallets.length,0);
  assert.equal((await db.query('select * from public.wallets where id=$1',[wa])).rows.length,0);
  await assert.rejects(mutate(db,'save_wallet',{id:wa,name:'Stolen',kind:'cash',opening_balance:0}),/tidak tersedia/);
  await mutate(db,'save_wallet',{id:wc,name:'Bob cash',kind:'cash',opening_balance:0});
});
test('server rejects insufficient funds, fractions, future dates and foreign wallets',async()=>{
  await asUser(db,alice);
  const row={id:expense,kind:'expense',wallet_id:wa,to_wallet_id:null,name:'Makan',amount:20000,category:'food',date:'2026-01-01'};
  await assert.rejects(mutate(db,'save_entry',{...row,amount:100001}),/Saldo/);
  await assert.rejects(mutate(db,'save_entry',{...row,amount:1.9}),/Rupiah bulat/);
  await assert.rejects(mutate(db,'save_entry',{...row,date:'2999-01-01'}),/masa depan/);
  await assert.rejects(mutate(db,'save_entry',{...row,wallet_id:wc}),/foreign key/);
  await mutate(db,'save_entry',row); assert.equal((await account()).entries.length,1);
  await asUser(db,bob); await assert.rejects(mutate(db,'delete_entry',{id:expense}),/tidak ditemukan/);
  await assert.rejects(mutate(db,'save_entry',{...row,wallet_id:wc}),/tidak tersedia/);
});
test('retries are idempotent and failed transfers roll back atomically',async()=>{
  await asUser(db,alice); const request=crypto.randomUUID();
  const row={id:crypto.randomUUID(),kind:'transfer',wallet_id:wa,to_wallet_id:wb,name:'Ke bank',amount:50000,category:null,date:'2026-01-02'};
  await mutate(db,'save_entry',row,request); await mutate(db,'save_entry',row,request); assert.equal((await account()).entries.length,2);
  await assert.rejects(mutate(db,'save_entry',{...row,amount:40000},request),/sudah digunakan/);
  await assert.rejects(mutate(db,'save_entry',{...row,id:crypto.randomUUID(),amount:40000}),/Saldo/);
  assert.equal((await account()).entries.length,2);
  await assert.rejects(mutate(db,'save_entry',{...row,id:crypto.randomUUID(),to_wallet_id:wa}),/check constraint/);
});
test('deleting already-spent income is rejected without deleting the record',async()=>{
  await asUser(db,alice); const row={id:crypto.randomUUID(),kind:'income',wallet_id:wb,to_wallet_id:null,name:'Uang saku',amount:100000,category:null,date:'2026-01-03'};
  await mutate(db,'save_entry',row);
  await mutate(db,'save_entry',{id:crypto.randomUUID(),kind:'expense',wallet_id:wb,to_wallet_id:null,name:'Buku',amount:120000,category:'academic',date:'2026-01-03'});
  await assert.rejects(mutate(db,'delete_entry',{id:row.id}),/Saldo/); assert.ok((await account()).entries.some(e=>e.id===row.id));
});
test('category allocations and goal progress are validated by the database',async()=>{
  await asUser(db,alice); const p={...newPlan('2026-01'),allowance:100000,savings_target:20000,goal_saved:10000};
  await mutate(db,'save_plan',p);
  await assert.rejects(mutate(db,'save_plan',{...p,category_limits:{...p.category_limits,food:90000}}),/melebihi/);
  await assert.rejects(mutate(db,'save_plan',{...p,category_limits:{...p.category_limits,food:-1}}),/Alokasi/);
  await assert.rejects(mutate(db,'save_plan',{...p,goal_saved:30000}),/check constraint/); assert.equal((await account()).plans[0].goal_saved,10000);
});
test('account deletion removes personal data and leaves the other account intact',async()=>{
  await asUser(db,alice); await assert.rejects(db.query('select public.delete_my_account($1)',['no']),/Konfirmasi/);
  await db.query('select public.delete_my_account($1)',['HAPUS']); await db.exec('reset role');
  for(const table of ['profiles','wallets','entries','plans','mutation_receipts']) assert.equal((await db.query(`select * from public.${table} where user_id=$1`,[alice])).rows.length,0,table);
  assert.equal((await db.query('select * from auth.users where id=$1',[alice])).rows.length,0);
  await asUser(db,bob); assert.equal((await account()).wallets.length,1);
});
