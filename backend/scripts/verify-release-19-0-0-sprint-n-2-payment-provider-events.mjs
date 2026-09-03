import fs from 'node:fs';
import crypto from 'node:crypto';

const schema=fs.readFileSync('db/schema.ts','utf8');
const manifest=JSON.parse(fs.readFileSync('migrations/canonical/19.0.0/manifest.json','utf8'));
const migrationPath='migrations/canonical/19.0.0/0002_payment_provider_event_registry.sql';
const migration=fs.readFileSync(migrationPath,'utf8');
const sha=crypto.createHash('sha256').update(fs.readFileSync(migrationPath)).digest('hex');
const forward=(manifest.forwardMigrations||[]).find(x=>x.sequence==='0002');

const checks=[
 [manifest.baseline?.sha256==='013a35fdeb234dd035e323551e1032cbca128566dfce531c3397ba3103c79819','Frozen 0000 baseline hash remains unchanged'],
 [manifest.requiredBootstrap?.sha256==='9d70c318b63da3ea7021160d20768cd85a521568e649389f1b75f3e04a4c6090','Frozen 0001 bootstrap hash remains unchanged'],
 [manifest.futureMigrationStart==='0002','Forward migration chain starts at 0002'],
 [forward?.file==='0002_payment_provider_event_registry.sql','Manifest registers canonical 0002'],
 [forward?.sha256===sha,'Manifest locks canonical 0002 hash'],
 [forward?.requiresProductionAttestation===true,'0002 requires production attestation'],
 [schema.includes('export const paymentProviderEvents = pgTable('),'Runtime schema declares payment provider event registry'],
 [schema.includes('uniqueIndex("payment_provider_events_provider_event_unique")'),'Runtime schema enforces provider event uniqueness'],
 [schema.includes('payloadHash: varchar("payload_hash"'),'Runtime schema preserves raw payload hash'],
 [schema.includes('signatureTimestamp: varchar("signature_timestamp"'),'Runtime schema captures signature timestamp'],
 [schema.includes('signatureNonce: varchar("signature_nonce"'),'Runtime schema captures signature nonce'],
 [migration.includes('CREATE TABLE "payment_provider_events"'),'0002 creates provider event registry'],
 [migration.includes('CREATE UNIQUE INDEX "payment_provider_events_provider_event_unique"'),'0002 enforces provider event uniqueness'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.2 verified: payment provider event registry is declared in runtime schema and canonical 0002; provider event uniqueness, payload hash, signature metadata, locked migration hash, frozen 0000/0001, and production-attestation gate PASS.');
