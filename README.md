# HERE DX components

Interactive reference for the reusable Developer Experience (DX) page components on here.com.
One static site: no build step.

| Path | What it is |
| --- | --- |
| `/` | Landing page linking every component |
| `/hero` | DX Hero explorer: 8 variants (code snippet / tabs × dark / light × horizontal / vertical) |
| `/cta` | DX CTA explorer: 8 variants (single / pair / list / card × dark / light), 4 action types |
| `/banner` | DX Banner explorer: 8 variants (button / copy URL / copy code / download × dark / light), split or stacked |
| `/examples/docs-mcp`, `/examples/hlr-mcp` | Page examples: full pages built from the components, with a “Show components” overlay and a build list |
| `/review/docs-mcp`, `/review/hlr-mcp` | Page reviews: the Docs MCP and HLR MCP pages with shared comments and copy versions (see below) |
| `src/hero/`, `src/cta/`, `src/banner/` | Reference CSS + JS for each component (what every mockup is rendered from). Banner requires the CTA files. |

Each explorer is self-contained (fonts, CSS, JS inlined), so a page can also be opened on its own.

## Deploy on Vercel

Add New → Project → import this repo → Framework preset **Other** → leave Build Command and
Output Directory empty → Deploy. Every push redeploys.

`vercel.json` sends `X-Robots-Tag: noindex` and every page carries `<meta name="robots" content="noindex">`,
so the site stays out of search and answer engines. Restrict who can open it with Vercel Deployment Protection.

## Adding a component

Add a folder (`/name/index.html`), its source under `src/name/`, and a card on `index.html`.

## Notes

- Sample copy is draft. Claude Code, Cursor and Kiro configs and the free-API-key offer await Product verification.
- The CTA download form is a stand-in for Marketo form 3451.
- Copy edits in the explorers are saved only in each viewer's browser; use "Copy entry JSON" to hand them on.

## Page reviews (comments and copy versions)

`/review/docs-mcp` and `/review/hlr-mcp` render each page from its `content.json` and add:

- **Comments.** Comment on any section, tool card or FAQ question, reply, and resolve. Reviewers type their name once (remembered in their browser); there are no accounts. The site's Vercel password protects both the pages and the API.
- **Edit copy.** A panel with every text on the page and a live preview. **Save new version** needs the editor passcode and appears under **Versions**. The latest saved version is what everyone sees; `content.json` is only the starting copy.

Storage is the Neon Postgres database connected to this project (Vercel → Storage). The API is in `api/`:

| Route | What it does |
| --- | --- |
| `GET/POST/PATCH /api/comments` | List, add (or reply to) and resolve comments for a page |
| `GET/POST /api/content` | Latest saved copy and version list; saving needs the passcode |

Tables (`review_comments`, `review_versions`) are created on first use.

Settings in Vercel → Settings → Environment Variables:

- `DATABASE_URL` (or `STORAGE_URL`): added when the Neon store is connected.
- `EDITOR_PASSCODE`: the passcode for saving copy. Without it, editing previews but can't save. Mark it Sensitive; redeploy after adding it.

To add a review for another page: copy `review/docs-mcp/`, change its `page.js` renderer, `content.json` and slug, and add the slug to `PAGES` in `api/_db.js`.

Local test without a database: `DX_REVIEW_DB=memory EDITOR_PASSCODE=test` with any server that routes `/api/*` to the files in `api/`.
