# 🆓 Free AI Blog Assistant Setup with Ollama

## 🚀 Quick Setup Guide

### 1. Install Ollama (Free Local AI)

**Mac/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
- Download from [ollama.ai](https://ollama.ai)
- Run the installer

### 2. Download a Model (Free)
```bash
# Llama 3 (Recommended - 4.7GB)
ollama pull llama3

# Or try smaller models:
# ollama pull mistral (4.1GB)
# ollama pull gemma:2b (1.6GB)
```

### 3. Start Ollama
```bash
ollama serve
```

### 4. Configure Your Project

Add to your `.env.local` file:
```bash
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 5. Restart Your Server
```bash
npm run dev
```

## ✅ Testing

Test Ollama is working:
```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "llama3",
    "prompt": "Write a haiku about health",
    "stream": false
  }'
```

## 🎯 Benefits

- **100% Free** - No API costs
- **Private** - Runs locally on your machine
- **Fast** - No network latency
- **Unlimited** - No rate limits
- **Secure** - Data never leaves your computer

## 🔧 Troubleshooting

**If Ollama isn't found:**
- Make sure Ollama is installed and running
- Check `http://localhost:11434` is accessible

**If model is slow:**
- Try smaller models like `mistral` or `gemma:2b`
- Ensure you have enough RAM (8GB+ recommended)

**If AI assistant shows error:**
- Verify `OLLAMA_ENABLED=true` in `.env.local`
- Restart your development server
- Check Ollama is running with `ollama serve`

## 📋 Available Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| llama3 | 4.7GB | Excellent | Fast |
| mistral | 4.1GB | Very Good | Fast |
| gemma:2b | 1.6GB | Good | Very Fast |

**Start with `llama3` for best results!**
