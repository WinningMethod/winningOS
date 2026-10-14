import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync(new URL('../core/supabase/timed-fetch.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
function load(fetch){const exports={},logs=[];vm.runInNewContext(code,{exports,URL,performance,fetch,console:{info:(...args)=>logs.push(args)}});return {run:exports.timedSupabaseFetch,logs}}
test('timing preserves requests and responses without logging credentials or query data',async()=>{
 const response=new Response('private body');let received
 const f=load(async(...args)=>{received=args;return response})
 const url='https://example.invalid/rest/v1/core_workspaces?secret=private-query';const init={headers:{Authorization:'Bearer private-token'}}
 assert.equal(await f.run(url,init),response);assert.equal(received[0],url);assert.equal(received[1],init)
 const output=JSON.stringify(f.logs);assert.ok(output.includes('responseHeadersMs'));assert.ok(!output.includes('private-'));assert.ok(!output.includes('example.invalid'))
})
test('network errors propagate without sensitive error messages in timing logs',async()=>{
 const failure=new Error('private-token');const f=load(async()=>{throw failure})
 await assert.rejects(f.run('https://example.invalid/auth/v1/user'),e=>e===failure)
 assert.ok(JSON.stringify(f.logs).includes('network-error'));assert.ok(!JSON.stringify(f.logs).includes('private-token'))
})
test('unknown paths are never logged',async()=>{
 const f=load(async()=>new Response());await f.run('https://example.invalid/customer-secret');assert.equal(f.logs.length,0)
})
