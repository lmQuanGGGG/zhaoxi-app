import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const dir=path.resolve('migrations/canonical/19.0.0');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const policy=JSON.parse(fs.readFileSync(path.join(dir,'ledger-policy.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=path.join(dir,manifest.baseline.file);
const bootstrap=path.join(dir,manifest.requiredBootstrap.file);
const packageScript=fs.readFileSync('scripts/db/package-canonical-release.mjs','utf8');
const generator=fs.readFileSync('scripts/db/generate-canonical-baseline.mjs','utf8');

const checks=[
 [manifest.release==='19.0.0','Manifest remains Release 19.0.0'],
 [manifest.architecture==='canonical-baseline-convergence','Canonical convergence architecture remains locked'],
 [manifest.baseline?.file==='0000_full_schema.sql','Frozen baseline remains 0000_full_schema.sql'],
 [manifest.requiredBootstrap?.file==='0001_required_bootstrap.sql','Required bootstrap remains 0001_required_bootstrap.sql'],
 [manifest.futureMigrationStart==='0002','Forward migration chain starts at 0002'],
 [sha(baseline)===manifest.baseline.sha256,'Frozen baseline hash matches manifest'],
 [sha(bootstrap)===manifest.requiredBootstrap.sha256,'Bootstrap hash matches manifest'],
 [manifest.baseline.tables===90,'Frozen baseline remains the 90-table baseline'],
 [policy.production?.replayBaseline===false,'Production baseline replay remains forbidden'],
 [policy.production?.attestationRequiredBeforeFutureCanonicalMigrations===true,'Production attestation remains mandatory'],
 [packageScript.includes('canonical 0000 baseline is frozen'),'Canonical packager refuses to rewrite frozen 0000'],
 [generator.includes('db/schema.ts'),'Legacy baseline generator remains identifiable as schema-derived and must not be used for forward migrations'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.1 verified: canonical 0000/0001 hashes remain frozen; production replay remains forbidden; future schema evolution is constrained to forward migrations beginning at 0002 PASS.');
