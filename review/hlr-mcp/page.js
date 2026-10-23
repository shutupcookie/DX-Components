/* HERE Location Reasoning MCP page: renders the page from its content JSON with the DX components.
   Elements marked data-rv-target are what reviewers can comment on. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function nz(a) { return (a || []).filter(Boolean); }
  function heroLabel(cfg) { var n = DXHero.normalize(cfg); return 'DX Hero ' + DXHero.variantOf(n).n + ' · ' + DXHero.variantId(n); }
  function ctaLabel(cfg) { var n = DXCta.normalize(cfg); return 'DX CTA ' + DXCta.variantOf(n).n + ' · ' + DXCta.variantId(n); }
  function bandLabel(cfg) { var n = DXBanner.normalize(cfg); return 'DX Banner ' + DXBanner.variantOf(n).n + ' · ' + DXBanner.variantId(n); }

  function heroCfg(h) {
    var k = DXHero.sample('snippet');
    k.eyebrow = h.eyebrow; k.heading = h.heading; k.sub = h.sub;
    k.copyField = { value: h.copyValue, label: h.copyLabel, copiedLabel: 'Copied' };
    k.primaryCta = { label: h.buttonLabel, href: h.buttonHref };
    k.secondaryCta = { label: h.linkLabel, href: h.linkHref };
    k.trust = nz(h.trust);
    k.snippet = { file: h.snippetFile, prompt: h.prompt, chips: nz(h.chips), code: h.code, caption: h.caption };
    return { media: 'snippet', theme: 'dark', layout: 'horizontal', content: k, show: { caption: !!h.caption, secondaryCta: !!h.linkLabel, trust: k.trust.length > 0 }, preventNav: true };
  }
  function connectCfg(s) {
    var k = DXHero.sample('tabs');
    k.eyebrow = s.eyebrow; k.heading = s.heading; k.sub = s.sub; k.steps = s.steps; k.tabs = s.tabs;
    k.copyField = { value: s.copyValue, label: s.copyLabel, copiedLabel: 'Copied' };
    k.secondaryCta = { label: s.linkLabel, href: s.linkHref };
    k.trust = nz(s.trust);
    return { media: 'tabs', theme: 'light', layout: 'horizontal', headingLevel: 2, content: k, show: { primaryCta: false, secondaryCta: !!s.linkLabel, trust: k.trust.length > 0 }, preventNav: true };
  }
  function promptCfg(t) {
    var k = DXCta.sample();
    k.card.copyPrompt = { heading: t.promptHeading, description: t.promptDescription };
    k.copyPrompt.prompt = t.prompt; k.copyPrompt.helper = nz(t.promptHelper);
    k.copyPrompt.secondary = { label: t.promptLinkLabel, href: t.promptLinkHref, style: 'link' };
    return { composition: 'card', action: 'copyPrompt', theme: 'light', context: false, content: k, show: { secondary: !!t.promptLinkLabel, helper: k.copyPrompt.helper.length > 0 }, preventNav: true };
  }
  function listCfg(d) {
    var k = DXCta.sample();
    k.list = { title: d.listTitle, items: (d.links || []).map(function (l) { return { label: l.linkName, value: l.url }; }),
      secondary: { label: d.linkLabel, href: d.linkHref, style: 'link' }, helper: nz(d.helper) };
    return { composition: 'list', action: 'copyUrl', theme: 'light', context: false, content: k, show: { label: true, helper: k.list.helper.length > 0, secondary: !!d.linkLabel }, preventNav: true };
  }
  function bandCfg(r) {
    var k = DXBanner.sample();
    k.button = { eyebrow: r.eyebrow, heading: r.heading, body: r.body, primary: { label: r.buttonLabel, href: r.buttonHref },
      secondary: { label: r.linkLabel, href: r.linkHref }, trust: nz(r.trust) };
    return { action: 'button', theme: 'dark', layout: 'split', content: k, show: { trust: k.button.trust.length > 0, secondary: !!r.linkLabel }, preventNav: true };
  }
  function wrap(target, label, comp, kind) {
    var w = document.createElement('div');
    w.className = 'rv-sec';
    w.setAttribute('data-rv-target', target); w.setAttribute('data-rv-label', label); w.setAttribute('data-rv-kind', 'section');
    w.setAttribute('data-comp', comp); w.setAttribute('data-comp-kind', kind);
    return w;
  }
  function head(x) {
    return '<div class="sec__head">' + (x.eyebrow ? '<p class="sec__eyebrow">' + esc(x.eyebrow) + '</p>' : '') + '<h2 class="sec__h">' + esc(x.heading) + '</h2>' + (x.sub ? '<p class="sec__p">' + esc(x.sub) + '</p>' : '') + '</div>';
  }

  function render(C, app) {
    var keepOpen = Array.prototype.map.call(app.querySelectorAll('.faq details'), function (d) { return d.open; });
    app.innerHTML = '';
    var hc = heroCfg(C.hero), h = wrap('hero', '1 Hero', heroLabel(hc), 'new'); DXHero.render(h, hc); app.appendChild(h);
    var cc = connectCfg(C.connect), s = wrap('connect', '2 Connect', heroLabel(cc), 'new'); DXHero.render(s, cc); app.appendChild(s);

    var t = C.tools, pc = promptCfg(t), tw = wrap('tools', '3 What your agent can do', 'Existing · card grid', 'existing');
    tw.innerHTML = '<section class="sec sec--light" aria-label="' + esc(t.heading) + '"><div class="sec__in">' + head(t) +
      '<div class="cards">' + (t.cards || []).map(function (c, i) {
        return '<div class="tcard" data-rv-target="tool-' + (i + 1) + '" data-rv-label="Tool card: ' + esc(c.name) + '"><code>' + esc(c.name) + '</code><p>' + esc(c.text) + '</p></div>';
      }).join('') + '</div>' + (t.limits ? '<p class="limits">' + esc(t.limits) + '</p>' : '') +
      '<div class="after-cards" data-cta-slot data-rv-target="prompt" data-rv-label="3b Ask your agent" data-comp="' + esc(ctaLabel(pc)) + '" data-comp-kind="new"></div></div></section>';
    DXCta.render(tw.querySelector('[data-cta-slot]'), pc);
    app.appendChild(tw);

    var bc = bandCfg(C.subscribe), b = wrap('subscribe', '4 Subscribe', bandLabel(bc), 'new'); DXBanner.render(b, bc); app.appendChild(b);

    var d = C.details, lc = listCfg(d), dw = wrap('details', '5 Connection details', ctaLabel(lc), 'new');
    dw.innerHTML = '<section class="sec sec--canvas" aria-label="' + esc(d.heading) + '"><div class="sec__in">' + head(d) + '<div data-cta-slot></div></div></section>';
    DXCta.render(dw.querySelector('[data-cta-slot]'), lc);
    app.appendChild(dw);

    var f = C.faq, fw = wrap('faq', '6 FAQ', 'Existing · FAQ accordion', 'existing');
    fw.innerHTML = '<section class="sec sec--light" aria-label="' + esc(f.heading) + '"><div class="sec__in"><div class="sec__head"><h2 class="sec__h">' + esc(f.heading) + '</h2></div><div class="faq">' +
      (f.items || []).map(function (it, i) {
        return '<details data-rv-target="faq-' + (i + 1) + '" data-rv-label="FAQ ' + (i + 1) + ': ' + esc(it.q) + '"' + ((keepOpen.length ? keepOpen[i] : i === 0) ? ' open' : '') + '><summary><span>' + esc(it.q) + '</span></summary><p>' + esc(it.a) + '</p></details>';
      }).join('') + '</div></div></section>';
    app.appendChild(fw);
  }

  window.DXReviewPage = {
    slug: 'hlr-mcp',
    sections: [['hero', '1 Hero'], ['connect', '2 Connect'], ['tools', '3 What your agent can do'], ['subscribe', '4 Subscribe'], ['details', '5 Connection details'], ['faq', '6 FAQ']],
    labels: { links: 'Links', linkName: 'Link name', url: 'URL', listTitle: 'List title', helper: 'Helper line', promptHeading: 'Prompt card heading', promptDescription: 'Prompt card description' },
    render: render
  };
})();
