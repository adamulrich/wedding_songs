const VERSION = "v9";
const SHELL_CACHE = `wedding-shell-${VERSION}`;
const SONG_CACHE = `wedding-songs-${VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./style/base.css",
  "./script/script.js",
  "./manifest.webmanifest",
  "./images/album_art_small.png",
  "./images/icon.svg",
  "./images/icon-180.png",
  "./images/icon-192.png",
  "./images/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== SONG_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

async function serveSong(request) {
  const cache = await caches.open(SONG_CACHE);
  let cached = await cache.match(request.url);

  if (!cached) {
    // Fetch the whole file (no Range header) so the cached response is a
    // complete 200 that we can slice for future range requests offline.
    try {
      const fullRequest = new Request(request.url, { cache: "no-store" });
      const response = await fetch(fullRequest);
      if (response.ok && response.status === 200) {
        await cache.put(request.url, response.clone());
        cached = await cache.match(request.url);
      } else {
        return response;
      }
    } catch (err) {
      return new Response("", { status: 504, statusText: "Offline" });
    }
  }

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return cached;

  const buffer = await cached.arrayBuffer();
  const total = buffer.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return cached;

  let start = match[1] === "" ? 0 : parseInt(match[1], 10);
  let end = match[2] === "" ? total - 1 : parseInt(match[2], 10);
  if (isNaN(start) || isNaN(end) || start > end || end >= total) {
    return new Response("", {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: { "Content-Range": `bytes */${total}` }
    });
  }

  const slice = buffer.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Length": String(slice.byteLength),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes"
    }
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isSong = url.pathname.toLowerCase().endsWith(".mp3");

  if (isSong) {
    event.respondWith(serveSong(request));
    return;
  }

  // Stale-while-revalidate for shell assets.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
