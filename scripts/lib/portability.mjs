import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import semver from 'semver'

export function source(file) { return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) }
const unwrap = node => ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node
export function declarations(file) {
  const found = new Map()
  for (const statement of source(file).statements) if (ts.isVariableStatement(statement)) {
    for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) found.set(d.name.text, unwrap(d.initializer))
  }
  return found
}
export function properties(node) {
  node = unwrap(node)
  if (!ts.isObjectLiteralExpression(node)) throw new Error('Expected a literal object')
  return new Map(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p) || ts.isComputedPropertyName(p.name)) throw new Error('Spread/computed manifest declarations are not portable')
    return [p.name.text, unwrap(p.initializer)]
  }))
}
export function literal(node) {
  if (!node || !ts.isStringLiteral(unwrap(node))) throw new Error('Expected an explicit string literal')
  return unwrap(node).text
}
export function array(node) {
  if (!node) return []
  if (!ts.isArrayLiteralExpression(unwrap(node))) throw new Error('Expected an explicit array')
  return [...unwrap(node).elements]
}
export function readManifest(folder) {
  const vars = declarations(path.join(folder, 'manifest.ts'))
  const manifest = vars.get('manifest')
  if (!manifest) throw new Error(`${folder}: declare const manifest as a literal object`)
  const fields = properties(manifest)
  const idNode = fields.get('id')
  const id = ts.isIdentifier(idNode) && idNode.text === 'PLUGIN_ID'
    ? literal(declarations(path.join(folder, 'permissions.ts')).get('PLUGIN_ID')) : literal(idNode)
  const permissionText = fs.readFileSync(path.join(folder, 'permissions.ts'), 'utf8')
  return {
    id, folder, version: literal(fields.get('version')),
    compatibility: literal(fields.get('compatibility')),
    minCoreVersion: fields.has('minCoreVersion') ? literal(fields.get('minCoreVersion')) : undefined,
    publicApi: array(fields.get('publicApi')).map(literal),
    routes: [...properties(fields.get('routes')).keys()],
    publicTables: array(fields.get('publicTables')).map(literal),
    dependsOn: array(fields.get('dependsOn')).map(node => { const p = properties(node); return { pluginId: literal(p.get('pluginId')), minVersion: literal(p.get('minVersion')) } }),
    jobs: fields.has('jobs') ? [...properties(fields.get('jobs'))].map(([id,node]) => {
      const p = properties(node)
      if (!p.has('run')) throw new Error(`${id}: job needs run`)
      return { id, secretEnv: literal(p.get('secretEnv')) }
    }) : [],
    permissionText,
  }
}
export function files(folder) {
  if (!fs.existsSync(folder)) return []
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(e => {
    const f = path.join(folder,e.name)
    return e.isDirectory() ? (['tests', '__tests__'].includes(e.name) ? [] : files(f)) : /\.(ts|tsx|js|mjs)$/.test(f) && !/\.(test|spec)\./.test(e.name) ? [f] : []
  })
}
export function imports(file) {
  const result = []
  const walk = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) result.push(literal(node.moduleSpecifier))
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) result.push(literal(node.arguments[0]))
    ts.forEachChild(node,walk)
  }
  walk(source(file)); return result
}
const version = (v,label) => { if (!semver.valid(v)) throw new Error(`${label}: invalid semver ${v}`) }
const portablePath = value => /^public\/(server|client|types)\.(ts|tsx)$/.test(value)
export function validateMetadata(plugins, coreVersion) {
  version(coreVersion,'Core')
  const ids = new Set()
  for (const p of plugins) {
    if (!/^[a-z][a-z0-9_]*$/.test(p.id) || ids.has(p.id)) throw new Error(`Invalid/duplicate plugin id ${p.id}`)
    ids.add(p.id); version(p.version,p.id)
    if (p.compatibility !== 'core-v0') throw new Error(`${p.id}: unsupported compatibility`)
    if (p.minCoreVersion) {
      version(p.minCoreVersion,p.id)
      if (semver.lt(coreVersion,p.minCoreVersion)) throw new Error(`${p.id}: requires Core >= ${p.minCoreVersion}`)
    }
    if ((p.jobs.length || p.publicApi.length) && (!p.minCoreVersion || semver.lt(p.minCoreVersion,'0.2.0'))) throw new Error(`${p.id}: portability additions require minCoreVersion >= 0.2.0`)
    for (const api of p.publicApi) {
      if (!portablePath(api) || !fs.existsSync(path.join(p.folder,api))) throw new Error(`${p.id}: invalid/missing public API ${api}`)
      if (api.startsWith('public/server.') && !imports(path.join(p.folder,api)).includes('server-only')) throw new Error(`${p.id}: public server API requires server-only`)
      if (api.startsWith('public/client.') && imports(path.join(p.folder,api)).includes('server-only')) throw new Error(`${p.id}: public client API imports server-only`)
    }
    for (const job of p.jobs) {
      if (!/^[a-z][a-z0-9_]*$/.test(job.id) || !new RegExp(`^PLUGIN_${p.id.toUpperCase()}_[A-Z][A-Z0-9_]*$`).test(job.secretEnv)) throw new Error(`${p.id}: invalid job/secret namespace`)
    }
    for (const d of p.dependsOn) {
      version(d.minVersion,`${p.id} dependency`)
      const owner = plugins.find(o => o.id === d.pluginId)
      if (!owner || !ids.has(owner.id) || owner.id === p.id) throw new Error(`${p.id}: dependency ${d.pluginId} must be installed earlier`)
      if (semver.lt(owner.version,d.minVersion)) throw new Error(`${p.id}: ${d.pluginId} requires >= ${d.minVersion}, found ${owner.version}`)
    }
  }
}
export function validateImports(root, plugins) {
  const pluginRoot = path.join(root,'plugins')
  for (const p of plugins) for (const file of files(p.folder)) {
    for (const specifier of imports(file)) {
      const target = specifier.startsWith('@/') ? path.join(root,specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file),specifier) : null
      if (!target) continue
      if (target.startsWith(p.folder + path.sep)) continue
      if (target.replace(/\.(ts|tsx)$/,'') === path.join(root,'core/plugins/api')) continue
      if (!target.startsWith(pluginRoot + path.sep)) throw new Error(`${file}: import outside the plugin API: ${specifier}`)
      const rel = path.relative(pluginRoot,target).split(path.sep); const owner = plugins.find(o => o.id === rel[0])
      if (!owner || !p.dependsOn.some(d => d.pluginId === owner.id)) throw new Error(`${p.id}: undeclared code dependency ${specifier}`)
      const exported = rel.slice(1).join('/').replace(/\.(ts|tsx)$/,'')
      if (!owner.publicApi.some(api => api.replace(/\.(ts|tsx)$/,'') === exported)) throw new Error(`${p.id}: private code import ${specifier}`)
      if (source(file).statements.some(s => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === 'use client') && exported === 'public/server') throw new Error(`${p.id}: client imports a server API`)
    }
  }
  // Product routes and cron adapters must not outlive registry removal.
  for (const area of ['app','core','components','lib']) for (const file of files(path.join(root,area))) {
    for (const specifier of imports(file)) {
      const target = specifier.startsWith('@/') ? path.join(root,specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file),specifier) : null
      if (target?.startsWith(pluginRoot + path.sep)) throw new Error(`${file}: direct plugin import bypasses registry removal`)
    }
  }
}
export function validateAliases(aliases, plugins, occupiedRoots = []) {
  const normalized = []
  const reserved = new Set(['api','auth','p','home','members','settings','sign-in','sign-up','forgot-password','set-password','pending-access','_next',...occupiedRoots])
  for (const a of aliases) {
    if (!/^\/[a-z][a-z0-9-]*(?:\/(?:[a-zA-Z0-9_-]+|\[[a-zA-Z][a-zA-Z0-9_]*\]))*$/.test(a.path) || reserved.has(a.path.split('/')[1])) throw new Error(`Reserved/invalid alias ${a.path}`)
    if (!/^[a-z][a-z0-9_]*$/.test(a.pluginId)) throw new Error('Invalid alias plugin id')
    const parts = a.path.slice(1).split('/')
    for (const other of normalized) if (other.length === parts.length && other.every((part,i) => part.startsWith('[') || parts[i].startsWith('[') || part === parts[i])) throw new Error(`Overlapping alias ${a.path}`)
    normalized.push(parts)
    const names = value => [...value.matchAll(/\[([a-zA-Z][a-zA-Z0-9_]*)\]/g)].map(m => m[1]).sort()
    if (new Set(names(a.path)).size !== names(a.path).length || JSON.stringify(names(a.path)) !== JSON.stringify(names(a.route))) throw new Error(`Alias parameter mismatch ${a.path}`)
    const plugin = plugins.find(p => p.id === a.pluginId)
    if (plugin && !plugin.routes.includes(a.route)) throw new Error(`Unknown target route ${a.pluginId}:${a.route}`)
    // Absent plugins deliberately leave dormant metadata; deleting source works.
  }
}
