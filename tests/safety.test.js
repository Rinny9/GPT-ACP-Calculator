const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const engine = script.split('// ============ DIRECTIVE QUICK REFERENCE')[0];
const context = { module: { exports: {} }, console };
vm.runInNewContext(engine, context);

const { buildPatient, airway, drugCalcs } = context.module.exports;

const exactDay = buildPatient({ ageYears: 1 / 365.25, weightKg: 3 });
assert(drugCalcs(exactDay).arrest.length > 0, 'Exactly 24 h must use the arrest pathway');
assert.strictEqual(drugCalcs(exactDay).newborn.length, 0, 'Exactly 24 h must not use the newborn pathway');

const underDay = buildPatient({ ageYears: 0.999 / 365.25, weightKg: 3 });
assert.strictEqual(drugCalcs(underDay).arrest.length, 0, 'Under 24 h must not use the arrest pathway');
assert(drugCalcs(underDay).newborn.length > 0, 'Under 24 h must use the newborn pathway');

const unknownAge = buildPatient({ ageYears: null, weightKg: 20 });
assert.strictEqual(unknownAge.isPeds, null, 'Weight alone cannot classify adult/pediatric');
assert.strictEqual(unknownAge.normoSBP, null, 'Unknown age cannot receive an adult BP default');
assert.strictEqual(unknownAge.hypoglycemia, null, 'Unknown age cannot receive an adult glucose threshold');
const unknownDrugs = drugCalcs(unknownAge);
assert.strictEqual(unknownDrugs.arrest.length, 0, 'Age-unknown arrest doses must be suppressed');
assert(unknownDrugs.fluids.some(row => row.name === 'Maintenance' && /suppressed/.test(row.dose)));
assert(unknownDrugs.metab.some(row => row.name === 'Dextrose' && row.dose === 'Age required'));
assert(!unknownDrugs.metab.some(row => /D50W/.test(row.name)), 'D50 age branch must not default on unknown age');

const invalidWeightAttempt = buildPatient({ ageYears: 4, weightKg: null, suppressWeightEstimate: true });
assert.strictEqual(invalidWeightAttempt.weightKg, null, 'An invalid typed weight must not fall through to an age estimate');

const child = buildPatient({ ageYears: 10, weightKg: 30, sex: 'm', heightCm: 140 });
assert.strictEqual(child.ibw, null, 'Adult PBW formula must not run for children');
assert(!airway(child).some(row => row.k.startsWith('Tidal volume')), 'Pediatric actual weight must not drive tidal volume');

const adultWithoutPbw = buildPatient({ ageYears: 40, weightKg: 70 });
assert.strictEqual(adultWithoutPbw.ibw, null, 'Actual weight must not be substituted for adult PBW');
assert(airway(adultWithoutPbw).some(row => row.k === 'Tidal volume' && row.v === 'Not calculated'));

const adult = buildPatient({ ageYears: 40, weightKg: 70, sex: 'm', heightCm: 175 });
assert.strictEqual(adult.ibw, 70.5);
assert(airway(adult).some(row => row.k.startsWith('Tidal volume') && /mL/.test(row.v)));

const ages = [null, 0, 0.5 / 365.25, 1 / 365.25, 1 / 12, 0.5, 1, 1.99, 2, 7.99, 8, 11.99, 12, 15.99, 16, 17.99, 18, 65, 125];
const weights = [null, 0.3, 2.5, 3, 5.5, 10, 24.9, 25, 39.9, 40, 52, 70, 400];
for (const ageYears of ages) {
  for (const weightKg of weights) {
    const patient = buildPatient({ ageYears, weightKg, sex: 'm', heightCm: 175 });
    const output = JSON.stringify({ patient, airway: airway(patient), drugs: drugCalcs(patient) });
    assert(!/NaN|Infinity|undefined/.test(output), `Invalid numeric output at age=${ageYears}, weight=${weightKg}`);
  }
}

const pedsStart = html.indexOf('const PEDS54 = ');
const pedsEnd = html.indexOf('const PEDS_BHP_LIST');
const pedsHash = crypto.createHash('sha256').update(html.slice(pedsStart, pedsEnd)).digest('hex');
assert.strictEqual(pedsHash, '4dcdf50054aa3f4c74f197be5338d139b3da961b5fd994e397aa164ba4a3d2a9', 'PDC dataset changed; revalidate every affected row');

console.log(`Safety checks passed (${ages.length * weights.length} boundary combinations; PDC dataset locked).`);
