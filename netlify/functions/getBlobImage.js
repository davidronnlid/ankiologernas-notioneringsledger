// Netlify Function (v2): Serve an image stored in Netlify Blobs by key
// Public endpoint so Notion can fetch via HTTPS external URL

import { getStore } from '@netlify/blobs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};

const extensionToContentType = (ext) => {
  const e = (ext || '').toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'gif') return 'image/gif';
  if (e === 'webp') return 'image/webp';
  if (e === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
};

export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    // Support both query ?key=... and pretty path /.netlify/functions/getBlobImage/:key
    const url = new URL(request.url);
    let key = url.searchParams.get('key') || '';
    if (!key) {
      const match = url.pathname.match(/getBlobImage\/(.+)$/);
      if (match && match[1]) key = decodeURIComponent(match[1]);
    }
    if (!key) return new Response('Missing key', { status: 400, headers: CORS_HEADERS });

    // Basic safety: forbid leading slash
    if (key.startsWith('/')) return new Response('Invalid key', { status: 400, headers: CORS_HEADERS });

    const store = getStore({ name: 'notion-images', consistency: 'strong' });
    const arrayBuf = await store.get(key, { type: 'arrayBuffer' });
    if (!arrayBuf) return new Response('Not found', { status: 404, headers: CORS_HEADERS });

    const ext = key.split('.').pop();
    const contentType = extensionToContentType(ext);

    // Set long cache headers (immutable) since keys are content-hashed
    const headers = {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    const body = request.method === 'HEAD' ? null : Buffer.from(arrayBuf);
    return new Response(body, { status: 200, headers });
  } catch (err) {
    console.error('getBlobImage error:', err);
    return new Response('Server error', { status: 500, headers: CORS_HEADERS });
  }
};


