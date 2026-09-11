import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolvePluginAlias } from '../core/plugins/aliases.ts'
import { dispatchPluginJob } from '../core/plugins/job-dispatch.ts'
import { validateMetadata, validateAliases, validateImports } from '../scripts/lib/portability.mjs'
import { withQueryContext } from '../core/navigation/query-context.ts'

const page = () => null
const plugin = { id: 'notes', version: '1.2.0', compatibility: 'core-v0', minCoreVersion: '0.2.0', publicApi: [], jobs: [], dependsOn: [], routes: ['', '/items/[id]'], folder: '/unused' }
const manifest = { ...plugin, routes: { '': page, '/items/[id]': page } }
const alias = { path: '/work/items/[id]', pluginId: 'notes', route: '/items/[id]' }

test('alias lifecycle: install, disable, remove source, reinstall; no plugin import fallback', () => {
  assert.equal(resolvePluginAlias([manifest],[alias],['work','items','123']).component,page)
  assert.deepEqual(resolvePluginAlias([manifest],[alias],['work','items','123']).params,{id:'123'})
  assert.equal(resolvePluginAlias([],[alias],['work','items','123']),null)
  assert.equal(resolvePluginAlias([],[alias],['work','items','123']),null)
  assert.equal(resolvePluginAlias([manifest],[alias],['work','items','123']).component,page)
  assert.equal(resolvePluginAlias([manifest],[alias],['work','items']),null)
  assert.equal(resolvePluginAlias([manifest],[{...alias,route:'/missing'}],['work','items','123']),null)
})
test('aliases reject Core collisions, ambiguous patterns, parameter mismatch and unknown installed routes', () => {
  validateAliases([alias],[plugin])
  validateAliases([alias],[]) // metadata is intentionally dormant
  for (const item of [{...alias,path:'/settings/items/[id]'},{...alias,path:'//work/items/[id]'},{...alias,path:'/work/items/[other]'},{...alias,route:'/missing'}]) assert.throws(()=>validateAliases([item],[plugin]))
  assert.throws(()=>validateAliases([alias,{...alias,path:'/work/items/new',route:''}],[plugin]))
  assert.throws(()=>validateAliases([alias],[plugin],['work']))
})
test('minimum Core and dependency semver are enforced, including prereleases', () => {
  const consumer = {...plugin,id:'consumer',dependsOn:[{pluginId:'notes',minVersion:'1.2.0'}]}
  validateMetadata([plugin,consumer],'0.2.0')
  assert.throws(()=>validateMetadata([plugin,consumer],'0.1.0'))
  assert.throws(()=>validateMetadata([consumer,plugin],'0.2.0'))
  assert.throws(()=>validateMetadata([{...plugin,version:'1.2.0-beta.1'},consumer],'0.2.0'))
  assert.throws(()=>validateMetadata([{...plugin,version:'invalid'}],'0.2.0'))
  assert.throws(()=>validateMetadata([plugin,{...consumer,dependsOn:[{pluginId:'notes',minVersion:'2.0.0'}]}],'0.2.0'))
})
test('job dispatch enforces installation, scoped secrets and authentication before running', async () => {
  let runs=0
  const secret='test-only-secret-not-a-real-credential'
  const p={...manifest,jobs:{sync:{secretEnv:'PLUGIN_NOTES_CRON_SECRET',run:async()=>{runs++}}}}
  const invoke=(plugins,auth,env={PLUGIN_NOTES_CRON_SECRET:secret},job='sync')=>dispatchPluginJob(plugins,'notes',job,auth,env)
  assert.equal((await invoke([p],null)).status,401)
  assert.equal((await invoke([p],'Bearer wrong')).status,401)
  assert.equal((await invoke([p],`Bearer ${secret}`,{})).status,503)
  assert.equal((await invoke([],`Bearer ${secret}`)).status,404)
  assert.equal((await invoke([p],`Bearer ${secret}`,undefined,'toString')).status,404)
  assert.equal(runs,0)
  assert.equal((await invoke([p],`Bearer ${secret}`)).status,204)
  assert.equal(runs,1)
  assert.equal((await invoke([],`Bearer ${secret}`)).status,404)
  assert.equal(runs,1)
  assert.equal((await invoke([p],`Bearer ${secret}`)).status,204)
  assert.equal(runs,2)
})
test('failed jobs expose no provider error details',async()=>{
  const p={...manifest,jobs:{sync:{secretEnv:'PLUGIN_NOTES_SECRET',run:async()=>{throw new Error('private provider token')}}}}
  const response=await dispatchPluginJob([p],'notes','sync','Bearer test',{PLUGIN_NOTES_SECRET:'test'})
  assert.equal(response.status,500); assert.equal(await response.text(),'')
})
test('private, undeclared and shell-to-plugin imports fail; declared public entrypoints work',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'winning-import-test-'))
  try {
    const owner={...plugin,folder:path.join(root,'plugins/notes'),publicApi:['public/server.ts']}
    const consumer={...plugin,id:'viewer',folder:path.join(root,'plugins/viewer'),dependsOn:[{pluginId:'notes',minVersion:'1.0.0'}]}
    fs.mkdirSync(owner.folder,{recursive:true}); fs.mkdirSync(consumer.folder,{recursive:true})
    const f=path.join(consumer.folder,'data.ts')
    fs.writeFileSync(f,'import { read } from "@/plugins/notes/public/server"')
    validateImports(root,[owner,consumer])
    fs.writeFileSync(f,'import { read } from "../notes/server/data"')
    assert.throws(()=>validateImports(root,[owner,consumer]))
    fs.writeFileSync(f,'import { read } from "@/plugins/notes/public/server"')
    assert.throws(()=>validateImports(root,[owner,{...consumer,dependsOn:[]}]))
    fs.mkdirSync(path.join(root,'app'))
    fs.writeFileSync(path.join(root,'app/page.ts'),'import { read } from "@/plugins/notes/public/server"')
    assert.throws(()=>validateImports(root,[owner,consumer]))
  } finally {fs.rmSync(root,{recursive:true,force:true})}
})
test('query context carries only named scalar values without changing the destination',()=>{
  assert.equal(withQueryContext('/work?fixed=1#section',{area:'sales',token:'private',fixed:'2'},['area','fixed']),'/work?fixed=1&area=sales#section')
  assert.equal(withQueryContext('/work',{area:['x'],bad:'\n'},['area','bad']),'/work')
})

test('test-only mock loaders are excluded while production dynamic imports fail',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'winning-test-boundary-'))
  try {
    const owner={...plugin,folder:path.join(root,'plugins/notes')}
    fs.mkdirSync(path.join(owner.folder,'tests'),{recursive:true})
    fs.writeFileSync(path.join(owner.folder,'tests/mock.ts'),'require(name)')
    fs.writeFileSync(path.join(owner.folder,'data.test.mjs'),'require(name)')
    validateImports(root,[owner])
    fs.writeFileSync(path.join(owner.folder,'data.ts'),'import(name)')
    assert.throws(()=>validateImports(root,[owner]),/explicit string literal/)
  } finally {fs.rmSync(root,{recursive:true,force:true})}
})
