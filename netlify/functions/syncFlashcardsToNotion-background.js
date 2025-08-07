// Removed background function due to plan limitations.
// This file is kept to avoid import errors but exports a stub that fails fast if invoked.
exports.handler = async () => ({ statusCode: 400, body: 'Background functions not supported. Use syncFlashcardsToNotion instead.' });


