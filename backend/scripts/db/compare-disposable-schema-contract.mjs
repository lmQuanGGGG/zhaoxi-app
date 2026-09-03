import fs from 'node:fs';
import path from 'node:path';

const prodPath = path.resolve('artifacts/schema/disposable-schema-full.json');
const decPath = path.resolve('artifacts/schema/declared-schema-contract.json');
for (const p of [prodPath, decPath]) {
  if (!fs.existsSync(p)) { console.error(`ERROR: missing ${p}`); process.exit(2); }
}
const prod = JSON.parse(fs.readFileSync(prodPath,'utf8'));
const dec = JSON.parse(fs.readFileSync(decPath,'utf8'));
const clean = s => String(s ?? '').replace(/"/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const stripCasts = s => clean(s).replace(/::[a-z0-9_ .\[\]"]+/g,'').replace(/^\((.*)\)$/,'$1').trim();
const prodType = c => {
  if (clean(c.data_type) === 'user-defined') return `enum:${c.udt_name}`;
  if (clean(c.data_type) === 'character varying') return c.character_maximum_length ? `varchar(${c.character_maximum_length})` : 'varchar';
  if (clean(c.data_type) === 'numeric') return c.numeric_precision ? `numeric(${c.numeric_precision}${c.numeric_scale != null ? ','+c.numeric_scale : ''})` : 'numeric';
  return clean(c.data_type);
};

const normalizeTsLikeJson = value => {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map(normalizeTsLikeJson);
  if (typeof value === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(value)) out[k] = normalizeTsLikeJson(v);
    return out;
  }
  const s = String(value).trim();
  if (/^sql`/.test(s)) return { __rawSql: s };
  try { return JSON.parse(s); } catch {}
  try {
    const jsonish = s
      .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(jsonish);
  } catch {}
  return s;
};

const stripPgDefaultCastsPreserveQuotes = value => {
  let s = String(value ?? '').trim();
  // PostgreSQL metadata commonly renders JSON defaults as '<json>'::jsonb.
  // Preserve JSON string quotes while removing only trailing casts / wrapper parens.
  s = s.replace(/::(?:jsonb|json|text|character varying|varchar|boolean|integer|bigint|numeric(?:\([^)]*\))?|uuid|timestamp(?: with(?:out)? time zone)?)(?:\[\])?\s*$/i, '').trim();
  while (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1).trim();
  return s;
};

const normalizeProdDefault = actual => {
  if (actual == null) return null;
  const a = stripPgDefaultCastsPreserveQuotes(actual);
  const unquoted = a.startsWith("'") && a.endsWith("'")
    ? a.slice(1, -1).replace(/''/g, "'")
    : a;
  try { return JSON.parse(unquoted); } catch {}
  return unquoted;
};

const stableJson = value => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(k=>`${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const defaultMatches = (d, actual) => {
  if (!d.hasDefault) return actual == null;
  if (actual == null) return false;
  // PostgreSQL renders enum defaults as 'value'::enum_type. For declared enum
  // columns, compare the literal value semantically and ignore the enum cast.
  if (String(d.type || '').startsWith('enum:')) {
    const raw = String(actual).trim();
    const enumLiteral = raw.match(/^'((?:''|[^'])*)'::[A-Za-z_][A-Za-z0-9_$.]*$/);
    if (enumLiteral) return clean(enumLiteral[1].replace(/''/g, "'")) === clean(d.defaultValue);
  }
  const a = stripCasts(actual);
  if (d.defaultKind === 'uuid_random') return /gen_random_uuid\(\)|uuid_generate_v4\(\)/.test(a);
  if (d.defaultKind === 'now') return /now\(\)|current_timestamp/.test(a);
  const v = normalizeTsLikeJson(d.defaultValue);
  if (v && typeof v === 'object' && v.__rawSql) return true;
  const p = normalizeProdDefault(actual);
  if ((typeof v === 'object' && v !== null) || Array.isArray(v)) return stableJson(v) === stableJson(p);
  if (typeof v === 'boolean' || typeof v === 'number') return String(p) === String(v);
  return clean(p) === clean(v);
};

const parseCols = s => {
  const m = String(s||'').match(/\(([^)]+)\)/);
  return m ? m[1].split(',').map(x=>clean(x).replace(/\basc\b|\bdesc\b|nulls (first|last)/g,'').trim()) : [];
};
const toSnake = s => String(s ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const normalizeDeclaredIndexColumn = value => {
  let s = String(value ?? '').trim();
  const expr = s.match(/^table\.([A-Za-z_$][A-Za-z0-9_$]*)(?:\.(?:asc|desc)\(\))?(?:\.(?:nullsFirst|nullsLast)\(\))?$/);
  if (expr) return toSnake(expr[1]);
  return clean(s).replace(/\basc\b|\bdesc\b|nulls (first|last)/g,'').trim();
};
const parseIndex = def => ({ unique:/create unique index/i.test(def), columns:parseCols(def) });
const sameIndexShape = (a,b) => Boolean(a.unique) === Boolean(b.unique) && (a.columns||[]).map(normalizeDeclaredIndexColumn).join(',') === (b.columns||[]).map(clean).join(',');
const parseFk = def => {
  const m=String(def||'').match(/foreign key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)(.*)$/i);
  if(!m) return null;
  const tail=clean(m[4]);
  return { columns:m[1].split(',').map(clean), table:clean(m[2]).split('.').pop(), refColumns:m[3].split(',').map(clean), onDelete:(tail.match(/on delete ([a-z ]+?)(?: on update|$)/)?.[1]||'').trim()||null, onUpdate:(tail.match(/on update ([a-z ]+)$/)?.[1]||'').trim()||null };
};

const prodTables = new Set((prod.tables||[]).filter(t=>t.schema_name==='public').map(t=>t.table_name));
const declaredTables = new Set((dec.tables||[]).map(t=>t.name));
const missingTables=[...declaredTables].filter(x=>!prodTables.has(x)).sort();
const extraTables=[...prodTables].filter(x=>!declaredTables.has(x)).sort();
const issues=[];
const informational=[];
let matchedTables=0;
for (const t of dec.tables||[]) {
  if(!prodTables.has(t.name)) continue;
  const pcols=(prod.columns||[]).filter(c=>c.table_schema==='public'&&c.table_name===t.name);
  const pmap=new Map(pcols.map(c=>[c.column_name,c]));
  const dmap=new Map((t.columns||[]).map(c=>[c.name,c]));
  for(const c of t.columns||[]) {
    const p=pmap.get(c.name);
    if(!p){issues.push({kind:'COLUMN_MISSING',table:t.name,column:c.name});continue;}
    if(clean(prodType(p))!==clean(c.type)) issues.push({kind:'TYPE_DRIFT',table:t.name,column:c.name,declared:c.type,production:prodType(p)});
    const prodNotNull=clean(p.is_nullable)==='no';
    if(Boolean(c.notNull)!==prodNotNull) issues.push({kind:'NULLABILITY_DRIFT',table:t.name,column:c.name,declared:c.notNull,production:prodNotNull});
    if(!defaultMatches(c,p.column_default)) issues.push({kind:'DEFAULT_DRIFT',table:t.name,column:c.name,declared:{kind:c.defaultKind,value:c.defaultValue},production:p.column_default});
  }
  for(const p of pcols) if(!dmap.has(p.column_name)) issues.push({kind:'COLUMN_EXTRA',table:t.name,column:p.column_name});

  const pcons=(prod.constraints||[]).filter(c=>c.schema_name==='public'&&c.table_name===t.name);
  const pfks=pcons.filter(c=>c.constraint_type==='f').map(c=>parseFk(c.definition)).filter(Boolean);
  for(const c of (t.columns||[]).filter(c=>c.references)) {
    const expected={columns:[c.name],table:clean(c.references.table),refColumns:[clean(c.references.column)],onDelete:clean(c.references.onDelete)||null,onUpdate:clean(c.references.onUpdate)||null};
    const hit=pfks.find(f=>f.columns.join(',')===expected.columns.join(',')&&f.table===expected.table&&f.refColumns.join(',')===expected.refColumns.join(','));
    if(!hit) issues.push({kind:'FK_DRIFT',table:t.name,column:c.name,declared:expected,production:null});
    else {
      const normAction=x=>x===null?null:clean(x).replace('no action','').trim()||null;
      if(normAction(expected.onDelete)!==normAction(hit.onDelete) || normAction(expected.onUpdate)!==normAction(hit.onUpdate)) issues.push({kind:'FK_ACTION_DRIFT',table:t.name,column:c.name,declared:expected,production:hit});
    }
  }

  const pidx=(prod.indexes||[]).filter(i=>i.schema_name==='public'&&i.table_name===t.name).map(i=>({name:i.index_name,...parseIndex(i.definition)}));
  for(const ix of t.indexes||[]) {
    const byName=pidx.find(p=>p.name===ix.name);
    if(byName && sameIndexShape(ix,byName)) continue;
    const semantic=pidx.find(p=>sameIndexShape(ix,p));
    if(semantic){informational.push({kind:'INDEX_NAME_DIFFERENCE',table:t.name,index:ix.name,productionIndex:semantic.name,declared:ix});continue;}
    if(byName) issues.push({kind:'INDEX_DRIFT',table:t.name,index:ix.name,declared:ix,production:byName});
    else issues.push({kind:'INDEX_MISSING',table:t.name,index:ix.name,declared:ix});
  }
  matchedTables++;
}

const enumIssues=[];
const byEnum=new Map();
for(const e of prod.enumValues||[]){if(e.schema_name!=='public')continue;if(!byEnum.has(e.enum_name))byEnum.set(e.enum_name,[]);byEnum.get(e.enum_name).push(e.enum_value)}
for(const e of dec.enums||[]){const p=byEnum.get(e.name)||[];if(JSON.stringify(p)!==JSON.stringify(e.values))enumIssues.push({kind:'ENUM_DRIFT',enum:e.name,declared:e.values,production:p})}
issues.push(...enumIssues);
const counts={
  declaredTables:declaredTables.size, productionPublicTables:prodTables.size, matchedTables,
  missingTables:missingTables.length, extraTables:extraTables.length,
  structuralIssues:issues.length, informationalDifferences:informational.length,
};
const byKind={}; for(const i of issues) byKind[i.kind]=(byKind[i.kind]||0)+1;
const informationalByKind={}; for(const i of informational) informationalByKind[i.kind]=(informationalByKind[i.kind]||0)+1;
const result={generatedAt:new Date().toISOString(),scope:'FULL_CONTRACT_B2B3_DISPOSABLE',counts,byKind,informationalByKind,missingTables,extraTables,issues,informational};
const out=path.resolve('artifacts/schema/disposable-schema-full-diff.json');
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(`Disposable schema contract diff written: ${out}`);
console.log(`MATCHED_TABLES=${matchedTables} MISSING_TABLES=${missingTables.length} EXTRA_TABLES=${extraTables.length} STRUCTURAL_ISSUES=${issues.length} INFORMATIONAL_DIFFERENCES=${informational.length}`);
console.log(`ISSUES_BY_KIND=${JSON.stringify(byKind)}`);
console.log(`INFO_BY_KIND=${JSON.stringify(informationalByKind)}`);
if(missingTables.length||extraTables.length||issues.length) process.exitCode=10;
