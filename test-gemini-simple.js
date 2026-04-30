// Simple Gemini API test
const https = require('https');

function testGeminiAPI(apiKey) {
  if (!apiKey || apiKey === 'your_google_ai_api_key') {
    console.log('Please set your actual Google AI API key');
    console.log('Get one from: https://aistudio.google.com/app/apikey');
    return;
  }

  const data = JSON.stringify({
    contents: [{
      parts: [{
        text: "Write a short haiku about health"
      }]
    }]
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const result = JSON.parse(responseData);
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('SUCCESS! Gemini response:');
        console.log(text);
      } else {
        console.log('ERROR:');
        console.log(responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.log('Request error:', error.message);
  });

  req.write(data);
  req.end();
}

// Test with your API key
const apiKey = process.env.GOOGLE_AI_API_KEY || 'your_google_ai_api_key';
testGeminiAPI(apiKey);
