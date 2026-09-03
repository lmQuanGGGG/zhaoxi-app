import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const schemaPath = path.resolve('db/schema.ts');
if (!fs.existsSync(schemaPath)) {
  console.error(`ERROR: missing ${schemaPath}`);
  process.exit(2);
}
const sourceText = fs.readFileSync(schemaPath, 'utf8');
const sf = ts.createSourceFile(schemaPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const text = (n) => n?.getText(sf) ?? '';
const unquote = (s) => s && /^['"`]/.test(s) ? s.slice(1, -1) : s;
const literalValue = (n) => {
  if (!n) return undefined;
  if (ts.isStringLiteralLike(n) || ts.isNumericLiteral(n)) return n.text;
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (n.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isObjectLiteralExpression(n) && n.properties.length === 0) return {};
  if (ts.isArrayLiteralExpression(n) && n.elements.length === 0) return [];
  return text(n);
};
const propName = (p) => ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name) ? p.name.text : text(p.name);

const enums = new Map();
const tableVars = new Map();
const tableNodes = [];

for (const st of sf.statements) {
  if (!ts.isVariableStatement(st)) continue;
  for (const d of st.declarationList.declarations) {
    if (!ts.isIdentifier(d.name) || !d.initializer || !ts.isCallExpression(d.initializer)) continue;
    const callee = d.initializer.expression;
    if (ts.isIdentifier(callee) && callee.text === 'pgEnum') {
      const enumName = unquote(text(d.initializer.arguments[0]));
      const vals = d.initializer.arguments[1];
      enums.set(d.name.text, { name: enumName, values: ts.isArrayLiteralExpression(vals) ? vals.elements.map(x => unquote(text(x))) : [] });
      continue;
    }
    if (ts.isIdentifier(callee) && callee.text === 'pgTable') {
      const tableName = unquote(text(d.initializer.arguments[0]));
      tableVars.set(d.name.text, tableName);
      tableNodes.push({ varName: d.name.text, tableName, call: d.initializer });
    }
  }
}

function decomposeChain(expr) {
  const methods = [];
  let cur = expr;
  while (ts.isCallExpression(cur) && ts.isPropertyAccessExpression(cur.expression)) {
    methods.push({ name: cur.expression.name.text, args: [...cur.arguments] });
    cur = cur.expression.expression;
  }
  return { base: cur, methods: methods.reverse() };
}

function baseBuilder(callOrExpr) {
  if (!ts.isCallExpression(callOrExpr)) return { builder: text(callOrExpr), args: [] };
  const c = callOrExpr.expression;
  return { builder: ts.isIdentifier(c) ? c.text : text(c), args: [...callOrExpr.arguments] };
}

function sqlType(builder, args) {
  const opts = args[1] && ts.isObjectLiteralExpression(args[1]) ? Object.fromEntries(args[1].properties.filter(ts.isPropertyAssignment).map(p => [propName(p), literalValue(p.initializer)])) : {};
  if (builder === 'varchar') return opts.length ? `varchar(${opts.length})` : 'varchar';
  if (builder === 'timestamp') {
    const wt = opts.withTimezone === true || opts.withTimezone === 'true';
    return wt ? 'timestamp with time zone' : 'timestamp without time zone';
  }
  if (builder === 'numeric') {
    if (opts.precision && opts.scale !== undefined) return `numeric(${opts.precision},${opts.scale})`;
    if (opts.precision) return `numeric(${opts.precision})`;
    return 'numeric';
  }
  if (enums.has(builder)) return `enum:${enums.get(builder).name}`;
  return ({ uuid:'uuid', text:'text', boolean:'boolean', integer:'integer', jsonb:'jsonb' })[builder] || builder;
}

function refTarget(arg) {
  if (!arg) return null;
  let body = arg;
  if (ts.isArrowFunction(arg)) body = arg.body;
  if (ts.isPropertyAccessExpression(body) && ts.isIdentifier(body.expression)) {
    return { tableVar: body.expression.text, columnProp: body.name.text };
  }
  return { raw: text(arg) };
}

const tables = [];
const tableColumnPropMaps = new Map();
for (const t of tableNodes) {
  const obj = t.call.arguments[1];
  if (!obj || !ts.isObjectLiteralExpression(obj)) continue;
  const columns = [];
  const propToSql = new Map();
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p)) continue;
    const property = propName(p);
    const { base, methods } = decomposeChain(p.initializer);
    const { builder, args } = baseBuilder(base);
    const sqlName = unquote(text(args[0]));
    if (!sqlName) continue;
    propToSql.set(property, sqlName);
    const c = {
      property,
      name: sqlName,
      type: sqlType(builder, args),
      notNull: false,
      primaryKey: false,
      unique: false,
      hasDefault: false,
      defaultKind: null,
      defaultValue: null,
      references: null,
    };
    for (const m of methods) {
      if (m.name === 'notNull') c.notNull = true;
      else if (m.name === 'primaryKey') { c.primaryKey = true; c.notNull = true; }
      else if (m.name === 'unique') c.unique = true;
      else if (m.name === 'defaultRandom') { c.hasDefault = true; c.defaultKind = 'uuid_random'; }
      else if (m.name === 'defaultNow') { c.hasDefault = true; c.defaultKind = 'now'; }
      else if (m.name === 'default') { c.hasDefault = true; c.defaultKind = 'literal_or_sql'; c.defaultValue = literalValue(m.args[0]); }
      else if (m.name === 'references') {
        c.references = refTarget(m.args[0]);
        if (m.args[1] && ts.isObjectLiteralExpression(m.args[1])) {
          const o = Object.fromEntries(m.args[1].properties.filter(ts.isPropertyAssignment).map(x => [propName(x), literalValue(x.initializer)]));
          c.references.onDelete = o.onDelete ?? null;
          c.references.onUpdate = o.onUpdate ?? null;
        }
      }
    }
    columns.push(c);
  }
  tableColumnPropMaps.set(t.varName, propToSql);
  tables.push({ variable: t.varName, name: t.tableName, columns, indexes: [], primaryKeys: [] });
}

const tableByVar = new Map(tables.map(t => [t.variable, t]));
for (const tnode of tableNodes) {
  const table = tableByVar.get(tnode.varName);
  const extra = tnode.call.arguments[2];
  if (!table || !extra || !ts.isArrowFunction(extra)) continue;
  let ret = extra.body;
  if (ts.isBlock(ret)) {
    const rs = ret.statements.find(ts.isReturnStatement);
    ret = rs?.expression;
  }
  if (!ret || !ts.isArrayLiteralExpression(ret)) continue;
  for (const el of ret.elements) {
    const { base, methods } = decomposeChain(el);
    if (!ts.isCallExpression(base)) continue;
    const b = baseBuilder(base);
    if (b.builder === 'index' || b.builder === 'uniqueIndex') {
      const name = unquote(text(b.args[0]));
      const on = methods.find(m => m.name === 'on');
      const cols = (on?.args || []).map(a => ts.isPropertyAccessExpression(a) ? a.name.text : text(a)).map(p => tableColumnPropMaps.get(tnode.varName)?.get(p) || p);
      table.indexes.push({ name, unique: b.builder === 'uniqueIndex', columns: cols });
    } else if (b.builder === 'primaryKey') {
      const arg = b.args[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const cp = arg.properties.find(p => ts.isPropertyAssignment(p) && propName(p) === 'columns');
        if (cp && ts.isPropertyAssignment(cp) && ts.isArrayLiteralExpression(cp.initializer)) {
          const cols = cp.initializer.elements.map(a => ts.isPropertyAccessExpression(a) ? a.name.text : text(a)).map(p => tableColumnPropMaps.get(tnode.varName)?.get(p) || p);
          table.primaryKeys.push(cols);
        }
      }
    }
  }
}

for (const table of tables) {
  for (const c of table.columns) {
    if (c.references?.tableVar) {
      const targetTable = tableVars.get(c.references.tableVar) || c.references.tableVar;
      const targetCol = tableColumnPropMaps.get(c.references.tableVar)?.get(c.references.columnProp) || c.references.columnProp;
      c.references.table = targetTable;
      c.references.column = targetCol;
      delete c.references.tableVar;
      delete c.references.columnProp;
    }
  }
}

const contract = {
  generatedAt: new Date().toISOString(),
  source: 'db/schema.ts',
  parser: 'TypeScript AST; Drizzle pgTable/pgEnum subset used by ZhaoXi schema',
  counts: {
    tables: tables.length,
    columns: tables.reduce((n,t)=>n+t.columns.length,0),
    indexes: tables.reduce((n,t)=>n+t.indexes.length,0),
    foreignKeys: tables.reduce((n,t)=>n+t.columns.filter(c=>c.references).length,0),
    enums: enums.size,
  },
  enums: [...enums.values()].sort((a,b)=>a.name.localeCompare(b.name)),
  tables: tables.sort((a,b)=>a.name.localeCompare(b.name)),
};
const outDir = path.resolve('artifacts/schema');
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, 'declared-schema-contract.json');
fs.writeFileSync(target, JSON.stringify(contract, null, 2) + '\n');
console.log(`Declared schema contract written: ${target}`);
console.log(`Tables=${contract.counts.tables} Columns=${contract.counts.columns} Indexes=${contract.counts.indexes} FKs=${contract.counts.foreignKeys} Enums=${contract.counts.enums}`);
if (contract.counts.tables === 0) process.exitCode = 3;
