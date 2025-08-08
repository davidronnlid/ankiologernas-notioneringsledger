// Netlify Function: Store image to MongoDB and return a public HTTPS URL
// NOTE: This file intentionally exports EXACTLY ONE handler.
// It also reuses a single MongoDB client across warm invocations to avoid redeclaration/connection issues.

const crypto = require('crypto');
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

    const db = await getDb(event);
    const col = db.collection('notion_images');
    // Best-effort: ensure unique index on hash (ignore errors if it already exists)
    try { await col.createIndex({ hash: 1 }, { unique: true }); } catch (_) {}

    // Idempotent upsert by hash
    const upsertRes = await col.findOneAndUpdate(
      { hash: contentHash },
      { $setOnInsert: { mimeType: parsed.mimeType, data: parsed.buffer, createdAt: new Date(), hash: contentHash } },
      { upsert: true, returnDocument: 'after' }
    );
    const id = (upsertRes.value && upsertRes.value._id ? upsertRes.value._id : upsertRes.lastErrorObject?.upserted) .toString();

    const siteUrl = resolveSiteBaseUrl(event);
    if (!siteUrl) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No public https base URL resolved. Set PUBLIC_IMAGE_BASE_URL to your site origin.' }) };
    }
    const publicUrl = `${siteUrl}/.netlify/functions/getImage?id=${id}`;

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, id, url: publicUrl }) };
  } catch (error) {
    console.error('storeImage error:', error);
    // Include more detail for UI logs
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ errorType: error?.name || 'Error', errorMessage: error?.message || String(error) }) };
  }
};
