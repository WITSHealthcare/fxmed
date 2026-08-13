// Test Gemini with correct model names
const https = require('https');

function testModel(modelName) {
  return new Promise((resolve) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is required');
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: 'Write a haiku about health'
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
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(responseData);
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log(`SUCCESS: ${modelName}`);
          console.log(`Response: ${text}`);
          resolve(true);
        } else {
          console.log(`FAILED: ${modelName} - Status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.write(data);
    req.end();
  });
}

async function testBestModels() {
  const models = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash', 'gemini-2.5-pro'];
  
  for (const model of models) {
    const success = await testModel(model);
    if (success) break;
    await new Promise(r => setTimeout(r, 500));
  }
}

testBestModels();
