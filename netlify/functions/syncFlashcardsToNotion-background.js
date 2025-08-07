const { MongoClient } = require('mongodb');
const baseSync = require('./syncFlashcardsToNotion.js');

async function updateProgress(jobId, updater) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('ankiologernasnotioneringsledger');
  const col = db.collection('notion_flashcard_jobs');
  await col.updateOne({ jobId }, updater);
  await client.close();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { jobId } = payload;
    if (!jobId) return { statusCode: 400, body: 'Missing jobId' };

    await updateProgress(jobId, {
      $set: { status: 'running', updatedAt: new Date() },
      $push: { messages: { ts: Date.now(), level: 'info', text: 'Background job started' } },
    });

    // Monkey-patch fetch to intercept per-group progress from baseSync
    const originalConsoleLog = console.log;
    let processed = 0;
    console.log = async (...args) => {
      originalConsoleLog(...args);
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      if (/Adding\s+\d+\s+flashcard groups/.test(msg)) {
        // reset counter per lecture, no-op here
      }
      if (/Successfully added/.test(msg) || /heading_2/.test(msg)) {
        processed += 1;
      }
      await updateProgress(jobId, {
        $set: { processedGroups: processed, updatedAt: new Date() },
        $push: { messages: { ts: Date.now(), level: 'info', text: msg.slice(0, 400) } },
      });
    };

    // Call the existing sync function implementation
    const res = await baseSync.handler({ httpMethod: 'POST', body: JSON.stringify(payload) });

    console.log = originalConsoleLog; // restore

    await updateProgress(jobId, {
      $set: { status: 'completed', result: JSON.parse(res.body), updatedAt: new Date() },
      $push: { messages: { ts: Date.now(), level: 'info', text: 'Background job completed' } },
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error('background sync error:', error);
    try {
      const payload = JSON.parse(event.body || '{}');
      if (payload.jobId) {
        await updateProgress(payload.jobId, {
          $set: { status: 'failed', updatedAt: new Date(), error: error.message || 'error' },
          $push: { messages: { ts: Date.now(), level: 'error', text: error.message || 'error' } },
        });
      }
    } catch {}
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};


