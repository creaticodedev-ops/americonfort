import Car from '../models/Car.js';
import { buildPublicVisibleCarFilter } from '../utils/carCatalog.js';

/** Canonical public host for all sitemap locs (Phase 1 SEO). */
const CANONICAL_SITE = 'https://www.americonfort.com';

const STATIC_PATHS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/cars', changefreq: 'daily', priority: '0.9' },
  { path: '/location-voiture-casablanca-aeroport', changefreq: 'weekly', priority: '0.95' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/insurance', changefreq: 'yearly', priority: '0.4' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
];

const siteBase = () => {
  const raw = (process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || CANONICAL_SITE)
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  if (!raw) return CANONICAL_SITE;
  try {
    const host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
    if (/americonfort\.com$/i.test(host)) return CANONICAL_SITE;
  } catch {
    return CANONICAL_SITE;
  }
  return raw;
};

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Dynamic sitemap — only publicly visible cars are listed as detail URLs.
 * Hidden / offline / maintenance vehicles are excluded.
 * Served at API /sitemap.xml and proxied to https://www.americonfort.com/sitemap.xml
 */
export const getPublicSitemap = async (_req, res) => {
  try {
    const base = siteBase();
    const publicFilter = await buildPublicVisibleCarFilter();
    const cars = await Car.find(publicFilter)
      .select('_id updatedAt brand model')
      .sort({ updatedAt: -1 })
      .lean();

    const urls = [
      ...STATIC_PATHS.map((p) => ({
        loc: `${base}${p.path === '/' ? '/' : p.path}`,
        changefreq: p.changefreq,
        priority: p.priority,
      })),
      ...cars.map((car) => ({
        loc: `${base}/car-details/${car._id}`,
        lastmod: car.updatedAt ? new Date(car.updatedAt).toISOString() : undefined,
        changefreq: 'weekly',
        priority: '0.7',
      })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const lastmod = u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : '';
    return `  <url>
    <loc>${escapeXml(u.loc)}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.status(200).send(body);
  } catch (error) {
    console.error('[sitemap]', error.message);
    res.status(500).type('text/plain').send('Failed to generate sitemap');
  }
};

export default { getPublicSitemap };
