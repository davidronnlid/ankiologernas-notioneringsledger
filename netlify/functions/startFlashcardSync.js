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
    const payload = JSON.parse(event.body || '{}');
    const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('ankiologernasnotioneringsledger');
    const col = db.collection('notion_flashcard_jobs');
    await col.insertOne({
      jobId,
      status: 'started',
      processedGroups: 0,
      totalGroups: payload?.flashcardGroups?.length || 0,
      messages: [{ ts: Date.now(), level: 'info', text: 'Job created' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await client.close();

    // Do NOT trigger a background function (plan limitation). Client will
    // call the synchronous sync function and poll progress using this jobId.
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, jobId }) };
  } catch (error) {
    console.error('startFlashcardSync error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Server error' }) };
  }
};


