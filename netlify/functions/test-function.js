exports.handler = async function(event, context) {
  console.log('🧪 Test function called');
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Netlify Function is working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path
    })
  };
}; 