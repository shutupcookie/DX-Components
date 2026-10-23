// GET  /api/status                → { pages: [{ page, status, live_url, author, updated_at, open_comments, last_activity }] }
// GET  /api/status?page=docs-mcp  → { status: { page, status, live_url, ... } }
// POST /api/status { page, status, liveUrl, author, passcode } → { status }
// Statuses: open (taking comments), closed (team making changes), approved, published. Pages without a row are 'open'.
import { db, PAGES, STATUSES, clean, send, readJson, fail, passOk } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const page = clean(new URL(req.url, 'http://x').searchParams.get('page'), 40);
      if (!page) {
        const pages = (await db().summary()).map(p => ({ ...p, status: p.status || 'open' }));
        return send(res, 200, { pages });
      }
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      const st = await db().getStatus(page);
      return send(res, 200, { status: st || { page, status: 'open', live_url: '', author: '', updated_at: null } });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      if (!b) return send(res, 400, { error: 'Invalid request.' });
      const page = clean(b.page, 40);
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      const ok = passOk(b.passcode);
      if (ok === null) return send(res, 403, { error: 'No editor passcode is set for this site.' });
      if (!ok) return send(res, 401, { error: 'Wrong editor passcode.' });
      const status = clean(b.status, 20);
      if (!STATUSES.includes(status)) return send(res, 400, { error: 'Unknown status.' });
      let live = clean(b.liveUrl, 300);
      if (live && !/^https:\/\//i.test(live)) return send(res, 400, { error: 'The live page link must start with https://' });
      return send(res, 200, { status: await db().setStatus(page, status, live, clean(b.author, 80) || 'Editor') });
    }
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (e) { return fail(res, e); }
}
