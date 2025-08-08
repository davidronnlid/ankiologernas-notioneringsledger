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


