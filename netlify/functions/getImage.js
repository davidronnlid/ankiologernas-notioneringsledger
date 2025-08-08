// Netlify Function: Serve image bytes stored in MongoDB simple collection
// NOTE: export exactly one handler; reuse cached Mongo client

const { MongoClient, ObjectId } = require('mongodb');

let cachedClient = globalThis.__mongoClient || null;
let cachedDb = globalThis.__mongoDb || null;

async function getDb() {
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

exports.handler = async (event) => {
  try {
    let id = event.queryStringParameters && event.queryStringParameters.id;
    // Support pretty URLs: /.netlify/functions/getImage/:id(.ext)
    if (!id && event.path) {
      const m = event.path.match(/getImage\/(.+)$/);
      if (m && m[1]) {
        id = m[1].split('.')[0];
      }
    }
    if (!id) return { statusCode: 400, body: 'Missing id' };

    const db = await getDb();
    const col = db.collection('notion_images');
    const doc = await col.findOne({ _id: new ObjectId(id) });
    if (!doc) return { statusCode: 404, body: 'Not found' };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': doc.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: (doc.data && Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data?.buffer || doc.data)).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('getImage error:', error);
    return { statusCode: 500, body: error?.message || 'Server error' };
  }
};
