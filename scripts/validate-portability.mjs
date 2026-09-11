import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { source, declarations, array, properties, literal, readManifest, validateMetadata, validateImports, validateAliases } from './lib/portability.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const registryFile = path.join(root,'config/plugins.ts')
const imports = new Map(source(registryFile).statements.filter(ts.isImportDeclaration).filter(s => s.importClause?.name).map(s => [s.importClause.name.text,literal(s.moduleSpecifier)]))
const plugins = array(declarations(registryFile).get('installedPlugins')).map(node => {
  const specifier = ts.isIdentifier(node) && imports.get(node.text)
  if (!specifier || !/^@\/plugins\/[a-z][a-z0-9_]*\/manifest$/.test(specifier)) throw new Error('Registry must contain imported plugin manifests')
  return readManifest(path.join(root,path.dirname(specifier.slice(2))))
})
const aliases = array(declarations(path.join(root,'config/plugin-routes.ts')).get('pluginRouteAliases')).map(node => Object.fromEntries([...properties(node)].map(([k,v]) => [k,literal(v)])))
const occupiedRoots = []
function scanRoutes(folder,segments=[]) {
  for (const e of fs.readdirSync(folder,{withFileTypes:true})) {
    if (!e.isDirectory()) continue
    if (/^\(.*\)$/.test(e.name)) scanRoutes(path.join(folder,e.name),segments)
    else if (e.name !== '[...alias]') {
      if (segments.length===0) occupiedRoots.push(e.name)
    }
  }
}
scanRoutes(path.join(root,'app'))
validateMetadata(plugins, JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version)
validateImports(root,plugins)
validateAliases(aliases,plugins,occupiedRoots)
console.log(`Portability contract passed: ${plugins.length} plugins, ${aliases.length} aliases`)
