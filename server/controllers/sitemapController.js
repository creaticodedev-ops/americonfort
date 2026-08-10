import Car from '../models/Car.js';
import { PUBLIC_VISIBLE_CAR_FILTER } from '../utils/carCatalog.js';

const siteBase = () => {
  const raw = (process.env.CLIENT_URL || process.env.PUBLIC_SITE_URL || 'https://www.americonfort.com')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
  return raw || 'https://www.americonfort.com';
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
 */
export const getPublicSitemap = async (_req, res) => {
  try {
    const base = siteBase();
    const cars = await Car.find(PUBLIC_VISIBLE_CAR_FILTER)
      .select('_id updatedAt brand model')
      .sort({ updatedAt: -1 })
      .lean();

    const urls = [
      { loc: `${base}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${base}/cars`, changefreq: 'daily', priority: '0.9' },
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
    res.status(200).send(body);
  } catch (error) {
    console.error('[sitemap]', error.message);
    res.status(500).type('text/plain').send('Failed to generate sitemap');
  }
};

export default { getPublicSitemap };
