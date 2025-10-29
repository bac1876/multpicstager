const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ success: false, error: 'Missing task ID' });
  }

  if (!process.env.KIEAI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Kie.ai API key not configured' });
  }

  try {
    const apiKey = (process.env.KIEAI_API_KEY || '').trim();

    const statusResponse = await fetch(`https://api.kie.ai/api/v1/playground/recordInfo?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const statusData = await statusResponse.json();

    console.log('Kie.ai status check:', {
      taskId,
      status: statusData.data?.status || statusData.status,
      code: statusData.code
    });

    // Extract status from response (Kie.ai uses "state" field)
    const state = statusData.data?.state || statusData.state || statusData.status;

    // Map Kie.ai states to our status
    let status;
    if (state === 'success' || state === 'successful' || state === 'completed') {
      status = 'completed';
    } else if (state === 'fail' || state === 'failed') {
      status = 'failed';
    } else if (state === 'processing' || state === 'queuing' || state === 'generating') {
      status = 'processing';
    } else {
      status = state;
    }

    if (status === 'successful' || status === 'completed') {
      // Extract image URLs from response
      let resultImages = [];

      // Check for resultJson (Kie.ai's actual format)
      if (statusData.data?.resultJson) {
        try {
          const parsed = JSON.parse(statusData.data.resultJson);
          if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
            resultImages = parsed.resultUrls;
          }
        } catch (e) {
          console.error('Failed to parse resultJson:', e);
        }
      }

      // Fallback to other possible formats
      if (resultImages.length === 0) {
        if (statusData.data?.result?.images) {
          resultImages = statusData.data.result.images;
        } else if (statusData.data?.result?.output_url) {
          resultImages = [statusData.data.result.output_url];
        } else if (statusData.data?.output_url) {
          resultImages = [statusData.data.output_url];
        } else if (statusData.data?.images) {
          resultImages = statusData.data.images;
        } else if (statusData.result?.images) {
          resultImages = statusData.result.images;
        } else if (statusData.result?.output_url) {
          resultImages = [statusData.result.output_url];
        } else if (statusData.output_url) {
          resultImages = [statusData.output_url];
        } else if (statusData.images) {
          resultImages = statusData.images;
        }
      }

      return res.status(200).json({
        success: true,
        status: 'completed',
        images: resultImages
      });
    } else if (status === 'failed') {
      const failMsg = statusData.data?.failMsg || statusData.data?.fail_msg || statusData.data?.error || statusData.error || 'Task failed';
      const failCode = statusData.data?.failCode || statusData.data?.fail_code;

      return res.status(200).json({
        success: false,
        status: 'failed',
        error: failMsg + (failCode ? ` (Code: ${failCode})` : '')
      });
    } else {
      // Still processing
      return res.status(200).json({
        success: true,
        status: 'processing',
        message: 'Task is still being processed'
      });
    }
  } catch (error) {
    console.error('Kie.ai status check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check task status'
    });
  }
}
