// List available Gemini models
const https = require('https');

function listModels(apiKey) {
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const result = JSON.parse(responseData);
        console.log('Available models:');
        if (result.models && result.models.length > 0) {
          result.models.forEach(model => {
            console.log(`  - ${model.name} (${model.displayName})`);
            console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'None'}`);
            console.log('');
          });
        } else {
          console.log('No models found');
        }
      } else {
        console.log(`Error listing models (Status: ${res.statusCode}):`);
        console.log(responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.log('Request error:', error.message);
  });

  req.end();
}

const apiKey = 'AIzaSyB2QivlVr_3ID659BKCp4EqC1sOhb_TUO0';
listModels(apiKey);
