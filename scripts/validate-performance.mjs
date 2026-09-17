import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import ts from 'typescript'
const template=fs.existsSync('plugin/manifest.ts')
function walk(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[])}
for(const file of (template?walk('plugin'):[...walk('app'),...walk('components')])){
 const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 const names=new Set()
 for(const node of source.statements)if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='next/link'&&node.importClause?.name)names.add(node.importClause.name.text)
 function visit(node){
  if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&names.has(node.tagName.getText(source))){
   const prop=node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text==='prefetch')
   assert(prop?.initializer&&ts.isJsxExpression(prop.initializer)&&prop.initializer.expression?.kind===ts.SyntaxKind.FalseKeyword,`${file}: page links must explicitly disable speculative prefetch`)
  }
  ts.forEachChild(node,visit)
 }
 visit(source)
}
assert(fs.existsSync('PERFORMANCE.md'),'performance contract is present')
if(!template){
 const nav=fs.readFileSync('components/app/workspace-navigation.tsx','utf8')
 assert(nav.includes('useTransition')&&nav.includes('PageSkeleton'),'immediate navigation skeleton is wired')
 assert(!/setTimeout|setInterval|router\.refresh\(/.test(nav),'navigation adds no artificial waits or refresh')
 for(const name of ['home','members','settings'])assert(fs.existsSync(`app/(app)/${name}/loading.tsx`),`${name} has a skeleton fallback`)
 for(const file of ['core/auth/bootstrap.ts','core/permissions/grants.ts','core/supabase/server.ts']){
  const text=fs.readFileSync(file,'utf8')
  assert(text.includes('cache(')&&!text.includes('unstable_cache')&&!text.includes('"use cache"'),`${file}: memoization remains request-scoped`)
 }
}else{
 assert(fs.readFileSync('plugin/routes/notes-page.tsx','utf8').includes('fallback={<NotesSkeleton />}'),'template demonstrates independent skeleton loading')
 assert(fs.readFileSync('plugin/server/data.ts','utf8').includes('.limit('),'template list reads are bounded')
}
console.log('Page performance conventions passed')
