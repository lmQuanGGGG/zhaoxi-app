import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = 'migrations/canonical/19.0.0';
const manifest = JSON.parse(fs.readFileSync(dir + '/manifest.json', 'utf8'));
const policy = JSON.parse(fs.readFileSync(dir + '/ledger-policy.json', 'utf8'));
const retirement = JSON.parse(fs.readFileSync(dir + '/legacy-retirement-map.json', 'utf8'));
const verification = JSON.parse(fs.readFileSync('artifacts/canonical-baseline/19.0.0/verification.json', 'utf8'));
const canonical = fs.readFileSync(dir + '/0000_full_schema.sql');
const generated = fs.readFileSync('artifacts/canonical-baseline/19.0.0/0000_far_vivisector.sql');
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

execFileSync(process.execPath, ['scripts/db/verify-migration-governance.mjs'], { stdio: 'inherit' });

const checks = [
  [manifest.release === '19.0.0', 'Canonical manifest is Release 19.0.0'],
  [manifest.architecture === 'canonical-baseline-convergence', 'Canonical convergence architecture is locked'],
  [manifest.baseline?.file === '0000_full_schema.sql', 'Fresh canonical baseline is 0000_full_schema.sql'],
  [manifest.requiredBootstrap?.file === '0001_required_bootstrap.sql', 'Required bootstrap is 0001_required_bootstrap.sql'],
  [manifest.futureMigrationStart === '0002', 'Future canonical migration numbering starts at 0002'],
  [manifest.legacyScriptsRetired === 51, 'Exactly 51 legacy migration scripts are retired'],
  [manifest.drizzleLegacyLedgerBootstrapped === false, 'Legacy Drizzle ledger is not bootstrapped'],
  [policy.production?.replayBaseline === false, 'Production canonical baseline replay is forbidden'],
  [policy.production?.attestationRequiredBeforeFutureCanonicalMigrations === true, 'Production attestation is required before future canonical migrations'],
  [policy.legacy?.preserveForHistoricalAudit === true, 'Legacy scripts are preserved for audit only'],
  [retirement.legacyScripts?.length === 51, 'Legacy retirement map contains 51 scripts'],
  [verification.declaredTables === 90 && verification.createdTables === 90, 'Canonical baseline creates all 90 declared tables'],
  [verification.schemaOnly === true, 'Generated canonical baseline is schema-only'],
  [verification.missingTables?.length === 0 && verification.extraTables?.length === 0, 'Canonical baseline has no missing or extra tables'],
  [verification.missingEnums?.length === 0 && verification.missingInvariants?.length === 0, 'Canonical baseline has no missing enums or invariants'],
  [sha(canonical) === manifest.baseline.sha256, 'Canonical baseline hash matches locked manifest'],
  [sha(generated) === manifest.baseline.sha256, 'Generated baseline hash matches locked manifest'],
  [Buffer.compare(canonical, generated) === 0, 'Packaged canonical baseline is byte-identical to verified generated baseline'],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error('FAIL: ' + message);
  process.exit(1);
}

console.log('ZhaoXi 19.0.0 Sprint K Backend verified: canonical baseline convergence, locked hashes, 90-table schema completeness, production no-replay policy, attestation gate, 51-script legacy retirement, future 0002 numbering, and governance compatibility PASS.');
