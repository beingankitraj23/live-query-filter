// GET /api/search?search=&category=&level=&sort=&page=&limit=
// category and level accept repeated params or comma lists:
//   ?category=Security&category=Design   or   ?category=Security,Design

const catalog = require('../data/catalog.json');

const CATEGORIES = [...new Set(catalog.map((i) => i.category))].sort();
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const SORTERS = {
  default: (a, b) => a.id - b.id,
  rating: (a, b) => b.rating - a.rating || a.id - b.id,
  shortest: (a, b) => a.durationMinutes - b.durationMinutes || a.id - b.id,
  longest: (a, b) => b.durationMinutes - a.durationMinutes || a.id - b.id,
};

const multi = (params, key) =>
  new Set(
    params
      .getAll(key)
      .flatMap((v) => v.split(','))
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

function search(params) {
  const tokens = (params.get('search') || '').toLowerCase().split(/\s+/).filter(Boolean);
  const cats = multi(params, 'category');
  const lvls = multi(params, 'level');
  const sortKey = SORTERS[params.get('sort')] ? params.get('sort') : 'default';
  const limit = Math.min(Math.max(toInt(params.get('limit'), DEFAULT_LIMIT), 1), MAX_LIMIT);

  const matchesText = (i) => {
    if (!tokens.length) return true;
    const hay = `${i.title} ${i.category} ${i.level} ${i.id}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  };
  const matchesCat = (i) => !cats.size || cats.has(i.category.toLowerCase());
  const matchesLvl = (i) => !lvls.size || lvls.has(i.level.toLowerCase());

  const results = catalog.filter((i) => matchesText(i) && matchesCat(i) && matchesLvl(i)).sort(SORTERS[sortKey]);

  // Facet counts: each facet ignores its own filter so users can see what ticking another box would yield.
  const facets = { category: {}, level: {} };
  CATEGORIES.forEach((c) => (facets.category[c] = 0));
  LEVELS.forEach((l) => (facets.level[l] = 0));
  catalog.forEach((i) => {
    if (matchesText(i) && matchesLvl(i)) facets.category[i.category]++;
    if (matchesText(i) && matchesCat(i)) facets.level[i.level]++;
  });

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(toInt(params.get('page'), 1), 1), totalPages);
  const data = results.slice((page - 1) * limit, page * limit);

  return {
    data,
    meta: { total, page, limit, totalPages, hasPrev: page > 1, hasNext: page < totalPages, sort: sortKey },
    facets,
  };
}

module.exports = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  try {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const body = JSON.stringify(search(params));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.end(body);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Search failed' }));
  }
};

module.exports.search = search;
