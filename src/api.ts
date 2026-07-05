import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './lib/supabase';

export const app = express();

app.use(cors());

// Define a unified router for all API endpoints
const apiRouter = express.Router();

// Webhook endpoint for Lemon Squeezy (registered BEFORE JSON body parser)
apiRouter.post('/webhook/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  // Resilient raw body extraction (compatible with Netlify serverless & standard express environments)
  let rawBody: Buffer;
  if ((req as any).rawBody) {
    rawBody = (req as any).rawBody;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  } else if (typeof req.body === 'string') {
    rawBody = Buffer.from(req.body);
  } else {
    rawBody = Buffer.from(JSON.stringify(req.body || {}));
  }

  if (!secret) {
    console.warn('LEMON_SQUEEZY_WEBHOOK_SECRET is not configured in environment variables');
    // If not configured, we allow processing for development/testing but log a warning
  } else {
    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    if (signature !== digest) {
      console.error('Lemon Squeezy Webhook signature verification failed');
      return res.status(401).send('Invalid signature');
    }
  }

  try {
    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;

    console.log('Received Lemon Squeezy Webhook:', eventName, customData);

    if (!customData || !customData.user_id) {
      console.warn('Lemon Squeezy Webhook received without user_id in custom data, skipping user activation');
      return res.status(200).send('Webhook received (ignored - no user_id)');
    }

    const userId = customData.user_id;
    const planId = customData.plan_id || 'starter';
    const isAnnual = customData.is_annual === 'true';

    // Handle subscription events
    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_updated' ||
      eventName === 'subscription_resumed'
    ) {
      const dataAttr = payload.data?.attributes;
      const endsAt = dataAttr?.ends_at || dataAttr?.renews_at;
      const lsSubscriptionId = payload.data?.id;

      // Determine a reasonable end date if not specified
      const endDate = endsAt 
        ? new Date(endsAt).toISOString()
        : new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 3600 * 1000).toISOString();

      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_plan: planId,
          subscription_end_date: endDate,
          is_annual: isAnnual,
          paddle_subscription_id: lsSubscriptionId ? `ls_${lsSubscriptionId}` : undefined,
          payment_method: JSON.stringify({ brand: 'card', last4: 'LS', expiryDate: 'LS' })
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user subscription status in Supabase:', error);
        return res.status(500).send('Database update error');
      }

      console.log(`Successfully activated Lemon Squeezy subscription for user ${userId}`);
    } else if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired'
    ) {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'canceled'
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to cancel user subscription status in Supabase:', error);
        return res.status(500).send('Database update error');
      }

      console.log(`Successfully cancelled Lemon Squeezy subscription for user ${userId}`);
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Lemon Squeezy Webhook parsing/handling error:', error);
    res.status(500).send('Webhook Error');
  }
});

// Webhook endpoint for Paddle
apiRouter.post('/webhook/paddle', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['paddle-signature'];
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return res.status(400).send('Missing signature or secret');
  }

  try {
    const rawBody = (req as any).rawBody || req.body;
    const payload = JSON.parse(rawBody.toString());
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

// Parse JSON body for all standard API endpoints (registered AFTER raw body webhooks)
apiRouter.use(express.json());

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Video generation routes (mocking for now as per previous server.ts logic)
apiRouter.post('/moderate-video', async (req, res) => {
  console.log('Moderating video:', req.body.videoId);
  res.json({ status: 'pending' });
});

apiRouter.post('/video-ia', async (req, res) => {
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

apiRouter.get('/video-ia-status/:id', async (req, res) => {
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

// Mount the unified apiRouter under both /api and / to prevent path mismatches
app.use('/api', apiRouter);
app.use('/', apiRouter);
