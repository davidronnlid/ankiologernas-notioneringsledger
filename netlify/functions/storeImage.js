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
    const publicUrl = `${process.env.URL || ''}/.netlify/functions/getImage?id=${id}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id, url: publicUrl }),
    };
  } catch (error) {
    console.error('storeImage error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Server error' }) };
  }
};


