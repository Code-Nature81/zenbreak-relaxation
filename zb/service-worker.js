const APP_SHELL_CACHE = "zenbreak-app-shell-v42";
const MEDIA_CACHE = "zenbreak-media-v42";

const APP_SHELL = [
  "/",
  "/index.html",
  "/choix-duree.html",
  "/choix-son.html",
  "/style.css",
  "/logo1.png",
  "/logo1_monochrome.png",
  "/manifest.json",
  "/fondecran.png",
  "/js/firebase-init.js",
  "/sounds/notification.mp3"
];

self.addEventListener("install", event => {
  console.log("[ServiceWorker] Installation");

  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error("[ServiceWorker] Erreur installation :", error);
      })
  );
});

self.addEventListener("activate", event => {
  console.log("[ServiceWorker] Activation");

  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key !== APP_SHELL_CACHE && key !== MEDIA_CACHE) {
              console.log("[ServiceWorker] Suppression ancien cache :", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

function isFirebaseStorageRequest(request) {
  const url = new URL(request.url);
  return url.hostname.includes("firebasestorage.googleapis.com");
}

function isMediaRequest(request) {
  const url = request.url.toLowerCase();

  return (
    url.includes(".mp3") ||
    url.includes(".wav") ||
    url.includes(".ogg") ||
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".webp") ||
    url.includes(".mp4")
  );
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === "navigate") {
      return caches.match("/index.html");
    }

    throw error;
  }
}

async function cacheFullMediaFile(url) {
  const cache = await caches.open(MEDIA_CACHE);

  const alreadyCached = await cache.match(url);
  if (alreadyCached) {
    return alreadyCached;
  }

  const response = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "no-store"
  });

  if (response && response.ok) {
    await cache.put(url, response.clone());
  }

  return response;
}

async function createRangeResponse(request, cachedResponse) {
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    return cachedResponse;
  }

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const size = arrayBuffer.byteLength;

  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);

  if (!match) {
    return cachedResponse;
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : size - 1;

  if (start >= size || end >= size) {
    return new Response(null, {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: {
        "Content-Range": `bytes */${size}`
      }
    });
  }

  const slicedBuffer = arrayBuffer.slice(start, end + 1);

  const headers = new Headers();
  headers.set("Content-Type", cachedResponse.headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", slicedBuffer.byteLength);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Accept-Ranges", "bytes");

  return new Response(slicedBuffer, {
    status: 206,
    statusText: "Partial Content",
    headers
  });
}

async function firebaseMediaStrategy(request, event) {
  const cache = await caches.open(MEDIA_CACHE);
  const url = request.url;
  const rangeHeader = request.headers.get("range");

  const cachedResponse = await cache.match(url);

  if (cachedResponse) {
    if (rangeHeader && cachedResponse.status === 200 && cachedResponse.type !== "opaque") {
      return createRangeResponse(request, cachedResponse);
    }

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse) {
      if (rangeHeader) {
        event.waitUntil(
          cacheFullMediaFile(url).catch(error => {
            console.warn("[ServiceWorker] Cache complet média impossible :", error);
          })
        );

        return networkResponse;
      }

      if (
        networkResponse.ok ||
        networkResponse.type === "opaque" ||
        networkResponse.status === 206
      ) {
        await cache.put(url, networkResponse.clone());
      }

      return networkResponse;
    }
  } catch (error) {
    const fallbackResponse = await cache.match(url);

    if (fallbackResponse) {
      if (rangeHeader && fallbackResponse.status === 200 && fallbackResponse.type !== "opaque") {
        return createRangeResponse(request, fallbackResponse);
      }

      return fallbackResponse;
    }

    return new Response("Média indisponible hors ligne", {
      status: 503,
      statusText: "Offline"
    });
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (isFirebaseStorageRequest(request) || isMediaRequest(request)) {
    event.respondWith(firebaseMediaStrategy(request, event));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});