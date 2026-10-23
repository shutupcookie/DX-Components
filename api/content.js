// GET  /api/content?page=docs-mcp   → { content|null, versions: [{id, note, author, created_at}] }
// POST /api/content { page, content, note, author, passcode } → { version }
// Saving needs the editor passcode set as EDITOR_PASSCODE in Vercel → Settings → Environment Variables.
import { timingSafeEqual } from 'node:crypto';
import { db, PAGES, clean, send, readJson, fail } from './_db.js';

function passOk(given) {
  const want = process.env.EDITOR_PASSCODE || '';
  if (!want) return null;
  const a = Buffer.from(String(given || '')), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const page = clean(new URL(req.url, 'http://x').searchParams.get('page'), 40);
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      const [latest, versions] = await Promise.all([db().latestContent(page), db().listVersions(page)]);
      return send(res, 200, { content: latest ? latest.content : null, versions, editing: !!process.env.EDITOR_PASSCODE });
    }
    if (req.method === 'POST') {
      const b = await readJson(req);
      if (!b) return send(res, 400, { error: 'Invalid request, or the page content is too large.' });
      const page = clean(b.page, 40);
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      const ok = passOk(b.passcode);
      if (ok === null) return send(res, 403, { error: 'Editing is off: no editor passcode is set for this site.' });
      if (!ok) return send(res, 401, { error: 'Wrong editor passcode.' });
      if (!b.content || typeof b.content !== 'object' || Array.isArray(b.content)) return send(res, 400, { error: 'Invalid content.' });
      const v = { page, content: b.content, note: clean(b.note, 200) || 'Copy edits', author: clean(b.author, 80) || 'Editor' };
      return send(res, 201, { version: await db().addVersion(v) });
    }
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (e) { return fail(res, e); }
}
