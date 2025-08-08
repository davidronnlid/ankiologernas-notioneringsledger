// Netlify Function: Store image to Netlify Blobs (primary) and return a public HTTPS URL
// NOTE: This file intentionally exports EXACTLY ONE handler.

const crypto = require('crypto');
let blobsStore = null;
try {
  // In Netlify Functions you can access blobs directly without a token
  const { getStore } = require('@netlify/blobs');
  blobsStore = getStore('notion-images');
} catch (_) {
  // Blobs may not be available in local dev; fallback to MongoDB path
}
const { MongoClient } = require('mongodb');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Global cache (persists for the lifetime of the Lambda container)
let cachedClient = globalThis.__mongoClient || null;
let cachedDb = globalThis.__mongoDb || null;

async function getDb(event) {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');
  const dbName = process.env.MONGODB_DB || 'ankiologernasnotioneringsledger';
  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { maxPoolSize: 5 });
    await cachedClient.connect();
    globalThis.__mongoClient = cachedClient;
  }
  cachedDb = cachedClient.db(dbName);
  globalThis.__mongoDb = cachedDb;
  return cachedDb;
}

function parseImageDataUrl(dataUrl) {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl || '');
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { mimeType, buffer };
}

function resolveSiteBaseUrl(event) {
  let siteUrl = (process.env.PUBLIC_IMAGE_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim();
  const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
  const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers['X-Forwarded-Host'] || event.headers.host)) || '';
  const headerBase = host ? `${proto}://${host}` : '';
  if (!siteUrl) siteUrl = headerBase;
  if (siteUrl && siteUrl.startsWith('http://')) siteUrl = siteUrl.replace('http://', 'https://');
  if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);
  if (!/^https:\/\//i.test(siteUrl)) return null;
  return siteUrl;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { imageDataUrl } = JSON.parse(event.body || '{}');
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid imageDataUrl' }) };
    }

    const parsed = parseImageDataUrl(imageDataUrl);
    if (!parsed) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unsupported data URL format' }) };
    }

    // Compute a content hash to deduplicate identical images
    const contentHash = crypto.createHash('sha256').update(parsed.buffer).digest('hex');

    const blobsOnly = (process.env.USE_BLOBS_ONLY || 'true').toLowerCase() === 'true';
    // Prefer Netlify Blobs if available (default: true). This is revertible via USE_BLOBS_ONLY=false
    if (blobsStore) {
      const blobKey = `${contentHash}.${parsed.mimeType.split('/')[1] || 'bin'}`;
      await blobsStore.set(blobKey, parsed.buffer, {
        contentType: parsed.mimeType,
        cacheControl: 'public, max-age=31536000, immutable'
      });
      const publicUrl = blobsStore.getPublicUrl(blobKey);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, storage: 'blobs', key: blobKey, url: publicUrl, prettyUrl: publicUrl }) };
    }

    if (blobsOnly) {
      // Explicitly fail if blobs not available and we are configured to use blobs only
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ errorType: 'StorageError', errorMessage: 'Netlify Blobs not available and USE_BLOBS_ONLY=true' }) };
    }

    // Fallback to MongoDB storage (revertible behavior)
    const db = await getDb(event);
    const col = db.collection('notion_images');
    try { await col.createIndex({ hash: 1 }, { unique: true }); } catch (_) {}
    let id;
    const existing = await col.findOne({ hash: contentHash });
    if (existing && existing._id) {
      id = existing._id.toString();
    } else {
      const insertRes = await col.insertOne({ mimeType: parsed.mimeType, data: parsed.buffer, createdAt: new Date(), hash: contentHash });
      id = insertRes.insertedId && insertRes.insertedId.toString ? insertRes.insertedId.toString() : String(insertRes.insertedId);
    }
    const siteUrl = resolveSiteBaseUrl(event);
    if (!siteUrl) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No public https base URL resolved. Set PUBLIC_IMAGE_BASE_URL to your site origin.' }) };
    }
    const ext = parsed.mimeType.split('/')[1] || 'png';
    const urlQuery = `${siteUrl}/.netlify/functions/getImage?id=${id}`;
    const prettyUrl = `${siteUrl}/.netlify/functions/getImage/${id}.${ext}`;
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, storage: 'mongodb', id, url: prettyUrl, prettyUrl }) };
  } catch (error) {
    console.error('storeImage error:', error);
    // Include more detail for UI logs
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ errorType: error?.name || 'Error', errorMessage: error?.message || String(error) }) };
  }
};
