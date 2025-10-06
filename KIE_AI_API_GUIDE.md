# Kie.ai API Integration Guide

## Overview

Kie.ai provides access to Google's Gemini 2.5 Flash model at **50% lower cost** compared to direct Gemini API usage.

- **Kie.ai Cost**: $0.02 per image
- **Google Gemini Direct**: $0.039 per image
- **Savings**: 49% cost reduction

## API Endpoint Information

### Base URL
```
https://api.kie.ai/api/v1/playground
```

### Authentication
- **Method**: Bearer token
- **Header**: `Authorization: Bearer YOUR_API_KEY`
- **API Key**: Get from https://kie.ai (requires account signup)

## Key Difference: Async Architecture

**IMPORTANT**: Kie.ai uses a task-based async workflow, NOT a direct request/response like Gemini.

### Gemini API Flow (Synchronous):
```
Request → Wait → Get Result (one call)
```

### Kie.ai Flow (Asynchronous):
```
1. Create Task → Get Task ID
2. Poll Status → Check if complete
3. Get Result → Extract images
```

## Implementation Steps

### Step 1: Create Task

**Endpoint**: `POST https://api.kie.ai/api/v1/playground/createTask`

**Headers**:
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

**Request Body**:
```javascript
{
  "model": "google/nano-banana-edit",
  "input": {
    "prompt": "Your staging prompt with rules",
    "image_urls": ["https://example.com/image.jpg"]
  }
}
```

**CRITICAL**:
- ✅ Image must be a PUBLIC HTTP/HTTPS URL
- ❌ Does NOT accept base64 data URLs
- ❌ Does NOT accept `data:image/jpeg;base64,...` format

**Response**:
```javascript
{
  "code": 200,
  "msg": "success",
  "taskId": "abc123..."  // Use this for polling
}
```

### Step 2: Poll for Completion

**Endpoint**: `GET https://api.kie.ai/api/v1/playground/recordInfo?taskId=YOUR_TASK_ID`

**Headers**:
```javascript
{
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

**Response (Processing)**:
```javascript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123...",
    "state": "processing"  // or "queuing" or "generating"
  }
}
```

**Response (Success)**:
```javascript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123...",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://tempfile.aiquickdraw.com/workers/nano/image_123.png\"]}"
  }
}
```

**Response (Failed)**:
```javascript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123...",
    "state": "fail",
    "failCode": "501",
    "failMsg": "Error description"
  }
}
```

### Step 3: Extract Images

**IMPORTANT**: Images are in a stringified JSON field called `resultJson`:

```javascript
const parsed = JSON.parse(response.data.resultJson);
const imageUrls = parsed.resultUrls; // Array of image URLs
```

## Complete Implementation Example

### Backend (Node.js)

```javascript
// Create Task
async function createKieTask(imageUrl, prompt) {
  const response = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.KIEAI_API_KEY.trim()}`
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt: prompt,
        image_urls: [imageUrl]
      }
    })
  });

  const data = await response.json();
  return data.taskId;
}

// Check Status
async function checkKieStatus(taskId) {
  const response = await fetch(
    `https://api.kie.ai/api/v1/playground/recordInfo?taskId=${taskId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.KIEAI_API_KEY.trim()}`
      }
    }
  );

  const data = await response.json();
  const state = data.data?.state;

  if (state === 'success') {
    // Parse the stringified JSON to get images
    const resultJson = JSON.parse(data.data.resultJson);
    return {
      status: 'completed',
      images: resultJson.resultUrls
    };
  } else if (state === 'fail') {
    return {
      status: 'failed',
      error: data.data.failMsg
    };
  } else {
    return {
      status: 'processing'
    };
  }
}
```

### Frontend Polling

```javascript
async function stageWithKie(imageUrl, prompt) {
  // Step 1: Create task
  const taskResponse = await fetch('/api/kie-stage', {
    method: 'POST',
    body: JSON.stringify({ image: imageUrl, prompt })
  });
  const { taskId } = await taskResponse.json();

  // Step 2: Poll for completion (every 2 seconds, max 30 attempts = 60s)
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch(`/api/kie-check-status?taskId=${taskId}`);
    const statusData = await statusResponse.json();

    if (statusData.status === 'completed') {
      return statusData.images; // Success!
    } else if (statusData.status === 'failed') {
      throw new Error(statusData.error);
    }
    // Otherwise keep polling
  }

  throw new Error('Timeout after 60 seconds');
}
```

## Handling Base64 Images

Since Kie.ai requires HTTP URLs, you need to convert base64 images first.

**Solution**: Upload to temporary image host (ImgBB, Catbox, etc.)

```javascript
// Upload base64 to ImgBB
async function uploadBase64ToImgBB(base64Data) {
  const params = new URLSearchParams();
  params.append('image', base64Data.replace(/^data:image\/\w+;base64,/, ''));
  params.append('expiration', '600'); // Auto-delete after 10 minutes

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    }
  );

  const data = await response.json();
  return data.data.url; // Public HTTP URL
}

// Then use with Kie.ai
const imageUrl = await uploadBase64ToImgBB(base64Image);
const taskId = await createKieTask(imageUrl, prompt);
```

## Prompt Format

Kie.ai uses the same prompt format as Gemini. Structure your prompts like this:

```javascript
const prompt = `YOUR_MAIN_INSTRUCTION

IMPORTANT RULES: ${rules.join(' ')}`;
```

**Example**:
```javascript
const prompt = `Professionally stage this empty living room by adding furniture and decor in a modern style.

IMPORTANT RULES: Do not make any structural changes to the room (do not add or remove walls, windows, doors, or permanent fixtures). Preserve the exact room layout and architectural features.`;
```

## Common Gotchas

### 1. API Key Whitespace
❌ **Problem**: `Bearer d2f19efe is not a legal HTTP header value`
✅ **Solution**: Always `.trim()` your API key
```javascript
const apiKey = process.env.KIEAI_API_KEY.trim();
```

### 2. Model Parameter Missing
❌ **Error**: `{"code": 422, "msg": "The model cannot be null"}`
✅ **Solution**: Always include `model: "google/nano-banana-edit"`

### 3. Image Format
❌ **Error**: Task created but returns no images
✅ **Solution**: Use HTTP/HTTPS URLs, not base64 data URLs

### 4. Result Parsing
❌ **Error**: Getting empty images array
✅ **Solution**: Parse the `resultJson` field:
```javascript
const images = JSON.parse(data.data.resultJson).resultUrls;
```

### 5. Serverless Timeout
❌ **Problem**: Function timeout on Vercel (10s limit on free tier)
✅ **Solution**: Return task ID immediately, poll from frontend

## Environment Variables

```bash
# .env.local
KIEAI_API_KEY=your_kie_ai_api_key_here

# Optional: For base64 → URL conversion
IMGBB_API_KEY=your_imgbb_api_key_here
```

## Vercel Deployment

```bash
# Add to Vercel
vercel env add KIEAI_API_KEY production
vercel env add IMGBB_API_KEY production

# Deploy
vercel --prod
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401  | Unauthorized | Check API key is correct |
| 402  | Insufficient credits | Add credits to Kie.ai account |
| 422  | Validation error | Check model and input format |
| 429  | Rate limit | Wait and retry |
| 501  | Processing failed | Check prompt and image |

## Performance

- **Average processing time**: 10-30 seconds
- **Recommended polling interval**: 2 seconds
- **Recommended timeout**: 60 seconds (30 polls × 2s)
- **Image size limit**: 10MB recommended

## Cost Comparison

| Service | Cost per Image | Notes |
|---------|---------------|-------|
| Kie.ai (Gemini 2.5 Flash) | $0.02 | Best value |
| Google Gemini Direct | $0.039 | 95% more expensive |
| OpenAI DALL-E 3 | ~$0.04 | Similar cost to Gemini |

## Migration from Gemini

### Before (Gemini Direct):
```javascript
const response = await fetch('https://api.google.com/gemini', {
  method: 'POST',
  body: JSON.stringify({ prompt, image: base64 })
});
const { image_url } = await response.json();
```

### After (Kie.ai):
```javascript
// 1. Convert base64 to URL
const imageUrl = await uploadToImgBB(base64);

// 2. Create task
const taskResponse = await fetch('/api/kie-stage', {
  method: 'POST',
  body: JSON.stringify({ image: imageUrl, prompt })
});
const { taskId } = await taskResponse.json();

// 3. Poll for result
const result = await pollUntilComplete(taskId);
const image_url = result.images[0];
```

## Summary: Key Differences

| Feature | Gemini API | Kie.ai API |
|---------|-----------|-----------|
| **Cost** | $0.039/image | $0.02/image (49% cheaper) |
| **Flow** | Synchronous | Asynchronous (task-based) |
| **Image Input** | Base64 or URL | **HTTP/HTTPS URL only** |
| **Response** | Immediate | Polling required |
| **Implementation** | 1 endpoint | 2 endpoints (create + check) |
| **Timeout Handling** | Wait for response | Frontend polling |

## Get Started

1. Sign up at https://kie.ai
2. Get API key from dashboard
3. Implement async task workflow
4. Add base64 → URL conversion if needed
5. Deploy and enjoy 50% cost savings!
