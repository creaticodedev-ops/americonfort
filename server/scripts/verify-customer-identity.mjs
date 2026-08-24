/**
 * Lightweight unit checks for customer identity scoring (no DB).
 * Run: node server/scripts/verify-customer-identity.mjs
 */
import assert from 'node:assert/strict';
import {
  scoreIdentityMatch,
  pickBestIdentityMatch,
  buildCustomerKey,
  namesCompatible,
  normalizeOfficialId,
  identityFromFields,
  CONFIDENT_MATCH_SCORE,
} from '../services/customerIdentity.js';

const score = (incoming, candidate) => scoreIdentityMatch(identityFromFields(incoming), candidate);

// Same CIN → definitive merge
{
  const r = score(
    { name: 'Hamid Test', phone: '+212665330116', identityDocumentNumber: 'HH567898' },
    { customerName: 'HAMID TEST', customerPhone: '+212665330116', identityDocumentNumber: 'HH 567898' },
  );
  assert.ok(r.score >= 100, `CIN match should be definitive, got ${r.score}`);
  assert.ok(r.reasons.includes('cin'));
}

// Shared phone + different CIN → reject
{
  const r = score(
    { name: 'Fatima Alaoui', phone: '+212665330116', identityDocumentNumber: 'AB111111' },
    { customerName: 'Hamid Test', customerPhone: '+212665330116', identityDocumentNumber: 'HH567898' },
  );
  assert.equal(r.reject, true, 'conflicting CIN must reject');
  assert.ok(r.score < 0);
}

// Shared phone + no names yet → still usable for walk-in lookup
{
  const r = score(
    { phone: '+212665330116' },
    { customerName: 'Hamid Test', customerPhone: '+212665330116' },
  );
  assert.ok(r.score >= CONFIDENT_MATCH_SCORE, `phone without incoming name should match (${r.score})`);
}

// Shared phone + different names, no IDs → do not confidently merge
{
  const r = score(
    { name: 'Fatima Alaoui', phone: '+212665330116' },
    { customerName: 'Hamid Test', customerPhone: '+212665330116' },
  );
  assert.ok(r.score < CONFIDENT_MATCH_SCORE, `shared phone + name mismatch must not auto-merge (${r.score})`);
}

// Shared phone + compatible name → confident
{
  const r = score(
    { name: 'Hamid Test', phone: '+212665330116' },
    { customerName: 'HAMID TEST', customerPhone: '+212665330116' },
  );
  assert.ok(r.score >= CONFIDENT_MATCH_SCORE, `phone+name should merge (${r.score})`);
}

// Keys prefer CIN over phone
assert.equal(
  buildCustomerKey(identityFromFields({ phone: '+212665330116', identityDocumentNumber: 'hh567898', name: 'A' })),
  'cin:HH567898',
);
assert.match(
  buildCustomerKey(identityFromFields({ phone: '+212665330116', name: 'Hamid Test' })),
  /^phone:\+212665330116:n:/,
);

// Ambiguous: two strong phone+name candidates without definitive ID
{
  const incoming = identityFromFields({ phone: '+212611111111', name: 'Ali' });
  const picked = pickBestIdentityMatch(incoming, [
    { _id: '1', customerName: 'Ali Ben', customerPhone: '+212611111111' },
    { _id: '2', customerName: 'Ali', customerPhone: '+212611111111' },
  ]);
  // Both may score confidently; if close → ambiguous
  if (picked.ambiguous) {
    assert.equal(picked.match, null);
  } else {
    assert.ok(picked.match);
  }
}

assert.equal(normalizeOfficialId('hh-56 78.98'), 'HH567898');
assert.equal(namesCompatible('Hamid Test', 'HAMID TEST'), true);
assert.equal(namesCompatible('Hamid Test', 'Fatima Alaoui'), false);

console.log('verify-customer-identity: ok');
