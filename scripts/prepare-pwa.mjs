// Prepare the Expo SPA for installation as a Progressive Web App on GitHub Pages.
// Run after "expo export --platform web" and after generating the PNG app icons.
// No personal data, API responses, or user settings are stored in Cache Storage.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const base = (cfg.expo.experiments?.baseUrl || '').replace(/\/+$/, '') + '/';
if (base !== '/MORROW/') throw new Error('Unexpected GitHub Pages base URL: ' + base);

const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('Expo web index.html has no <head>');

const manifest = {
  id: base,
  name: 'morrow — tu día, a tu manera',
  short_name: 'morrow',
  description: 'Organiza tus tareas, hábitos, objetivos y vida diaria.',
  lang: 'es',
  start_url: base,
  scope: base,
  display: 'standalone',
  background_color: '#F2F0EA',
  theme_color: '#F2F0EA',
  icons: [
    { src: base + 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: base + 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: base + 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

const tags = [
  '<link rel="manifest" href="' + base + 'manifest.webmanifest">',
  '<link rel="apple-touch-icon" sizes="180x180" href="' + base + 'apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="morrow">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="theme-color" content="#F2F0EA">',
  '<script defer src="' + base + 'pwa-register.js"></script>',
].join('\n');
html = html.replace(/<head(?:\s[^>]*)?>/i, (tag) => tag + '\n' + tags + '\n');
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const reg = `// Only register on HTTPS; stay out of the native iOS/Android apps.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(${JSON.stringify(base + 'sw.js')}, { scope: ${JSON.stringify(base)}, updateViaCache: 'none' })
      .then(function (registration) { return registration.update().catch(function () {}); })
      .catch(function (error) { console.info('Morrow offline support unavailable:', error); });
  }, { once: true });
}
`;
fs.writeFileSync(path.join(dist, 'pwa-register.js'), reg);

function list(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? list(full) : [full];
  });
}
const toUrl = (file) => base + path.relative(dist, file).split(path.sep).map(encodeURIComponent).join('/');
const scriptsAndFonts = list(dist)
  .filter((f) => /\.(?:js|css|woff2?|ttf|otf)$/i.test(f))
  .map(toUrl);
const precache = [...new Set([
  base,
  base + 'index.html',
  base + 'manifest.webmanifest',
  base + 'pwa-register.js',
  base + 'icon-192.png',
  base + 'icon-512.png',
  base + 'icon-maskable-512.png',
  base + 'apple-touch-icon.png',
  ...scriptsAndFonts,
])];
for (const u of precache) {
  if (!fs.existsSync(path.join(dist, decodeURIComponent(u.slice(base.length))))) {
    // The trailing slash is served by dist/index.html.
    if (u !== base) throw new Error('Missing PWA precache file: ' + u);
  }
}

const buildId = (process.env.GITHUB_SHA || 'local').slice(0, 12);
const sw = `// Morrow app shell only. User data is stored separately by Zustand/AsyncStorage.
const CACHE = ${JSON.stringify('morrow-app-shell-v2-' + buildId)};
const PREFIX = 'morrow-app-shell-v2-';
const BASE = ${JSON.stringify(base)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    // Fresh HTML when online; pre-cached app shell when offline, including deep links.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch (_) {}
      return (await caches.match(BASE + 'index.html')) || Response.error();
    })());
    return;
  }

  // Only cache static app resources. Never cache API calls, authentication or personal records.
  if (!['script', 'style', 'image', 'font', 'manifest', 'worker'].includes(request.destination)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
`;
fs.writeFileSync(path.join(dist, 'sw.js'), sw);
console.log('Prepared Morrow PWA at ' + base + ' with ' + precache.length + ' app-shell files.');
