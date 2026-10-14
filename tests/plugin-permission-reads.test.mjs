import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync(new URL('../core/plugins/permissions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
function fixture(fail=false){
 const exports={};let reads=0
 const rows=[{role_key:'admin',permission_key:'plugin.example.manage'},{role_key:'viewer',permission_key:'plugin.example.view'}]
 const imports={
  'server-only':{},react:{cache:fn=>{let result;return()=>result??=fn()}},
  '@/core/supabase/server':{createClient:async()=>({from:()=>({select:()=>({like:async()=>{reads++;return {data:fail?null:rows,error:fail?{code:'unavailable'}:null}}})})})},
  '@/core/permissions/catalog':{isCoreRoleKey:key=>['owner','admin','member','viewer'].includes(key),CORE_ROLE_KEYS:['owner','admin','member','viewer']},
  './manifest':{isPluginPermissionKey:key=>key.startsWith('plugin.')},
  './registry':{getInstalledPlugins:()=>[{name:'Example',permissions:[{key:'plugin.example.view',defaultRoles:['viewer']},{key:'plugin.example.manage',defaultRoles:['admin']}]}]},
 }
 vm.runInNewContext(code,{exports,console:{error(){}},require:name=>{if(name in imports)return imports[name];throw new Error(name)}})
 return {...exports,reads:()=>reads}
}
test('shared plugin permission rows never grant a viewer another roles permissions',async()=>{
 const f=fixture()
 assert.equal(await f.roleHasPluginPermission('viewer','plugin.example.manage'),false)
 assert.equal(await f.roleHasPluginPermission('viewer','plugin.example.view'),true)
 assert.deepEqual([...await f.getPluginGrantsForRole('viewer')],['plugin.example.view'])
 assert.equal(f.reads(),1)
})
test('plugin read failures deny non-owner access and return no navigation grants',async()=>{
 const f=fixture(true)
 assert.equal(await f.roleHasPluginPermission('admin','plugin.example.manage'),false)
 assert.equal((await f.getPluginGrantsForRole('admin')).size,0)
})
test('unrecognized roles do not query or receive plugin permissions',async()=>{
 const f=fixture();assert.equal(await f.roleHasPluginPermission('intruder','plugin.example.view'),false);assert.equal(f.reads(),0)
})
