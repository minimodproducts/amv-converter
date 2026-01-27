/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;

    let newHeaders = new Headers(event.request.headers);
    if (newHeaders.get("range")) {
        newHeaders.set("pos", newHeaders.get("range"));
        newHeaders.set("range", "bytes=0-");
    }

    event.respondWith(
      fetch(event.request, { htmlAcceptHeaders: ["text/html", "application/xhtml+xml"], headers: newHeaders })
        .then((r) => {
          const { status, statusText, body } = r;
          if (status === 0 || status > 399) return r;

          const headers = new Headers(r.headers);
          headers.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(body, { status, statusText, headers });
        })
    );
  });
} else {
  (async () => {
    if (window.crossOriginIsolated) return;
    const registration = await navigator.serviceWorker.register(window.document.currentScript.src).catch((e) => console.error("COI: ", e));
    if (registration) {
        console.log("Reloading page to enable Cross-Origin Isolation");
        window.location.reload();
    }
  })();
}
