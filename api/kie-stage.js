const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    image,
    transformation_type = 'furnish',
    space_type = 'interior',
    room_type = 'living_room',
    design_style = 'modern',
    update_flooring = false,
    block_decorative = true
  } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: 'Missing image data' });
  }

  if (!process.env.KIEAI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Kie.ai API key not configured' });
  }

  try {
    // Build prompt based on transformation type (same as Gemini)
    let prompt = '';
    const rules = [
      'Do not make any structural changes to the room (do not add or remove walls, windows, doors, or permanent fixtures).',
      'Preserve the exact room layout and architectural features.'
    ];

    const roomName = room_type.replace(/_/g, ' ');
    const styleName = design_style.replace(/_/g, ' ');
    const spaceTypeText = space_type === 'exterior' ? 'outdoor space' : roomName;

    switch (transformation_type) {
      case 'furnish':
        prompt = `Professionally stage this empty ${spaceTypeText} by adding furniture and decor in a ${styleName} style. Create a high-end, aesthetically pleasing result suitable for a real estate listing with enhanced lighting and beautiful furniture placement.`;
        if (block_decorative) {
          rules.push('Minimize or avoid adding decorative items like plants, vases, or animals.');
        }
        break;

      case 'empty':
        prompt = `Remove all furniture, decor, and movable items from this ${spaceTypeText}. Show the empty room with clean walls and floors. Preserve all architectural features, windows, doors, and built-in fixtures.`;
        break;

      case 'redesign':
        prompt = `Redesign this ${spaceTypeText} in a ${styleName} style. Replace existing furniture and decor with new pieces that match the ${styleName} aesthetic. Create a cohesive, professionally designed space suitable for real estate marketing.`;
        if (block_decorative) {
          rules.push('Minimize decorative items like plants, vases, or animals.');
        }
        break;

      case 'enhance':
        prompt = `Enhance this ${spaceTypeText} photo by improving lighting, color balance, and overall visual quality. Make the space look more appealing and professional for real estate marketing. Do not add, remove, or change any furniture or decor.`;
        rules.push('Do not add or remove any furniture or objects.');
        rules.push('Do not change the room layout or furniture placement.');
        break;

      case 'renovate':
        prompt = `Dramatically transform and renovate this ${spaceTypeText} in a ${styleName} style. Apply creative AI processing to completely reimagine the space with new furniture, enhanced lighting, and a fresh design. Create a stunning, high-end result that showcases the room's potential.`;
        // Extra emphasis on preserving structure for renovate mode
        rules.push('CRITICAL: Keep all windows in their exact original positions - do not move, add, remove, or resize windows.');
        rules.push('CRITICAL: Keep all doors in their exact original positions - do not move, add, remove, or change doors.');
        rules.push('CRITICAL: Do not modify walls, ceiling, or floor layout.');
        break;

      case 'day_to_dusk':
        prompt = `Convert this ${spaceTypeText} to an evening/dusk scene. Add warm, ambient lighting with sunset or twilight tones. Make the space look cozy and inviting with appropriate evening lighting. Do not change furniture, decor, or room layout.`;
        rules.push('Do not change furniture or decor.');
        break;

      case 'outdoor':
        prompt = `Add outdoor furniture and decor to this ${spaceTypeText} in a ${styleName} style. Create an inviting outdoor living space suitable for real estate marketing.`;
        rules.push('Preserve all existing structures, buildings, and landscape features.');
        break;

      case 'blue_sky':
        prompt = `Enhance this outdoor space photo by adding a beautiful blue sky with natural clouds. Improve overall lighting and make the space look more appealing. Do not change the space itself, furniture, or landscape.`;
        rules.push('Do not change the outdoor space or furniture.');
        break;

      default:
        throw new Error(`Unknown transformation type: ${transformation_type}`);
    }

    // Add flooring instructions
    if (transformation_type !== 'empty' && transformation_type !== 'enhance' && transformation_type !== 'day_to_dusk') {
      if (update_flooring) {
        prompt += ` Update the flooring with new, stylish flooring that fits the ${styleName} theme.`;
      } else {
        rules.push('Do not change the flooring material, color, or pattern.');
      }
    }

    // Combine prompt with rules
    const fullPrompt = `${prompt}\n\nIMPORTANT RULES: ${rules.join(' ')}`;

    console.log('Kie.ai API Request:', {
      transformation_type,
      room_type,
      design_style,
      promptLength: fullPrompt.length
    });

    // Prepare image for Kie.ai API
    let imageUrl;
    if (image.startsWith('http')) {
      // If it's already a URL, use it directly
      imageUrl = image;
    } else if (image.startsWith('data:')) {
      // If it's base64, use it as-is
      imageUrl = image;
    } else {
      // Assume it's base64 without the data: prefix
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    // Step 1: Create task at Kie.ai
    const apiKey = (process.env.KIEAI_API_KEY || '').trim();
    const createTaskResponse = await fetch('https://api.kie.ai/api/v1/playground/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "google/nano-banana-edit",  // Nano Banana model for image editing
        input: {
          prompt: fullPrompt,
          image_urls: [imageUrl]
        }
      })
    });

    const taskData = await createTaskResponse.json();

    if (!createTaskResponse.ok) {
      console.error('Kie.ai createTask error:', taskData);
      console.error('Response status:', createTaskResponse.status);
      console.error('Full response:', JSON.stringify(taskData, null, 2));
      throw new Error(taskData.message || taskData.error || `Failed to create task at Kie.ai (status ${createTaskResponse.status})`);
    }

    console.log('Kie.ai createTask response:', JSON.stringify(taskData, null, 2));

    // Try different possible task ID field names
    const taskId = taskData.taskId || taskData.task_id || taskData.id || taskData.data?.taskId || taskData.data?.task_id;

    if (!taskId) {
      console.error('No task ID found in response:', JSON.stringify(taskData, null, 2));
      throw new Error('No task ID returned from Kie.ai');
    }

    console.log('Kie.ai task created:', taskId);

    // Return task ID immediately - frontend will poll for completion
    return res.status(200).json({
      success: true,
      status: 'processing',
      taskId: taskId,
      message: 'Task created successfully. Poll /api/kie-check-status?taskId=' + taskId + ' for results.',
      provider: 'kie.ai',
      estimatedTime: '20-30 seconds'
    });

  } catch (error) {
    console.error('Kie.ai staging error:', error);

    // Handle specific error types
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'Invalid Kie.ai API key. Please check your configuration.'
      });
    }

    if (error.message && error.message.includes('401')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid Kie.ai API key'
      });
    }

    if (error.message && error.message.includes('402')) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits in Kie.ai account'
      });
    }

    if (error.message && error.message.includes('429')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to stage image with Kie.ai'
    });
  }
}
