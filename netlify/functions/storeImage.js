// Netlify Function (v2): Store image to Netlify Blobs and return a public HTTPS URL

import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function parseImageDataUrl(dataUrl) {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl || '');
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { mimeType, buffer };
}

export default async (request, context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const imageDataUrl = body?.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return new Response(JSON.stringify({ error: 'Invalid imageDataUrl' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const parsed = parseImageDataUrl(imageDataUrl);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Unsupported data URL format' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const contentHash = crypto.createHash('sha256').update(parsed.buffer).digest('hex');

    // Netlify Blobs store with strong consistency per docs
    const store = getStore({ name: 'notion-images', consistency: 'strong' });
    const extension = parsed.mimeType.split('/')[1] || 'bin';
    const blobKey = `${contentHash}.${extension}`;

    await store.set(blobKey, parsed.buffer, {
      contentType: parsed.mimeType,
      cacheControl: 'public, max-age=31536000, immutable'
    });

    const publicUrl = store.getPublicUrl(blobKey);
    const response = { success: true, storage: 'blobs', key: blobKey, url: publicUrl, prettyUrl: publicUrl };
    return new Response(JSON.stringify(response), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('storeImage error:', error);
    return new Response(JSON.stringify({ errorType: error?.name || 'Error', errorMessage: error?.message || String(error) }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
};
