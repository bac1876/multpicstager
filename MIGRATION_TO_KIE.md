# Migration from Gemini API to KIE.ai

## Summary

✅ **Migration Complete!** Your app now uses KIE.ai instead of Gemini API for **50% cost savings**.

- **Old cost**: $0.039 per image (Gemini direct)
- **New cost**: $0.02 per image (KIE.ai)
- **Savings**: 49% reduction

## Changes Made

### 1. New Services Created

#### `services/kieService.ts`
- Implements KIE.ai's async task-based workflow
- Functions:
  - `createKieTask()` - Creates a staging task
  - `checkKieTaskStatus()` - Checks task status
  - `pollKieTask()` - Polls until completion
  - `restageImageWithKie()` - Main restaging function

#### `services/imageUploadService.ts`
- Uploads base64 images to public URLs (required by KIE.ai)
- Functions:
  - `uploadBase64ToImgBB()` - Primary method (ImgBB)
  - `uploadBase64ToCatbox()` - Fallback option

### 2. App.tsx Updated

The `processImage()` function now:
1. Converts file to base64
2. Uploads to ImgBB to get public URL
3. Creates KIE task with staging prompt
4. Polls for completion (up to 60 seconds)
5. Returns result URL

### 3. Environment Variables

**New variables added to `.env.local`:**
```bash
KIEAI_API_KEY=your_kie_ai_api_key_here
IMGBB_API_KEY=your_imgbb_api_key_here
```

**Vite config updated** to expose these variables to the app.

## Setup Instructions

### 1. Get KIE.ai API Key

1. Sign up at https://kie.ai
2. Navigate to API settings
3. Copy your API key
4. Add to `.env.local`:
   ```bash
   KIEAI_API_KEY=your_actual_kie_api_key
   ```

### 2. Get ImgBB API Key

1. Sign up at https://api.imgbb.com/
2. Get free API key (no credit card required)
3. Add to `.env.local`:
   ```bash
   IMGBB_API_KEY=your_actual_imgbb_key
   ```

### 3. Restart Dev Server

```bash
npm run dev
```

The app will now use KIE.ai for all image staging!

## How It Works

### Old Flow (Gemini - Synchronous)
```
User uploads image → Convert to base64 → Send to Gemini → Wait → Get result
```

### New Flow (KIE.ai - Asynchronous)
```
User uploads image
  ↓
Convert to base64
  ↓
Upload to ImgBB (get public URL)
  ↓
Create KIE task with URL + prompt
  ↓
Poll every 2 seconds (max 30 attempts = 60s)
  ↓
Get result URL
  ↓
Display restaged image
```

## Key Differences

| Feature | Gemini API | KIE.ai API |
|---------|-----------|-----------|
| **Cost** | $0.039/image | $0.02/image |
| **Request Type** | Synchronous | Asynchronous |
| **Image Input** | Base64 or URL | **HTTP/HTTPS URL only** |
| **Response Time** | Immediate | 10-30 seconds (polling) |
| **Implementation** | 1 API call | 2 calls (create + check) |

## Troubleshooting

### "KIEAI_API_KEY environment variable not set"
- Make sure you added the key to `.env.local`
- Restart your dev server after adding env variables

### "ImgBB API key is not configured"
- Get free API key from https://api.imgbb.com/
- Add to `.env.local` and restart server

### "Task timeout after 60 seconds"
- Image processing took too long
- Try a smaller image or simpler prompt
- KIE typically completes in 10-30 seconds

### "Image upload failed"
- Check your ImgBB API key is correct
- Verify image is a valid JPEG/PNG
- Try the Catbox fallback (no API key needed)

### "401 Unauthorized"
- Your KIE.ai API key is invalid
- Check for extra whitespace (the code already trims it)
- Generate a new key from https://kie.ai

### "402 Insufficient credits"
- Add credits to your KIE.ai account
- Check your balance at https://kie.ai

## Switching Back to Gemini (if needed)

If you need to revert to Gemini API:

1. In `App.tsx`, change line 104:
   ```typescript
   // Change from:
   const restagedImageUrl = await restageImageWithKie(imageUrl, effectiveRoomType, restageOptions);

   // Back to:
   const restagedBase64 = await restageImage(base64Data, imageToProcess.file.type, effectiveRoomType, restageOptions);
   const restagedUrl = `data:image/jpeg;base64,${restagedBase64}`;
   ```

2. Update state setter to use `restagedUrl` instead of `restagedImageUrl`

## Performance Notes

- **Polling interval**: 2 seconds (configurable in `kieService.ts`)
- **Max attempts**: 30 (= 60 seconds timeout)
- **ImgBB expiration**: 10 minutes (auto-cleanup)
- **Average KIE processing time**: 10-30 seconds

## Cost Analysis

For 100 images:
- **Gemini**: 100 × $0.039 = $3.90
- **KIE.ai**: 100 × $0.02 = $2.00
- **Savings**: $1.90 (49%)

For 1,000 images:
- **Gemini**: 1,000 × $0.039 = $39.00
- **KIE.ai**: 1,000 × $0.02 = $20.00
- **Savings**: $19.00 (49%)

## Next Steps

1. ✅ Add your API keys to `.env.local`
2. ✅ Restart the dev server
3. ✅ Test with a sample image
4. ✅ Deploy to production with updated env variables
5. ✅ Monitor cost savings!

## Files Modified

- ✅ `services/kieService.ts` (new)
- ✅ `services/imageUploadService.ts` (new)
- ✅ `App.tsx` (updated)
- ✅ `vite.config.ts` (added env vars)
- ✅ `.env.local` (added KIE keys)
- ✅ `.env.example` (added KIE keys template)

---

**Questions?** Check the KIE_AI_API_GUIDE.md for detailed API documentation.
