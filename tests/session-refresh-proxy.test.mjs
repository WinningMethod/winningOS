import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source=fs.readFileSync(new URL('../proxy.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
function fixture({missingEnv=false,refresh=true,throwOnClaims=false}={}) {
 const exports={};let claims=0
 const request={cookies:new Map([['session','expired-fixture']])}
 request.cookies.getAll=()=>[...request.cookies].map(([name,value])=>({name,value}))
 const responses=[]
 const fakeConsole={error:()=>{}}
 vm.runInNewContext(code,{exports,console:fakeConsole,require:name=>{
  if(name==='next/server')return {NextResponse:{next:({request})=>{
   const response={forwarded:request.cookies.get('session'),cookies:new Map(),headers:new Map()};responses.push(response);return response
  }}}
  if(name==='@/core/supabase/env.public')return {publicSupabaseEnvProblems:()=>missingEnv?['missing']:[],getPublicSupabaseEnv:()=>({url:'https://example.invalid',anonKey:'public-fixture'})}
  if(name==='@supabase/ssr')return {createServerClient:(_url,_key,{cookies})=>({auth:{getClaims:async()=>{
   claims++
   assert.equal(cookies.getAll()[0].value,'expired-fixture')
   if(throwOnClaims) throw new Error('network unreachable')
   if(refresh) cookies.setAll([{name:'session',value:'fresh-fixture',options:{httpOnly:true}}],{'Cache-Control':'private, no-store'})
   return {data:{claims:{sub:'fixture'}},error:null}
  }}})}
  throw new Error(name)
 }})
 return {run:()=>exports.proxy(request),request,claims:()=>claims}
}
test('refreshed session is forwarded to rendering and persisted with private cache headers',async()=>{
 const f=fixture();const response=await f.run()
 assert.equal(response.forwarded,'fresh-fixture')
 assert.equal(response.cookies.get('session'),'fresh-fixture')
 assert.equal(response.headers.get('Cache-Control'),'private, no-store')
 assert.equal(f.claims(),1)
})
test('a request without refresh does not invent new auth cookies',async()=>{
 const f=fixture({refresh:false});const response=await f.run()
 assert.equal(response.cookies.size,0);assert.equal(f.claims(),1)
})
test('unconfigured deployments retain their setup screen without calling auth',async()=>{
 const f=fixture({missingEnv:true});const response=await f.run()
 assert.equal(response.cookies.size,0);assert.equal(f.claims(),0)
})
test('session refresh state does not leak between requests',async()=>{
 const first=fixture();await first.run()
 const second=fixture({refresh:false});const response=await second.run()
 assert.equal(response.forwarded,'expired-fixture');assert.equal(response.cookies.size,0)
})
test('a transient auth-service failure does not fail the request',async()=>{
 const f=fixture({throwOnClaims:true});const response=await f.run()
 assert.equal(response.forwarded,'expired-fixture');assert.equal(response.cookies.size,0);assert.equal(f.claims(),1)
})
