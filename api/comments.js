// GET  /api/comments?page=docs-mcp                     → { comments: [...] }
// POST /api/comments  { page, target, targetLabel, parentId?, author, body }  → { comment }
// PATCH /api/comments { page, id, resolved }           → { comment }
import { db, PAGES, clean, send, readJson, fail } from './_db.js';

const CLOSED = { closed: 'Comments are closed for this page while the team makes changes.', approved: 'This page is approved, so comments are closed.', published: 'This page is published, so comments are closed.' };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const page = clean(new URL(req.url, 'http://x').searchParams.get('page'), 40);
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      return send(res, 200, { comments: await db().listComments(page) });
    }
    if (req.method === 'POST' || req.method === 'PATCH') {
      const b = await readJson(req);
      if (!b) return send(res, 400, { error: 'Invalid request.' });
      const page = clean(b.page, 40);
      if (!PAGES.has(page)) return send(res, 400, { error: 'Unknown page.' });
      if (req.method === 'PATCH') {
        const id = Number(b.id);
        if (!Number.isInteger(id) || id < 1) return send(res, 400, { error: 'Invalid comment.' });
        const row = await db().setResolved(id, !!b.resolved, page);
        return row ? send(res, 200, { comment: row }) : send(res, 404, { error: 'Comment not found.' });
      }
      const st = await db().getStatus(page);
      if (st && st.status !== 'open') return send(res, 403, { error: CLOSED[st.status] || 'Comments are closed for this page.' });
      const c = {
        page,
        target: clean(b.target, 80),
        target_label: clean(b.targetLabel, 120),
        parent_id: b.parentId ? Number(b.parentId) : null,
        author: clean(b.author, 80),
        body: clean(b.body, 4000)
      };
      if (!c.target || !c.author || !c.body) return send(res, 400, { error: 'Add your name and a comment.' });
      if (c.parent_id !== null && (!Number.isInteger(c.parent_id) || c.parent_id < 1)) return send(res, 400, { error: 'Invalid reply.' });
      return send(res, 201, { comment: await db().addComment(c) });
    }
    res.setHeader('Allow', 'GET, POST, PATCH');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (e) { return fail(res, e); }
}
