// Run only when explicitly provisioning a NEW GoPlan project in the supplied organization.
// The generated database password stays in this process and is never printed or written.
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
const run = promisify(execFile);
const org = process.argv[2];
if (!org || !/^[a-z0-9-]+$/.test(org)) throw new Error('Supply the Supabase organization ID.');
if (existsSync('supabase/.temp/project-ref')) throw new Error('Already linked. Refusing to create another project.');
const npx = join(dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
const password = randomBytes(36).toString('base64url');
async function cli(args) {
  try {
    const { stdout } = await run(process.execPath, [npx, '--yes', 'supabase', ...args], { timeout: 240000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return stdout;
  } catch (error) {
    const detail = String(error.stderr || error.stdout || 'Supabase command failed').replaceAll(password, '[redacted]');
    throw new Error(detail);
  }
}
function json(output) { return JSON.parse(output.slice(output.indexOf('{') >= 0 && !output.trimStart().startsWith('[') ? output.indexOf('{') : output.indexOf('[')).trim()); }
try {
  const existing = json(await cli(['projects','list','--output','json']));
  const projects = Array.isArray(existing) ? existing : existing.projects ?? [];
  if (projects.some(p => p.name.toLowerCase() === 'goplan')) throw new Error('A GoPlan project already exists. Link it instead of provisioning again.');
  console.log('Creating a new GoPlan project in Singapore, using the organization default plan.');
  const created = json(await cli(['projects','create','GoPlan','--org-id',org,'--db-password',password,'--region','ap-southeast-1','--output','json']));
  const project = created.project ?? created;
  const ref = project.ref ?? project.id;
  if (!/^[a-z]{20}$/.test(ref ?? '')) throw new Error('Creation returned no recognized project reference. Check the dashboard before retrying.');
  console.log(JSON.stringify({ project:'GoPlan', ref, region:'ap-southeast-1' }));
  console.log('Linking the new project and applying the reviewed migration.');
  await cli(['link','--project-ref',ref,'--password',password]);
  await cli(['db','push','--linked','--password',password,'--yes']);
  console.log('Migration applied.');
  const response = json(await cli(['projects','api-keys','--project-ref',ref,'--output','json']));
  const keys = Array.isArray(response) ? response : response.api_keys ?? response.keys ?? [];
  const key = keys.find(k => k.type === 'publishable' || k.name === 'publishable') ?? keys.find(k => k.name === 'anon');
  console.log(JSON.stringify({ url:`https://${ref}.supabase.co`, publishable_key:key?.api_key ?? key?.key ?? null }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
