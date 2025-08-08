const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

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

exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return { statusCode: 400, body: 'Missing id' };

    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: process.env.GRIDFS_BUCKET || 'images' });

    const _id = new ObjectId(id);
    const files = await db.collection((process.env.GRIDFS_BUCKET || 'images') + '.files').find({ _id }).toArray();
    if (!files || !files[0]) return { statusCode: 404, body: 'Not found' };
    const file = files[0];

    const stream = bucket.openDownloadStream(_id);
    const chunks = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': file.contentType || file.metadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};

const { MongoClient, ObjectId } = require('mongodb');

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
    if (!id) {
      return { statusCode: 400, body: 'Missing id' };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('ankiologernasnotioneringsledger');
    const col = db.collection('notion_images');
    const doc = await col.findOne({ _id: new ObjectId(id) });
    await client.close();

    if (!doc) {
      return { statusCode: 404, body: 'Not found' };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': doc.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: doc.data.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('getImage error:', error);
    return { statusCode: 500, body: 'Server error' };
  }
};


