const { MongoClient } = require('mongodb');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: 'Method Not Allowed' };
  const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
  if (!jobId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing jobId' }) };

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('ankiologernasnotioneringsledger');
    const col = db.collection('notion_flashcard_jobs');
    const job = await col.findOne({ jobId }, { projection: { _id: 0 } });
    await client.close();
    if (!job) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    return { statusCode: 200, headers, body: JSON.stringify(job) };
  } catch (error) {
    console.error('progressFlashcardSync error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Server error' }) };
  }
};


