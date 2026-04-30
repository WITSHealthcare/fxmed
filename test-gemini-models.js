// Test different Gemini model names
const https = require('https');

function testGeminiModel(apiKey, modelName) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: "Say 'Hello from Gemini'"
        }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(responseData);
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`SUCCESS: ${modelName}`);
          console.log(`Response: ${text}`);
          resolve({ success: true, model: modelName, response: text });
        } else {
          console.log(`FAILED: ${modelName} - Status: ${res.statusCode}`);
          resolve({ success: false, model: modelName, error: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`ERROR: ${modelName} - ${error.message}`);
      resolve({ success: false, model: modelName, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function testAllModels() {
  const apiKey = 'AIzaSyB2QivlVr_3ID659BKCp4EqC1sOhb_TUO0';
  
  const models = [
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-pro-latest',
    'gemini-1.0-pro',
    'text-bison-001',
    'chat-bison-001'
  ];

  console.log('Testing Gemini models...\n');

  for (const model of models) {
    const result = await testGeminiModel(apiKey, model);
    if (result.success) {
      console.log(`\nFound working model: ${model}`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
}

testAllModels();
