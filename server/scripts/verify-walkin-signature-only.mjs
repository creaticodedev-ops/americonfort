/**
 * Walk-in signature-only completion rules (no DB required for channel helpers).
 * Run: node server/scripts/verify-walkin-signature-only.mjs
 */
import { isWalkInChannel, isOnlineChannel } from '../utils/bookingChannel.js';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

assert(isWalkInChannel('walk_in') === true, 'walk_in channel detected');
assert(isWalkInChannel('walk-in') === true, 'walk-in alias detected');
assert(isWalkInChannel('online') === false, 'online is not walk-in');
assert(isOnlineChannel('whatsapp') === true, 'whatsapp stays online flow');
assert(isOnlineChannel('walk_in') === false, 'walk-in is not online channel');

console.log(JSON.stringify({ pass: true, scenario: 'walk-in-signature-only-flags' }, null, 2));
