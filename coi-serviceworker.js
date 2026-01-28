/*! coi-serviceworker v0.1.7 */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "deregister") self.registration.unregister();
    if (ev.data.type === "coepCredentialless") coepCredentialless = ev.data.value;
  });
  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;
    const request = (coepCredentialless && r.mode === "no-cors") ? new Request(r, { credentials: "omit" }) : r;
    event.respondWith(fetch(request).then((response) => {
      if (response.status === 0) return response;
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
      if (!coepCredentialless) newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
    }).catch((e) => console.error(e)));
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepDegrading = (reloadedBySelf == "coepDegrading");
    if (window.crossOriginIsolated || coepDegrading) return;
    const n = navigator;
    if (n.serviceWorker) {
        n.serviceWorker.register(window.document.currentScript.src).then((registration) => {
            console.log("COI Registered");
            registration.addEventListener("updatefound", () => { window.location.reload(); });
            if (registration.active && !n.serviceWorker.controller) { window.location.reload(); }
        });
    }
  })();
}
