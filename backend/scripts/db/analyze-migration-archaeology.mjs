import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const schemaPath = path.join(cwd, 'db', 'schema.ts');
const migrationsDir = path.join(cwd, 'migrations');
const scriptsDir = path.join(cwd, 'scripts');
const outDir = path.join(cwd, 'artifacts', 'schema');
fs.mkdirSync(outDir, { recursive: true });

function read(p){ return fs.readFileSync(p, 'utf8'); }
function names(dir, rx){ return fs.readdirSync(dir).filter(n => rx.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})); }
function uniq(a){ return [...new Set(a)].sort(); }

const schema = read(schemaPath);
const declaredTables = uniq([...schema.matchAll(/pgTable\(\s*["']([^"']+)["']/g)].map(m=>m[1]));
const declaredEnums = uniq([...schema.matchAll(/pgEnum\(\s*["']([^"']+)["']/g)].map(m=>m[1]));

const canonicalFiles = names(migrationsDir, /^\d{4}_.+\.sql$/);
const legacyFiles = names(scriptsDir, /^migrate-.+\.mjs$/);
const createTableRx = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["`]?([A-Za-z0-9_]+)/gi;
const opPatterns = {
  createTable: /CREATE\s+TABLE\b/gi,
  alterTable: /ALTER\s+TABLE\b/gi,
  createIndex: /CREATE\s+(?:UNIQUE\s+)?INDEX\b/gi,
  createType: /CREATE\s+TYPE\b/gi,
  alterType: /ALTER\s+TYPE\b/gi,
  dropSchemaObject: /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX|CONSTRAINT)\b/gi,
  insert: /\bINSERT\s+INTO\b/gi,
  update: /\bUPDATE\s+[A-Za-z_]/gi,
  delete: /\bDELETE\s+FROM\b/gi,
};
function countOps(text){
  const out={};
  for(const [k,rx0] of Object.entries(opPatterns)){
    const rx=new RegExp(rx0.source,rx0.flags); out[k]=(text.match(rx)||[]).length;
  }
  return out;
}
function createdTables(text){
  const rx=new RegExp(createTableRx.source,createTableRx.flags); return uniq([...text.matchAll(rx)].map(m=>m[1]));
}

const canonical = canonicalFiles.map(file=>{
  const text=read(path.join(migrationsDir,file)); return {file,tables:createdTables(text),ops:countOps(text)};
});
const legacy = legacyFiles.map(file=>{
  const text=read(path.join(scriptsDir,file)); return {file,tables:createdTables(text),ops:countOps(text)};
});
const canonicalTables=uniq(canonical.flatMap(x=>x.tables));
const legacyTables=uniq(legacy.flatMap(x=>x.tables));
const union=uniq([...canonicalTables,...legacyTables]);
const overlap=canonicalTables.filter(x=>legacyTables.includes(x));
const missingFromCanonical=declaredTables.filter(x=>!canonicalTables.includes(x));
const missingFromAll=declaredTables.filter(x=>!union.includes(x));
const extraInAll=union.filter(x=>!declaredTables.includes(x));
const legacyOperationTotals={};
for(const x of legacy) for(const [k,v] of Object.entries(x.ops)) legacyOperationTotals[k]=(legacyOperationTotals[k]||0)+v;

const report={generatedAt:new Date().toISOString(),counts:{declaredTables:declaredTables.length,declaredEnums:declaredEnums.length,canonicalFiles:canonicalFiles.length,legacyFiles:legacyFiles.length,canonicalTables:canonicalTables.length,legacyTables:legacyTables.length,unionTables:union.length,overlapTables:overlap.length,missingFromCanonical:missingFromCanonical.length,missingFromAll:missingFromAll.length,extraInAll:extraInAll.length},declaredTables,canonicalTables,legacyTables,overlap,missingFromCanonical,missingFromAll,extraInAll,legacyOperationTotals,canonical,legacy};
const out=path.join(outDir,'migration-archaeology.json'); fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`Migration archaeology written: ${out}`);
console.log(`DECLARED=${report.counts.declaredTables} CANONICAL=${report.counts.canonicalTables} LEGACY=${report.counts.legacyTables} UNION=${report.counts.unionTables} OVERLAP=${report.counts.overlapTables}`);
console.log(`MISSING_FROM_CANONICAL=${report.counts.missingFromCanonical} MISSING_FROM_ALL=${report.counts.missingFromAll} EXTRA_IN_ALL=${report.counts.extraInAll}`);
console.log(`LEGACY_OPS=${JSON.stringify(legacyOperationTotals)}`);
if(report.counts.missingFromAll || report.counts.extraInAll) process.exitCode=10;
