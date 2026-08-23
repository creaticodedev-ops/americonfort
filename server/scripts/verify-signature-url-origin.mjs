/**
 * Unit checks for signature link URL construction (no DB).
 * Run: node scripts/verify-signature-url-origin.mjs
 */
import assert from 'assert';

const run = async () => {
  const prev = {
    CLIENT_URL: process.env.CLIENT_URL,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  const restore = () => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };

  try {
    delete process.env.CLIENT_URL;
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'development';

    // Fresh import each scenario via cache bust is awkward with ESM; mutate env then re-import module state.
    // completionToken reads env at call time, so one import is enough.
    const {
      buildCompletionUrl,
      resolveClientBaseUrl,
      isStaleCompletionUrl,
      generateCompletionToken,
      hashToken,
    } = await import('../services/completionToken.js');

    const token = 'a'.repeat(64);

    // Dev without env → localhost
    assert.strictEqual(resolveClientBaseUrl(), 'http://localhost:5173');
    assert.strictEqual(
      buildCompletionUrl(token),
      `http://localhost:5173/complete-booking/${token}`,
    );

    // CLIENT_URL CORS list → first origin
    process.env.CLIENT_URL = 'https://www.americonfort.com,https://americonfort.com';
    assert.strictEqual(resolveClientBaseUrl(), 'https://www.americonfort.com');
    assert.strictEqual(
      buildCompletionUrl(token),
      `https://www.americonfort.com/complete-booking/${token}`,
    );

    // Apex WordPress host must not be used for signature links
    process.env.CLIENT_URL = 'https://americonfort.com';
    assert.strictEqual(resolveClientBaseUrl(), 'https://www.americonfort.com');

    // PUBLIC_SITE_URL fallback when CLIENT_URL missing
    delete process.env.CLIENT_URL;
    process.env.PUBLIC_SITE_URL = 'https://www.americonfort.com';
    assert.strictEqual(resolveClientBaseUrl(), 'https://www.americonfort.com');

    // Production without env → canonical SPA (never localhost)
    delete process.env.CLIENT_URL;
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    assert.strictEqual(resolveClientBaseUrl(), 'https://www.americonfort.com');
    assert.ok(!buildCompletionUrl(token).includes('localhost'));

    // Stale URL detection
    process.env.NODE_ENV = 'development';
    process.env.CLIENT_URL = 'https://www.americonfort.com';
    assert.strictEqual(isStaleCompletionUrl('http://localhost:5173/complete-booking/abc'), true);
    assert.strictEqual(
      isStaleCompletionUrl(`https://www.americonfort.com/complete-booking/${token}`),
      false,
    );

    // Token helpers
    const gen = generateCompletionToken();
    assert.ok(gen.token.length >= 40);
    assert.strictEqual(hashToken(gen.token), gen.tokenHash);
    assert.ok(gen.expiresAt instanceof Date);

    console.log('OK: signature URL origin resolution');
  } finally {
    restore();
  }
};

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
