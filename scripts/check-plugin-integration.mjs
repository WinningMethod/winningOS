// Credential-free scratch-deployment proof (Next may download public fonts). Never installs into either framework repo,
// copies credentials, pushes SQL, calls providers, or changes the source checkouts.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const core = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const template = process.argv[2] && path.resolve(process.argv[2])
if (!template || !fs.existsSync(path.join(template,'core-stub/plugins/api.tsx'))) throw new Error('Usage: node scripts/check-plugin-integration.mjs /path/to/WinningTemplate')
if (fs.readFileSync(path.join(core,'scripts/lib/portability.mjs'),'utf8') !== fs.readFileSync(path.join(template,'scripts/lib/portability.mjs'),'utf8')) throw new Error('Core/template portability tooling differs; reconcile the paired releases')
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'winning-portability-'))
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'placeholder',NEXT_PUBLIC_APP_URL:'http://localhost:3000'}
function run(args) {
  const result=spawnSync(process.execPath,args,{cwd:scratch,env,encoding:'utf8',maxBuffer:20*1024*1024})
  if (result.status!==0) throw new Error(`${args.join(' ')}\n${result.stdout}\n${result.stderr}`)
  console.log(`PASS ${args.join(' ')}`)
}
try {
  fs.cpSync(core,scratch,{recursive:true,filter: file=> !['.git','node_modules','.next'].includes(path.basename(file)) && !path.basename(file).startsWith('.env') && !['.vercel','.supabase','tsconfig.tsbuildinfo'].includes(path.basename(file))})
  fs.symlinkSync(path.join(core,'node_modules'),path.join(scratch,'node_modules'),'dir')
  // Full API assignability proves the template promises only real Core exports.
  fs.copyFileSync(path.join(template,'core-stub/plugins/api.tsx'),path.join(scratch,'portability-stub.tsx'))
  fs.writeFileSync(path.join(scratch,'portability-api-check.ts'),'import * as Core from "./core/plugins/api"\nimport * as Stub from "./portability-stub"\nconst api: typeof Stub = Core\nvoid api\n')
  const idMatch=fs.readFileSync(path.join(template,'plugin/permissions.ts'),'utf8').match(/export const PLUGIN_ID = "([a-z][a-z0-9_]*)"/)
  if (!idMatch) throw new Error('Template has no literal PLUGIN_ID')
  const id=idMatch[1]
  fs.mkdirSync(path.join(scratch,'plugins'),{recursive:true})
  fs.cpSync(path.join(template,'plugin'),path.join(scratch,'plugins',id),{recursive:true})
  let ordinal=0
  for (const name of fs.readdirSync(path.join(template,'plugin/db/migrations')).sort()) {
    if (name.endsWith('.sql')) fs.copyFileSync(path.join(template,'plugin/db/migrations',name),path.join(scratch,'supabase/migrations',`20990101${String(++ordinal).padStart(6,'0')}_plugin_${id}_${name}`))
  }
  const registry=fs.readFileSync(path.join(scratch,'config/plugins.ts'),'utf8')
  const install=()=>{
    fs.writeFileSync(path.join(scratch,'config/plugins.ts'),registry.replace('export const installedPlugins: WinningOSPluginManifest[] = []',`import portable from "@/plugins/${id}/manifest"\nexport const installedPlugins: WinningOSPluginManifest[] = [portable]`))
  }
  const typecheck=()=>run(['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'])
  const validate=()=>{run(['scripts/validate-plugin-host.mjs']);run(['scripts/validate-portability.mjs'])}
  install()
  fs.writeFileSync(path.join(scratch,'config/plugin-routes.ts'),`import type { PluginRouteAlias } from "@/core/plugins/manifest"\nexport const pluginRouteAliases: PluginRouteAlias[] = [{ path: "/notes-proof", pluginId: "${id}", route: "" }]\n`)
  validate(); typecheck()
  // Compile a real Next deployment while the plugin is installed.
  run(['node_modules/next/dist/bin/next','build','--webpack'])
  fs.writeFileSync(path.join(scratch,'config/plugins.ts'),registry)
  validate(); typecheck()
  fs.rmSync(path.join(scratch,'plugins',id),{recursive:true})
  validate(); typecheck()
  run(['node_modules/next/dist/bin/next','build','--webpack'])
  fs.cpSync(path.join(template,'plugin'),path.join(scratch,'plugins',id),{recursive:true});install()
  validate();typecheck()
  console.log('Scratch install / disable / source removal / reinstall and API parity passed. No live SQL/RLS or provider checks were performed.')
} finally {fs.rmSync(scratch,{recursive:true,force:true})}
