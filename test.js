const assert = require('assert');
const { search } = require('./api/search');
const q = (s) => search(new URLSearchParams(s));

let r = q('');
assert.strictEqual(r.meta.total, 250); assert.strictEqual(r.data.length, 12); assert.strictEqual(r.meta.totalPages, 21);

r = q('category=Security,Design');
assert(r.data.every((i) => ['Security', 'Design'].includes(i.category))); assert.strictEqual(r.meta.total, 127);

r = q('category=Security&category=Design');
assert.strictEqual(r.meta.total, 127);

r = q('search=security&level=Beginner&category=Security');
assert(r.data.every((i) => i.category === 'Security' && i.level === 'Beginner'));

r = q('page=999&limit=10'); assert.strictEqual(r.meta.page, 25);
r = q('page=-4&limit=1000'); assert.strictEqual(r.meta.page, 1); assert.strictEqual(r.meta.limit, 50);
r = q('search=zzzz'); assert.strictEqual(r.meta.total, 0); assert.strictEqual(r.meta.totalPages, 1); assert.deepStrictEqual(r.data, []);
r = q('sort=rating&limit=5'); assert(r.data[0].rating >= r.data[4].rating);
r = q('category=Security'); assert.strictEqual(r.facets.category.Design, 54); // facet ignores its own filter
console.log('all tests passed');
