import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync(new URL('../core/auth/bootstrap.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
function fixture(error,user=null,active=true){
  let rpcCalls=0
  const exports={}
  const client={auth:{getUser:async()=>({data:{user},error})},rpc:()=>{rpcCalls++;return {single:async()=>({data:{profile_id:'profile',display_name:'Test',workspace_id:'workspace',workspace_name:'Test workspace',membership_id:'member',role_key:'viewer',has_active_membership:active},error:null})}}}
  vm.runInNewContext(code,{exports,console:{error(){}},require:name=>{
    if(name==='server-only')return {}
    if(name==='react')return {cache:fn=>fn}
    if(name==='@/core/supabase/server')return {createClient:async()=>client}
    throw new Error(`Unexpected import ${name}`)
  }})
  return {run:exports.ensureCoreSession,rpcCalls:()=>rpcCalls}
}
for(const code of ['refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','user_not_found'])test(`${code} returns signed-out state without a database bootstrap`,async()=>{
  // A contradictory user/error result must still fail closed.
  const f=fixture({name:'AuthApiError',code},{id:'untrusted'})
  const state=await f.run()
  assert.equal(state.status,'unauthenticated');assert.equal(state.hasActiveMembership,false)
  assert.equal(state.user,null);assert.equal(state.workspace,null);assert.equal(f.rpcCalls(),0)
})
for(const error of [null,{name:'AuthSessionMissingError'}])test(`absent session stays signed out (${error?.name??'no error'})`,async()=>{
  const f=fixture(error);assert.equal((await f.run()).status,'unauthenticated');assert.equal(f.rpcCalls(),0)
})
for(const code of ['unexpected_failure','request_timeout','over_request_rate_limit'])test(`auth service failure stays an error (${code})`,async()=>{
  const f=fixture({name:'AuthApiError',code,status:500});await assert.rejects(f.run(),/Session bootstrap failed/);assert.equal(f.rpcCalls(),0)
})
for(const active of [true,false])test(`valid credentials retain membership resolution (${active})`,async()=>{
  const f=fixture(null,{id:'user',email:'fixture@example.test',user_metadata:{}},active)
  const state=await f.run();assert.equal(state.status,active?'ready':'pending_access');assert.equal(state.hasActiveMembership,active);assert.equal(f.rpcCalls(),1)
})
