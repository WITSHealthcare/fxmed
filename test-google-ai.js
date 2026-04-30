const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test Google AI API with different models
async function testGoogleAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('Please set GOOGLE_AI_API_KEY environment variable');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const models = [
    'gemini-1.5-pro',
    'gemini-1.5-flash', 
    'gemini-pro',
    'gemini-pro-vision',
    'text-bison-001',
    'chat-bison-001'
  ];

  console.log('Testing Google AI models...\n');

  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent('Say "Hello from Google AI!"');
      const response = await result.response;
      const text = response.text();
      
      console.log(`  SUCCESS: ${modelName}`);
      console.log(`  Response: ${text.substring(0, 100)}...\n`);
      
      // If we find a working model, we can stop
      break;
      
    } catch (error) {
      console.log(`  FAILED: ${modelName} - ${error.message}\n`);
    }
  }
}

// List available models
async function listModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('Please set GOOGLE_AI_API_KEY environment variable');
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    console.log('Available models:');
    data.models?.forEach(model => {
      console.log(`  - ${model.name} (${model.displayName})`);
      console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
    });
  } catch (error) {
    console.log('Error listing models:', error.message);
  }
}

// Run tests
listModels().then(() => {
  console.log('\n');
  testGoogleAI();
});
