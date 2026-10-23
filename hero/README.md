# HERE DX components

Interactive reference for the reusable Developer Experience (DX) page components on here.com.
One static site: no build step.

| Path | What it is |
| --- | --- |
| `/` | Landing page linking every component |
| `/hero` | DX Hero explorer: 8 variants (code snippet / tabs × dark / light × horizontal / vertical) |
| `/cta` | DX CTA explorer: 8 variants (single / pair / list / card × dark / light), 4 action types |
| `src/hero/`, `src/cta/` | Reference CSS + JS for each component (what every mockup is rendered from) |

Each explorer is self-contained (fonts, CSS, JS inlined), so a page can also be opened on its own.

## Deploy on Vercel

Add New → Project → import this repo → Framework preset **Other** → leave Build Command and
Output Directory empty → Deploy. Every push redeploys.

`vercel.json` sends `X-Robots-Tag: noindex` and every page carries `<meta name="robots" content="noindex">`,
so the site stays out of search and answer engines. Restrict who can open it with Vercel Deployment Protection.

## Adding a component (e.g. DX Banner)

Add a folder (`/banner/index.html`), its source under `src/banner/`, and a card on `index.html`.

## Notes

- Sample copy is draft. Claude Code, Cursor and Kiro configs and the free-API-key offer await Product verification.
- The CTA download form is a stand-in for Marketo form 3451.
- Copy edits in the explorers are saved only in each viewer's browser; use "Copy entry JSON" to hand them on.
