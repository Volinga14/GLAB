const PREFIX='swinglab-marking-lab:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+'v2-shared-marker';
const FILES=['../video-tools.js?v=33-20261022','../local-engine.js?v=33-20261022','./','./?v=33-20261022','./index.html','./lab.css?v=33-20261022','./lab.js?v=33-20261022','./core.js?v=33-20261022','./store.js?v=33-20261022','./core.js','./candidate-worker.js','./references.json','./models/model.json','./models/encoder.onnx','./models/temporal.onnx','./vendor/ort.wasm.min.js','./vendor/ort-wasm-simd-threaded.mjs','./vendor/runtime.json',...Array.from({length:6},(_,i)=>'./vendor/ort-runtime.gz.'+i)];
const URLS=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(!URLS.has(url.href))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
