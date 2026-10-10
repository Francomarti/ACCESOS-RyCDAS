/* © 2026 Ing. Agr. Franco Martignoni, MP 4749 — Service worker del portal de Accesos RyCDAS.
   Red primero (siempre intenta traer lo último) y, si no hay señal, usa la copia guardada. */
var CACHE = 'rycdas-portal-v5';
var SHELL = ['./', 'index.html', 'apps.json', 'manifest.webmanifest', 'logo.png', 'desafio-100-logo.png', 'agrintel-icono.png', 'cobranza-colo.jpg',
             'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
             'fondo-1.jpg', 'fondo-2.jpg', 'fondo-3.jpg', 'fondo-4.jpg'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL.map(function(u){ return new Request(u, {cache: 'reload'}); })); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE && k.indexOf('rycdas-portal-') === 0; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

function conTimeout(p, ms){
  return new Promise(function(ok, mal){
    var t = setTimeout(function(){ mal(new Error('timeout')); }, ms);
    p.then(function(v){ clearTimeout(t); ok(v); }, function(e){ clearTimeout(t); mal(e); });
  });
}

function redPrimero(req){
  return caches.open(CACHE).then(function(cache){
    return conTimeout(fetch(req, {cache: 'no-store'}), 4000).then(function(res){
      if(res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function(err){
      return cache.match(req, {ignoreSearch: true}).then(function(hit){
        if(hit) return hit;
        if(req.mode === 'navigate') return cache.match('index.html');
        throw err;
      });
    });
  });
}

function cachePrimero(req){
  return caches.open(CACHE).then(function(cache){
    return cache.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin === self.location.origin){
    e.respondWith(redPrimero(req));
  } else if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(cachePrimero(req));
  }
});
