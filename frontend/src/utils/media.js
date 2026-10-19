/**
 * Media (uploaded file) references.
 *
 * The server no longer serves uploads from public URLs. A file is stored inside board content as a stable reference,
 * "ocmedia:uploads/<random>.png". Just before a file is shown or downloaded, the reference is exchanged for a
 * short-lived signed URL (POST /api/files/resolve/) that works in <img>, <audio> and <a> tags.
 *
 * Old boards that still contain full URLs such as https://host/media/uploads/x.png are handled the same way.
 */
import { useEffect, useState } from 'react';
import api from '../services/api';
import { safeUrl } from './safeUrl';

const REF_PREFIX = 'ocmedia:';
const FRESH_FOR_MS = 40 * 60 * 1000; // the server signs URLs for 60 minutes by default
const BATCH_DELAY_MS = 15;

let currentBoardId = null;
const cache = new Map(); // `${boardId}|${ref}` -> { url, at }
let queue = []; // { ref, boardId, resolve }
let timer = null;

/** The board whose content is on screen; sent to the server so files embedded in it can be authorised. */
export function setMediaBoardId(id) {
  currentBoardId = id || null;
}

/** True for stored references and for old public upload URLs. */
export function isMediaRef(value) {
  if (typeof value !== 'string' || !value) return false;
  if (value.startsWith(REF_PREFIX)) return true;
  if (value.startsWith('blob:') || value.startsWith('data:')) return false;
  return /\/media\/(?!f\/)/.test(value);
}

/**
 * A value found in board content that is NOT an upload reference, made safe to put in src/href:
 * http(s) addresses, blob: previews created in this browser, and small raster data: images. Anything else
 * (javascript:, data:text/html, ...) becomes null, because board content is written by users.
 */
export function safeDisplayUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('blob:')) return value;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  return safeUrl(value);
}

function cacheKey(ref, boardId) {
  return `${boardId || ''}|${ref}`;
}

function cached(ref, boardId) {
  const entry = cache.get(cacheKey(ref, boardId));
  if (entry && Date.now() - entry.at < FRESH_FOR_MS) return entry.url;
  return undefined;
}

async function flush() {
  timer = null;
  const batch = queue;
  queue = [];
  const byBoard = new Map();
  batch.forEach((item) => {
    const list = byBoard.get(item.boardId) || [];
    list.push(item);
    byBoard.set(item.boardId, list);
  });
  for (const [boardId, items] of byBoard.entries()) {
    const refs = Array.from(new Set(items.map((i) => i.ref))).slice(0, 200);
    let urls = {};
    try {
      const res = await api.post('/files/resolve/', { refs, board_id: boardId || undefined });
      urls = res.data?.urls || {};
    } catch (e) {
      urls = {};
    }
    items.forEach((item) => {
      const url = urls[item.ref] || null;
      if (url) cache.set(cacheKey(item.ref, boardId), { url, at: Date.now() });
      item.resolve(url);
    });
  }
}

/** Promise for a usable URL (null when the file is gone or not allowed). Non-media values are returned unchanged. */
export function resolveMediaUrl(ref, boardId = currentBoardId) {
  if (!ref) return Promise.resolve(null);
  if (!isMediaRef(ref)) return Promise.resolve(safeDisplayUrl(ref));
  const hit = cached(ref, boardId);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    queue.push({ ref, boardId, resolve });
    if (!timer) timer = setTimeout(flush, BATCH_DELAY_MS);
  });
}

/** React hook: the displayable URL for a stored reference. undefined while it is being resolved, null when the file is gone or not allowed. */
export function useMediaUrl(ref) {
  const [url, setUrl] = useState(() => {
    if (!ref) return null;
    if (!isMediaRef(ref)) return safeDisplayUrl(ref);
    return cached(ref, currentBoardId) || undefined; // undefined = still resolving
  });

  useEffect(() => {
    let cancelled = false;
    if (!ref) {
      setUrl(null);
    } else if (!isMediaRef(ref)) {
      setUrl(safeDisplayUrl(ref));
    } else {
      setUrl(cached(ref, currentBoardId) || undefined);
      resolveMediaUrl(ref).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return url;
}
