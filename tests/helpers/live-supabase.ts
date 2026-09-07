import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname,join } from 'node:path';
import { POLICY_VERSION } from '../../src/lib/account';
const run=promisify(execFile);
// Only the newly provisioned project may receive these synthetic test accounts.
export const TEST_PROJECT='qkpfxpzezwgdvaoyjyep';
export async function liveAdmin(){
  if(process.env.GOPLAN_LIVE_TESTS!=='1') throw new Error('Explicit live-test opt-in is required.');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(url!==`https://${TEST_PROJECT}.supabase.co`) throw new Error('Refusing tests against a different project.');
  const {stdout}=await run(process.execPath,[join(dirname(process.execPath),'node_modules/npm/bin/npx-cli.js'),'--yes','supabase','projects','api-keys','--project-ref',TEST_PROJECT,'--reveal','--output','json'],{windowsHide:true});
  const parsed=JSON.parse(stdout.trim());const keys=Array.isArray(parsed)?parsed:parsed.api_keys??parsed.keys??[];
  const key=keys.find((k:{type?:string;name?:string})=>k.type==='secret')??keys.find((k:{name?:string})=>k.name==='service_role');
  if(!key) throw new Error('No admin key available for the scoped test project.');
  return createClient(url,key.api_key??key.key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function createTestUser(admin:Awaited<ReturnType<typeof liveAdmin>>){
  const email=`goplan-test-${crypto.randomUUID()}@example.invalid`,password=crypto.randomUUID()+'aA!';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{policy_version:POLICY_VERSION,privacy_consent:true,adult_confirmed:true}});
  if(error||!data.user) throw new Error('Synthetic test user could not be created: '+error?.message);
  return {id:data.user.id,email,password};
}
