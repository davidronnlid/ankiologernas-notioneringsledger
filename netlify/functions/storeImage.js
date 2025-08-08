// Single Netlify function to persist an image in MongoDB and return a public HTTPS URL
// IMPORTANT: Must export exactly one handler to avoid "Identifier has already been declared" errors

const { MongoClient } = require('mongodb');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { imageDataUrl } = JSON.parse(event.body || '{}');
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid imageDataUrl' }) };
    }

    const mimeMatch = imageDataUrl.match(/^data:(image\/[A-Za-z0-9.+-]+);base64,/);
    if (!mimeMatch) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported data URL format' }) };
    }

    const mimeType = mimeMatch[1];
    const base64Data = imageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    const uri = process.env.MONGODB_URI;
    if (!uri) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing MONGODB_URI' }) };
    const dbName = process.env.MONGODB_DB || 'ankiologernasnotioneringsledger';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('notion_images');

    const doc = { mimeType, data: buffer, createdAt: new Date() };
    const insertResult = await col.insertOne(doc);
    await client.close();

    const id = insertResult.insertedId.toString();

    // Resolve a public https base URL for the function
    const envBase = (process.env.PUBLIC_IMAGE_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim();
    const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
    const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers['X-Forwarded-Host'] || event.headers.host)) || '';
    const headerBase = host ? `${proto}://${host}` : '';
    let siteUrl = envBase || headerBase;
    if (siteUrl && siteUrl.startsWith('http://')) siteUrl = siteUrl.replace('http://', 'https://');
    if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);
    if (!/^https:\/\//i.test(siteUrl)) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No public https base URL resolved. Set PUBLIC_IMAGE_BASE_URL to your site origin.' }) };
    }
    const publicUrl = `${siteUrl}/.netlify/functions/getImage?id=${id}`;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id, url: publicUrl }) };
  } catch (error) {
    console.error('storeImage error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Server error' }) };
  }
};

const { MongoClient, GridFSBucket } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');
  cachedClient = await MongoClient.connect(uri, { maxPoolSize: 5 });
  const dbName = process.env.MONGODB_DB || new URL(uri).pathname.replace('/', '') || 'notioneringsledger';
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

function parseDataUrl(dataUrl) {
  // data:image/png;base64,XXXX
  const match = /^data:(.+?);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return null;
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { contentType, buffer };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const { imageDataUrl } = JSON.parse(event.body || '{}');
    if (!imageDataUrl) {
      return { statusCode: 400, body: 'Missing imageDataUrl' };
    }

    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      return { statusCode: 400, body: 'Invalid data URL' };
    }

    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: process.env.GRIDFS_BUCKET || 'images' });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: parsed.contentType,
      metadata: { contentType: parsed.contentType }
    });
    await new Promise((resolve, reject) => {
      uploadStream.end(parsed.buffer, (err) => (err ? reject(err) : resolve()));
    });

    const id = uploadStream.id.toString();

    // Construct a public https URL to the serving function
    const base = process.env.URL || (event.headers && (event.headers['x-forwarded-host'] || event.headers.host) ? `https://${event.headers['x-forwarded-host'] || event.headers.host}` : '');
    const prettyUrl = base ? `${base}/.netlify/functions/getImage?id=${encodeURIComponent(id)}` : null;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, url: prettyUrl, prettyUrl })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

const { MongoClient, ObjectId } = require('mongodb');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { imageDataUrl } = JSON.parse(event.body || '{}');
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid imageDataUrl' }) };
    }

    const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (!mimeMatch) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported data URL format' }) };
    }

    const mimeType = mimeMatch[1];
    const base64Data = imageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('ankiologernasnotioneringsledger');
    const col = db.collection('notion_images');

    const doc = {
      mimeType,
      data: buffer,
      createdAt: new Date(),
    };
    const insertResult = await col.insertOne(doc);
    await client.close();

    const id = insertResult.insertedId.toString();
    // Build a stable, public HTTPS base URL. Notion requires a publicly accessible https URL.
    const envBase = (process.env.PUBLIC_IMAGE_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim();
    const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
    const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers['X-Forwarded-Host'] || event.headers.host)) || '';
    const headerBase = host ? `${proto}://${host}` : '';
    let siteUrl = envBase || headerBase;
    // Normalize and force https; drop trailing slash
    if (siteUrl && siteUrl.startsWith('http://')) siteUrl = siteUrl.replace('http://', 'https://');
    if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);
    // If still empty or local, try headerBase; if still local, bail with clear error
    if (!siteUrl || /localhost|127\.0\.0\.1/i.test(siteUrl)) {
      if (headerBase && !/localhost|127\.0\.0\.1/i.test(headerBase)) {
        siteUrl = headerBase.replace('http://', 'https://');
      }
    }
    if (!siteUrl || !/^https:\/\//i.test(siteUrl)) {
      // Explicitly guide caller to set PUBLIC_IMAGE_BASE_URL
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No public https base URL resolved. Set PUBLIC_IMAGE_BASE_URL to your site origin (e.g. https://your-site.netlify.app).' }) };
    }
    const publicUrl = `${siteUrl}/.netlify/functions/getImage?id=${id}`;
    const prettyUrl = `${siteUrl}/.netlify/functions/getImage/${id}.png`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id, url: publicUrl, prettyUrl }),
    };
  } catch (error) {
    console.error('storeImage error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Server error' }) };
  }
};


