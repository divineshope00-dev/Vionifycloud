import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Webhook endpoint for Paddle
  // IMPORTANT: We must use express.raw() to verify the webhook signature
  app.post('/api/webhook/paddle', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['paddle-signature'];
    const secret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(400).send('Missing signature or secret');
    }

    try {
      // In a real app, you would verify the signature using the Paddle SDK
      // const eventData = paddle.webhooks.unmarshal(req.body, secret, signature);
      
      const payload = JSON.parse(req.body.toString());
      console.log('Received Paddle Webhook:', payload.event_type);

      // Handle subscription events
      switch (payload.event_type) {
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.activated':
          // Update user subscription status in DB
          console.log(`Subscription ${payload.data.id} is now ${payload.data.status}`);
          break;
        case 'subscription.canceled':
        case 'subscription.past_due':
          // Revoke premium access in DB
          console.log(`Subscription ${payload.data.id} is now ${payload.data.status}`);
          break;
      }

      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Webhook Error:', error);
      res.status(400).send('Webhook Error');
    }
  });

  // API routes FIRST
  app.use(express.json());
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/moderate-video', async (req, res) => {
    const { videoId, title, description } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    res.json({ status: 'queued' });

    // Wait exactly 30 seconds before deleting if offensive
    setTimeout(async () => {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following video title and description. Does it contain or strongly suggest pornographic, sexually explicit, or highly offensive/abusive material? Answer strictly with exactly one word: 'YES' or 'NO'.\n\nTitle: ${title || 'No title'}\nDescription: ${description || 'No description'}`
        });

        const isOffensive = response.text?.trim().toUpperCase().includes('YES');
        
        if (isOffensive && token) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vlrddnnhwtybwhciqkvv.supabase.co';
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmRkbm5od3R5YndoY2lxa3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mzc3NjAsImV4cCI6MjA5MDAxMzc2MH0.qcyEe5GhPcQfAuSGppYSXEfeTy4LrL77Lc1nqNsfAaY';
          
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
          });
          
          await supabase.from('videos').delete().eq('id', videoId);
          console.log(`Video ${videoId} was automatically deleted due to offensive content.`);
        }
      } catch (err) {
        console.error('Video moderation failed:', err);
      }
    }, 30000);
  });

  app.post('/api/generate-video-ia', async (req, res) => {
    try {
      const { image, prompt } = req.body;
      if (!image || !prompt) {
        return res.status(400).json({ error: 'Image and prompt are required' });
      }

      // Check for RUNWAYML_API_KEY (we default to empty check and mock if missing locally, but user gave us key: key_7f518...)
      const apiKey = process.env.RUNWAYML_API_KEY || 'key_7f518c5956ef0ca759efb39764735dfc2334200fa68166f26d19dac0dce944a580964aa9125bc9d59721e415ed934f48066ddaebfa5a445bc5ec19d0cd07b289';

      const RunwayML = (await import('@runwayml/sdk')).default;
      const client = new RunwayML({ apiKey });

      // We add a constraint logic requested down in the frontend, but backend starts it here
      const task = await client.imageToVideo.create({
        model: 'gen3a_turbo', // The best currently supported via API
        promptImage: image, // Ex: data:image/jpeg;base64,...
        promptText: prompt + " (Aspect Ratio: 16:9)", // Runway accepts 16:9 inherently, but we can hint if we want. Wait gen3 is 16:9 default usually. Wait, Gen3 requires exact ratios. Let's just use the prompt.
      });

      res.json({ id: task.id });
    } catch (error: any) {
      console.error('Runway Generation Error:', error);
      res.status(500).json({ error: error.message || 'Error generating video' });
    }
  });

  app.get('/api/video-ia-status/:id', async (req, res) => {
    try {
      const apiKey = process.env.RUNWAYML_API_KEY || 'key_7f518c5956ef0ca759efb39764735dfc2334200fa68166f26d19dac0dce944a580964aa9125bc9d59721e415ed934f48066ddaebfa5a445bc5ec19d0cd07b289';
      const RunwayML = (await import('@runwayml/sdk')).default;
      const client = new RunwayML({ apiKey });

      const task = await client.tasks.retrieve(req.params.id);
      
      let status = 'RUNNING';
      let videoUrl = null;

      if (task.status === 'SUCCEEDED') {
        status = 'SUCCEEDED';
        videoUrl = task.output?.[0]; // Runway usually places list of URLs in output
      } else if (task.status === 'FAILED') {
        status = 'FAILED';
      }

      res.json({ status, videoUrl, progress: task.progress });
    } catch (error: any) {
      console.error('Runway Status Error:', error);
      res.status(500).json({ error: error.message || 'Error fetching status' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
