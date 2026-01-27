/*! coi-serviceworker v0.1.6 - Guido Zuidhof, licensed under MIT */
let co=self;co.addEventListener("install",()=>co.skipWaiting());co.addEventListener("activate",e=>e.waitUntil(co.clients.claim()));
function handle(t,e,n){e.set("Cross-Origin-Embedder-Policy","require-corp");e.set("Cross-Origin-Opener-Policy","same-origin");}
co.addEventListener("fetch",function(t){const e=t.request;if("only-if-cached"===e.cache&&"same-origin"!==e.mode)return;
t.respondWith(fetch(e).then(t=>{if(0===t.status)return t;const n=new Headers(t.headers);handle(0,n,0);
return new Response(t.body,{status:t.status,statusText:t.statusText,headers:n})}).catch(t=>console.error(t)))});
