// Builds a single-file web demo of MORROW (for previews such as a Claude artifact).
// Usage: npx expo export --platform web && node web-demo/build.mjs <out.html>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = process.argv[2] ?? path.join(root, 'web-demo', 'morrow-demo.html');
const dir = path.join(root, 'dist/_expo/static/js/web');
const entry = fs.readdirSync(dir).filter((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (entry.length !== 1) throw new Error(`expected one web bundle, found ${entry.length}: set asyncRoutes.web=false`);
let js = fs.readFileSync(path.join(dir, entry[0]), 'utf8');
js = js
  .replaceAll('/<!--/', '/<\\!--/') // a regex literal in react-dom
  .replaceAll('"<script><\\/script>"', '"\\x3Cscript><\\/script>"') // a string literal in react-dom
  .replaceAll('</script', '<\\/script');
if (/<script|<!--/i.test(js)) throw new Error('bundle contains HTML-sensitive sequences');

const fonts = ['400Regular', '500Medium', '600SemiBold', '700Bold'].map((w) => {
  const file = path.join(root, 'node_modules/@expo-google-fonts/manrope', w, `Manrope_${w}.ttf`);
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:"Manrope_${w}";src:url(data:font/ttf;base64,${b64}) format("truetype");font-display:block}`;
});
const seed = fs.readFileSync(path.join(root, 'web-demo/demo-seed.js'), 'utf8');

const html = `<meta charset="utf-8">
<title>morrow</title>
<meta name="description" content="Gestor personal: hoy, plan, finanzas, objetivos y Life Balance.">
<style>
/* One-screen app host. Tokens mirror the app's grounds (Ivory / graphite). */
:root{--bg:#F2F0EA;--bar:#E6E2D9;--ink:#373A35;--muted:#5F635A;--btn:#373A35;--btn-ink:#F2F0EA}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#20211F;--bar:#292B28;--ink:#F0EEE8;--muted:#AAA99F;--btn:#F0EEE8;--btn-ink:#20211F;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#20211F;--bar:#292B28;--ink:#F0EEE8;--muted:#AAA99F;--btn:#F0EEE8;--btn-ink:#20211F;color-scheme:dark}
html,body{height:100%}
body{background:var(--bg);color:var(--ink);overflow:hidden;display:flex;flex-direction:column}
#root{display:flex;flex:1;min-height:0}
#demo-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));background:var(--bar);font:500 13px/1.35 "Manrope_500Medium",system-ui,sans-serif}
#demo-bar span{flex:1;min-width:0;color:var(--muted)}
#demo-bar button{font:600 13px "Manrope_600SemiBold",system-ui,sans-serif;border:0;border-radius:999px;padding:8px 14px;min-height:36px;background:var(--btn);color:var(--btn-ink);cursor:pointer}
#demo-bar button:focus-visible{outline:2px solid var(--muted);outline-offset:2px}
${fonts.join('\n')}
</style>
<script>
window.__MORROW_INLINE_FONTS__ = true;
${seed}
window.__MORROW_HREF__ = location.href;
try { if (location.pathname !== '/') history.replaceState(null, '', '/' + location.hash); } catch (e) {}
</script>
<div id="demo-bar" role="region" aria-label="Demo" hidden>
  <span>Estás viendo datos de ejemplo para probar la app. Lo que cambies se guarda solo en este navegador.</span>
  <button id="demo-reset" type="button">Empezar de cero</button>
</div>
<div id="root"></div>
<script>
(function () {
  var bar = document.getElementById('demo-bar');
  var btn = document.getElementById('demo-reset');
  var on = false;
  try { on = localStorage.getItem('morrow-demo') === 'on'; } catch (e) {}
  bar.hidden = !on;
  var armed = false;
  btn.addEventListener('click', function () {
    if (!armed) { armed = true; btn.textContent = 'Toca otra vez para borrar'; setTimeout(function () { armed = false; btn.textContent = 'Empezar de cero'; }, 3500); return; }
    try { localStorage.removeItem('morrow-v1'); localStorage.setItem('morrow-demo', 'off'); } catch (e) {}
    location.replace(window.__MORROW_HREF__);
  });
})();
</script>
<script>
${js}
</script>
`;
fs.writeFileSync(out, html);
console.log(`${out} ${(html.length / 1e6).toFixed(2)} MB`);
