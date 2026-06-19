import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Video generation routes (mocking for now as per previous server.ts logic)
app.post('/api/moderate-video', async (req, res) => {
  // Dummy moderation endpoint
  console.log('Moderating video:', req.body.videoId);
  res.json({ status: 'pending' });
});

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
