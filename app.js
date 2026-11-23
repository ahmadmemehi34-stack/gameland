/* GameLand | گیم‌لند — کدهای مشترک سایت (بدون هیچ کتابخانه‌ی خارجی) */
(function () {
'use strict';
const C = window.GL_CONFIG || {}, KEY = C.SUPABASE_ANON_KEY || '', BASE = (C.SUPABASE_URL || '').replace(/\/+$/, ''), LIVE = !!(BASE && KEY);
const CATS = { car: ['ماشینی', '🏎'], shooter: ['تفنگی', '🔫'], puzzle: ['فکری', '🧩'], arcade: ['آرکید', '👾'], other: ['سایر', '🎮'] };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Number(n || 0).toLocaleString('fa-IR');
const fmtSize = b => { b = +b || 0; if (!b) return '—'; return b < 1048576 ? nf(Math.max(1, Math.round(b / 1024))) + ' کیلوبایت' : Number((b / 1048576).toFixed(1)).toLocaleString('fa-IR') + ' مگابایت'; };
const fmtDate = d => { try { return new Date(d).toLocaleDateString('fa-IR'); } catch (e) { return ''; } };
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const safeName = n => String(n).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
const svgCover = (emo, a, b) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs><rect width="640" height="400" fill="url(#g)"/><text x="320" y="250" font-size="170" text-anchor="middle">' + emo + '</text></svg>');
const FALLBACK = svgCover('🎮', '#2a2060', '#0d0f2b');

/* ---------- حالت ساده (بدون پایگاه داده): فهرست بازی‌ها از games.json خوانده می‌شود ---------- */
let STATIC_CACHE = null;
async function staticGames() {
  if (STATIC_CACHE) return STATIC_CACHE;
  const r = await fetch('games.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('games.json پیدا نشد');
  const list = await r.json();
  /* اگر فایلی مثل MEGA-GAMES.apk کنار سایت آپلود شده باشد خودکار پیدا و نمایش داده می‌شود */
  await Promise.all(list.map(async g => { const p = g.probe || {}; for (const t of Object.keys(p)) { try { const h = await fetch(p[t], { method: 'HEAD' }); if (h.ok) { g[t + '_url'] = p[t]; g[t + '_size'] = +h.headers.get('content-length') || g[t + '_size'] || 0; } } catch (e) { } } }));
  return STATIC_CACHE = list.filter(g => g.published !== false);
}

/* ---------- ارتباط با Supabase ---------- */
const hdr = t => { const h = { apikey: KEY }; if (t) h.Authorization = 'Bearer ' + t; else if (KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + KEY; return h; };
async function rest(path, o) {
  o = o || {};
  const h = Object.assign({}, hdr(o.token), o.body !== undefined ? { 'Content-Type': 'application/json' } : {}, o.prefer ? { Prefer: o.prefer } : {});
  const r = await fetch(BASE + '/rest/v1/' + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
  if (!r.ok) throw new Error((j && (j.message || j.hint || j.error)) || ('خطا ' + r.status));
  return j;
}
const encPath = p => p.split('/').map(encodeURIComponent).join('/');
const pubUrl = (bucket, path) => BASE + '/storage/v1/object/public/' + bucket + '/' + encPath(path);
const pathFromUrl = (url, bucket) => { if (!url) return null; const m = String(url).split('/object/public/' + bucket + '/'); return m[1] ? decodeURIComponent(m[1].split('?')[0]) : null; };

async function loadGames(cb) {
  let c = null; try { c = JSON.parse(sessionStorage.getItem('gl_games') || 'null'); } catch (e) { }
  if (c && cb) cb(c, true);
  const list = LIVE ? await rest('games?select=*&published=eq.true&order=created_at.desc&limit=500') : await staticGames();
  try { sessionStorage.setItem('gl_games', JSON.stringify(list)); } catch (e) { }
  if (cb) cb(list, false);
  return list;
}
async function loadGame(slug) {
  if (!LIVE) return (await staticGames()).find(g => g.slug === slug) || null;
  const r = await rest('games?select=*&slug=eq.' + encodeURIComponent(slug) + '&published=eq.true&limit=1');
  return r && r[0] || null;
}

/* ---------- فایل‌ها و دانلود ---------- */
const FT = { apk: { icon: '🤖', name: 'نسخه‌ی اندروید (APK)', btn: 'دانلود APK', ext: 'apk' }, zip: { icon: '🗜', name: 'فایل فشرده (ZIP)', btn: 'دانلود ZIP', ext: 'zip' }, html: { icon: '🌐', name: 'فایل بازی (HTML)', btn: 'دانلود HTML', ext: 'html' } };
function fileList(g) {
  const out = [];
  ['apk', 'zip', 'html'].forEach(t => { if (g[t + '_url']) out.push(Object.assign({ type: t, url: g[t + '_url'], size: g[t + '_size'] }, FT[t])); });
  if (g.play_url) out.push({ type: 'play', url: g.play_url, size: 0, icon: '▶️', name: 'بازی آنلاین (بدون نصب)', btn: 'بازی آنلاین', ext: '' });
  return out;
}
const primary = g => fileList(g)[0] || null;
function dlHref(g, f) {
  if (!f || f.type === 'play' || f.url === '#demo' || !LIVE) return f ? f.url : '#';
  return f.url + (f.url.indexOf('?') > -1 ? '&' : '?') + 'download=' + encodeURIComponent(g.slug + '.' + f.ext);
}
function countDownload(id) {
  if (!LIVE || !id) return;
  try { const k = 'gl_dl_' + id; if (Date.now() - (+localStorage.getItem(k) || 0) < 6 * 3600e3) return; localStorage.setItem(k, Date.now()); } catch (e) { }
  fetch(BASE + '/rest/v1/rpc/increment_downloads', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ p_id: id }), keepalive: true }).catch(() => { });
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a.dl[data-id]'); if (!a) return;
  if (a.getAttribute('href') === '#demo') { e.preventDefault(); toast('این یک بازی نمونه است. بعد از تنظیم config.js بازی‌های واقعی می‌آیند 🙂'); return; }
  countDownload(a.dataset.id);
});

/* ---------- کارت بازی ---------- */
function card(g) {
  const cat = CATS[g.category] || CATS.other, f = primary(g), href = 'game.html?g=' + encodeURIComponent(g.slug);
  return '<article class="card"><a class="cv" href="' + href + '"><img loading="lazy" decoding="async" width="640" height="400" src="' + esc(g.cover_url || FALLBACK) + '" alt="' + esc(g.title) + '">' + (g.featured ? '<span class="star">⭐</span>' : '') + '<span class="badge">' + cat[1] + ' ' + cat[0] + '</span></a>' +
    '<div class="cb"><h3><a href="' + href + '">' + esc(g.title) + '</a></h3><p>' + esc(g.short_desc || '') + '</p><div class="meta"><span>📦 ' + fmtSize(f ? f.size : 0) + '</span><span>' + (LIVE ? '⬇ ' + nf(g.downloads) : '🆓 رایگان') + '</span></div>' +
    (f ? '<a class="dl" data-id="' + esc(g.id) + '" href="' + esc(dlHref(g, f)) + '" ' + (f.type === 'play' ? 'target="_blank" rel="noopener"' : 'download') + '>' + f.icon + ' ' + f.btn + '</a>' : '<a class="dl off" href="' + href + '">مشاهده</a>') + '</div></article>';
}

/* ---------- ظاهر مشترک ---------- */
function layout() {
  const h = document.getElementById('hdr'), f = document.getElementById('ftr');
  if (h) h.outerHTML = '<header class="hd"><div class="wrap"><a class="logo" href="index.html" aria-label="GameLand"><b>G</b><span>GameLand</span><small>گیم‌لند</small></a><nav><a href="index.html">خانه</a><a href="index.html#popular">محبوب‌ها</a><a href="index.html#new">جدیدترین‌ها</a><a href="index.html#games">همه‌ی بازی‌ها</a></nav><a class="hbtn" href="index.html#games">شروع بازی <span>←</span></a></div></header>';
  if (f) f.outerHTML = '<footer class="ft"><div class="wrap"><div><b>GameLand | گیم‌لند</b><br>بازی‌های ساخته‌شده با ❤️ و قابل دانلود برای همه' + (C.CONTACT ? '<br>ارتباط: <a href="' + esc(/^https?:|^mailto:/.test(C.CONTACT) ? C.CONTACT : (C.CONTACT.indexOf('@') > 0 ? 'mailto:' + C.CONTACT : 'https://t.me/' + C.CONTACT.replace('@', ''))) + '">' + esc(C.CONTACT) + '</a>' : '') + '</div><div class="lk">' + Object.keys(CATS).map(k => '<a href="index.html?cat=' + k + '#games">' + CATS[k][1] + ' ' + CATS[k][0] + '</a>').join('') + '</div></div></footer>';
}
function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2800); }
const siteUrl = p => ((C.SITE_URL || (location.origin + location.pathname.replace(/[^/]*$/, ''))).replace(/\/+$/, '')) + '/' + (p || '');
function seo(o) {
  document.title = o.title;
  const meta = (attr, name, val) => { let e = document.head.querySelector('meta[' + attr + '="' + name + '"]'); if (!e) { e = document.createElement('meta'); e.setAttribute(attr, name); document.head.appendChild(e); } e.setAttribute('content', val || ''); };
  meta('name', 'description', o.desc); meta('property', 'og:title', o.title); meta('property', 'og:description', o.desc); meta('property', 'og:type', o.type || 'website'); meta('property', 'og:url', o.url); meta('property', 'og:locale', 'fa_IR'); meta('name', 'twitter:card', 'summary_large_image');
  if (o.image && o.image.indexOf('data:') !== 0) meta('property', 'og:image', o.image);
  let l = document.head.querySelector('link[rel=canonical]'); if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); } l.href = o.url;
  if (o.ld) { let s = document.getElementById('ld'); if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld'; document.head.appendChild(s); } s.textContent = JSON.stringify(o.ld); }
}
function sitemapXml(games) {
  const u = (loc, d) => '  <url><loc>' + esc(loc) + '</loc>' + (d ? '<lastmod>' + String(d).slice(0, 10) + '</lastmod>' : '') + '</url>';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [u(siteUrl(''))].concat(games.filter(g => g.published !== false).map(g => u(siteUrl('game.html?g=' + encodeURIComponent(g.slug)), g.updated_at || g.created_at))).join('\n') + '\n</urlset>\n';
}

/* ---------- ورود مدیر و آپلود ---------- */
const SS = { get() { try { return JSON.parse(sessionStorage.getItem('gl_s') || 'null'); } catch (e) { return null; } }, set(v) { sessionStorage.setItem('gl_s', JSON.stringify(v)); }, clear() { sessionStorage.removeItem('gl_s'); } };
function saveSession(j) { SS.set({ at: j.access_token, rt: j.refresh_token, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 60) * 1000 }); }
async function login(email, pw) {
  const r = await fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pw }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || 'ایمیل یا رمز اشتباه است');
  saveSession(j); return j;
}
async function token() {
  const s = SS.get(); if (!s) return null; if (Date.now() < s.exp) return s.at;
  const r = await fetch(BASE + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.rt }) });
  if (!r.ok) { SS.clear(); return null; } saveSession(await r.json()); return SS.get().at;
}
const logout = () => SS.clear();
async function isAdmin() { const t = await token(); if (!t) return false; try { return (await rest('rpc/is_admin', { method: 'POST', body: {}, token: t })) === true; } catch (e) { return false; } }
async function adminGames() { return rest('games?select=*&order=created_at.desc&limit=500', { token: await token() }); }
async function saveGame(id, patch) {
  const t = await token(); patch.updated_at = new Date().toISOString();
  const r = id ? await rest('games?id=eq.' + id, { method: 'PATCH', body: patch, token: t, prefer: 'return=representation' }) : await rest('games', { method: 'POST', body: patch, token: t, prefer: 'return=representation' });
  return r && r[0];
}
async function deleteGame(id) { return rest('games?id=eq.' + id, { method: 'DELETE', token: await token() }); }
function upload(bucket, path, file, onp) {
  return new Promise(async (res, rej) => {
    const t = await token(); if (!t) return rej(new Error('نشست منقضی شده؛ دوباره وارد شو'));
    const x = new XMLHttpRequest(); x.open('POST', BASE + '/storage/v1/object/' + bucket + '/' + encPath(path));
    x.setRequestHeader('apikey', KEY); x.setRequestHeader('Authorization', 'Bearer ' + t); x.setRequestHeader('x-upsert', 'true'); x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    if (x.upload && onp) x.upload.onprogress = e => { if (e.lengthComputable) onp(e.loaded / e.total); };
    x.onload = () => { if (x.status < 300) return res(pubUrl(bucket, path)); let m = ''; try { m = JSON.parse(x.responseText).message; } catch (e) { } rej(new Error(m || ('آپلود ناموفق (' + x.status + ')'))); };
    x.onerror = () => rej(new Error('خطای شبکه هنگام آپلود')); x.send(file);
  });
}
async function removeObjects(bucket, urls) {
  const prefixes = urls.map(u => pathFromUrl(u, bucket)).filter(Boolean); if (!prefixes.length) return;
  const t = await token();
  await fetch(BASE + '/storage/v1/object/' + bucket, { method: 'DELETE', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr(t)), body: JSON.stringify({ prefixes: prefixes }) }).catch(() => { });
}

window.GL = { C, LIVE, BASE, CATS, FALLBACK, esc, nf, fmtSize, fmtDate, slugify, safeName, rest, pubUrl, pathFromUrl, loadGames, loadGame, fileList, primary, dlHref, countDownload, card, layout, toast, siteUrl, seo, sitemapXml, login, token, logout, isAdmin, adminGames, saveGame, deleteGame, upload, removeObjects, FT };
})();

