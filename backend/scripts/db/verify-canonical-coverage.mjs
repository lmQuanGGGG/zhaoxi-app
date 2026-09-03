import fs from 'node:fs';
import path from 'node:path';
const p=path.resolve('artifacts/schema/migration-archaeology.json');
if(!fs.existsSync(p)){ console.error('ERROR: run analyze-migration-archaeology.mjs first.'); process.exit(2); }
const r=JSON.parse(fs.readFileSync(p,'utf8'));
const expectedOverlap=['delivery_job_events','driver_location_history','payment_events','payment_transactions','support_conversations','support_messages'].sort();
const actualOverlap=[...(r.overlap||[])].sort();
const assertions=[
 ['declared tables',r.counts.declaredTables,90],
 ['canonical files',r.counts.canonicalFiles,6],
 ['legacy files',r.counts.legacyFiles,51],
 ['canonical tables',r.counts.canonicalTables,24],
 ['legacy tables',r.counts.legacyTables,72],
 ['union tables',r.counts.unionTables,90],
 ['overlap tables',r.counts.overlapTables,6],
 ['missing from canonical',r.counts.missingFromCanonical,66],
 ['missing from all',r.counts.missingFromAll,0],
 ['extra in all',r.counts.extraInAll,0],
];
const failures=assertions.filter(([,a,e])=>a!==e).map(([n,a,e])=>`${n}: expected ${e}, got ${a}`);
if(JSON.stringify(actualOverlap)!==JSON.stringify(expectedOverlap)) failures.push(`overlap mismatch: ${JSON.stringify(actualOverlap)}`);
const out={generatedAt:new Date().toISOString(),pass:failures.length===0,assertions:assertions.map(([name,actual,expected])=>({name,actual,expected,pass:actual===expected})),overlap:actualOverlap,failures};
const outPath=path.resolve('artifacts/schema/canonical-coverage.json'); fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
if(failures.length){ console.error('ZhaoXi 19.0.0 Sprint B2B.1 canonical coverage FAIL'); failures.forEach(x=>console.error(`- ${x}`)); process.exit(10); }
console.log('ZhaoXi 19.0.0 Sprint B2B.1 canonical coverage PASS: 90 declared tables are fully represented by canonical+legacy history; canonical 0000..0005 covers 24 tables and B2B must converge the remaining 66.');
