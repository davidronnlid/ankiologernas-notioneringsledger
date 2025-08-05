exports.handler = async function(event, context) {
  console.log('🏥 Health check function called');
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Netlify Functions are working!',
      timestamp: new Date().toISOString(),
      function: 'health-check',
      method: event.httpMethod,
      path: event.path
    })
  };
}; 