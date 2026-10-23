// Storage for page reviews. Files starting with "_" are not routes on Vercel.
// Uses Neon Postgres via DATABASE_URL (set when the Neon store is connected to the project).
// DX_REVIEW_DB=memory switches to an in-memory store for local testing.
import { neon } from '@neondatabase/serverless';

let ready = null;
const mem = { comments: [], versions: [], id: 0 };

function memoryStore() {
  return {
    async listComments(page) { return mem.comments.filter(c => c.page === page).sort((a, b) => a.created_at < b.created_at ? -1 : 1); },
    async addComment(c) { const row = { id: ++mem.id, resolved: false, created_at: new Date().toISOString(), ...c }; mem.comments.push(row); return row; },
    async setResolved(id, resolved, page) { const r = mem.comments.find(c => c.id === id && c.page === page); if (!r) return null; r.resolved = resolved; return r; },
    async latestContent(page) { const v = mem.versions.filter(x => x.page === page); return v.length ? v[v.length - 1] : null; },
    async listVersions(page) { return mem.versions.filter(x => x.page === page).map(({ content, ...rest }) => rest).reverse(); },
    async addVersion(v) { const row = { id: ++mem.id, created_at: new Date().toISOString(), ...v }; mem.versions.push(row); return row; }
  };
}

function neonStore() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL || process.env.POSTGRES_URL;
  if (!url) throw Object.assign(new Error('No database connected. Connect the Neon store to this project in Vercel → Storage.'), { status: 503 });
  const sql = neon(url);
  async function init() {
    if (!ready) ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS review_comments (
        id BIGSERIAL PRIMARY KEY, page TEXT NOT NULL, target TEXT NOT NULL, target_label TEXT NOT NULL DEFAULT '',
        parent_id BIGINT REFERENCES review_comments(id) ON DELETE CASCADE, author TEXT NOT NULL, body TEXT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await sql`CREATE INDEX IF NOT EXISTS review_comments_page ON review_comments(page)`;
      await sql`CREATE TABLE IF NOT EXISTS review_versions (
        id BIGSERIAL PRIMARY KEY, page TEXT NOT NULL, content JSONB NOT NULL, note TEXT NOT NULL, author TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
      await sql`CREATE INDEX IF NOT EXISTS review_versions_page ON review_versions(page, id DESC)`;
    })().catch(e => { ready = null; throw e; });
    return ready;
  }
  return {
    async listComments(page) { await init(); return sql`SELECT id, page, target, target_label, parent_id, author, body, resolved, created_at FROM review_comments WHERE page = ${page} ORDER BY created_at, id`; },
    async addComment(c) { await init(); const r = await sql`INSERT INTO review_comments (page, target, target_label, parent_id, author, body) VALUES (${c.page}, ${c.target}, ${c.target_label}, ${c.parent_id}, ${c.author}, ${c.body}) RETURNING *`; return r[0]; },
    async setResolved(id, resolved, page) { await init(); const r = await sql`UPDATE review_comments SET resolved = ${resolved} WHERE id = ${id} AND page = ${page} RETURNING *`; return r[0] || null; },
    async latestContent(page) { await init(); const r = await sql`SELECT id, content, note, author, created_at FROM review_versions WHERE page = ${page} ORDER BY id DESC LIMIT 1`; return r[0] || null; },
    async listVersions(page) { await init(); return sql`SELECT id, note, author, created_at FROM review_versions WHERE page = ${page} ORDER BY id DESC LIMIT 100`; },
    async addVersion(v) { await init(); const r = await sql`INSERT INTO review_versions (page, content, note, author) VALUES (${v.page}, ${JSON.stringify(v.content)}::jsonb, ${v.note}, ${v.author}) RETURNING id, note, author, created_at`; return r[0]; }
  };
}

let store = null;
export function db() { if (!store) store = process.env.DX_REVIEW_DB === 'memory' ? memoryStore() : neonStore(); return store; }

// Pages this review API accepts. Add a slug here when a new page gets a review view.
export const PAGES = new Set(['docs-mcp', 'hlr-mcp']);

export function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
  const chunks = []; let size = 0;
  for await (const ch of req) { size += ch.length; if (size > 600000) return null; chunks.push(ch); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return null; }
}

export function fail(res, e) {
  const status = e && e.status || 500;
  if (status >= 500) console.error('[review-api]', e);
  send(res, status, { error: status >= 500 && status !== 503 ? 'Server error. Try again in a moment.' : e.message });
}
