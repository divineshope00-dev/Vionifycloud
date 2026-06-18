import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export const app = express();

app.use(cors());

// Webhook endpoint for Paddle
app.post('/api/webhook/paddle', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['paddle-signature'];
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return res.status(400).send('Missing signature or secret');
  }

  try {
    const payload = JSON.parse(req.body.toString());
    console.log('Received Paddle Webhook:', payload.event_type);

    switch (payload.event_type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.activated':
        console.log(`Subscription ${payload.data.id} is now ${payload.data.status}`);
        break;
      case 'subscription.canceled':
      case 'subscription.past_due':
        console.log(`Subscription ${payload.data.id} is now ${payload.data.status}`);
        break;
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(400).send('Webhook Error');
  }
});

// API routes
app.use(express.json());
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/corner', async (req, res) => {
  try {
    const { message, language, userId, userName, userEmail } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing from environment variables');
      return res.status(503).json({ 
        error: 'Configuration Error', 
        text: language === 'fr' 
          ? "Le service assistant n'est pas encore configuré. Veuillez ajouter votre clé GEMINI_API_KEY dans les paramètres d'AI Studio." 
          : "The assistant service is not configured yet. Please add your GEMINI_API_KEY in the AI Studio settings." 
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let videosContext = "No active videos currently available.";
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: videos } = await supabase.from('videos').select('title, description').limit(5);
        if (videos && videos.length > 0) {
          videosContext = "Here are some of our latest live streams:\n" + 
            videos.map(v => `- ${v.title}: ${v.description}`).join('\n');
        }
      }
    } catch (e) {
      console.error('Supabase context error:', e);
    }

    const systemPrompt = language === 'fr' 
      ? `Tu es Corner, l'assistant IA de Vionify. Tu es expert, amical et serviable.
         ${videosContext}
         Réponds de façon concise et professionnelle.`
      : `You are Corner, the AI assistant for Vionify. You are expert, friendly, and helpful.
         ${videosContext}
         Respond concisely and professionally.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: "Bonjour" }] },
        { role: "model", parts: [{ text: "Bonjour ! Je suis Corner. Comment puis-je vous aider ?" }] },
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: language === 'fr' 
          ? `Tu es Corner, l'assistant IA de Vionify. Tu es expert, amical et serviable.
             ${videosContext}
             Réponds de façon concise et professionnelle.`
          : `You are Corner, the AI assistant for Vionify. You are expert, friendly, and helpful.
             ${videosContext}
             Respond concisely and professionally.`
      }
    });

    const text = response.text || "Désolé, je n'ai pas pu générer de réponse.";

    // Log message to DB if userId exists
    if (userId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          await supabase.from('corner_messages').insert([{
            user_id: userId,
            message: message,
            response: text,
            user_name: userName,
            user_email: userEmail
          }]);
        }
      } catch (e) {
        console.error('Error logging to supabase:', e);
      }
    }

    res.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Video generation routes (mocking for now as per previous server.ts logic)
app.post('/api/video-ia', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    if (!image || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    const apiKey = process.env.RUNWAYML_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'RUNWAYML_API_KEY is not configured' });
    }

    const RunwayML = (await import('@runwayml/sdk')).default;
    const client = new RunwayML({ apiKey });

    const imageToVideo = await client.imageToVideo.create({
      model: 'gen3a_turbo',
      promptImage: image,
      promptText: prompt,
    });

    res.json({ id: imageToVideo.id });
  } catch (error: any) {
    console.error('Runway Error:', error);
    res.status(500).json({ error: error.message || 'Error generating video' });
  }
});

app.get('/api/video-ia-status/:id', async (req, res) => {
  try {
    const apiKey = process.env.RUNWAYML_API_KEY;
    if (!apiKey) throw new Error('RUNWAYML_API_KEY not configured');
    const RunwayML = (await import('@runwayml/sdk')).default;
    const client = new RunwayML({ apiKey });

    const task = await client.tasks.retrieve(req.params.id);
    
    let status = 'RUNNING';
    let videoUrl = null;

    if (task.status === 'SUCCEEDED') {
      status = 'SUCCEEDED';
      videoUrl = task.output?.[0];
    } else if (task.status === 'FAILED') {
      status = 'FAILED';
    }

    res.json({ status, videoUrl, progress: (task as any).progress || 0 });
  } catch (error: any) {
    console.error('Runway Status Error:', error);
    res.status(500).json({ error: error.message || 'Error fetching status' });
  }
});
