import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, supabaseAdmin } from './lib/supabase';

export const app = express();

app.use(cors());

// Define a unified router for all API endpoints
const apiRouter = express.Router();

// Lemon Squeezy variant to plan & period mappings for maximum reliability
const VARIANT_MAPPING: Record<string, { plan: string; isAnnual: boolean }> = {
  '1879263': { plan: 'starter', isAnnual: false },   // Starter Monthly
  '1879332': { plan: 'starter', isAnnual: true },    // Starter Annual
  '1879348': { plan: 'pro', isAnnual: false },       // Pro Monthly
  '1879358': { plan: 'pro', isAnnual: true },        // Pro Annual
  '1879372': { plan: 'unlimited', isAnnual: false }, // Unlimited Monthly
  '1879377': { plan: 'unlimited', isAnnual: true }   // Unlimited Annual
};

// Webhook endpoint for Lemon Squeezy (registered BEFORE JSON body parser)
apiRouter.post('/webhook/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!signature) {
    console.error("Échec Étape 1 : Signature manquante dans les en-têtes !");
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
    console.log("Étape 1 réussie : Signature validée avec succès !");
  }

  try {
    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta?.event_name;
    
    // Extract customData resiliently from multiple namespaces to guarantee the user_id is found
    const customData = payload.meta?.custom_data || payload.data?.attributes?.custom_data || payload.meta?.custom || {};

    console.log("Étape 2 réussie : Corps du webhook parsé avec succès !");
    console.log('Received Lemon Squeezy Webhook event:', eventName, 'with custom_data:', customData);

    if (!customData || !customData.user_id) {
      console.warn('Lemon Squeezy Webhook received without user_id in custom data, skipping user activation');
      return res.status(200).send('Webhook received (ignored - no user_id)');
    }

    const userId = customData.user_id;
    
    // Resolve variant ID from either payload attributes or custom_data
    const variantIdFromAttr = payload.data?.attributes?.variant_id?.toString();
    const variantIdFromCustom = customData?.variant_id?.toString();
    const variantId = variantIdFromAttr || variantIdFromCustom;

    let planId = customData.plan_id || 'starter';
    let isAnnual = customData.is_annual === 'true' || customData.is_annual === true;

    // Use variant mapping if available to ensure correct monthly vs annual setup
    if (variantId && VARIANT_MAPPING[variantId]) {
      const mapping = VARIANT_MAPPING[variantId];
      planId = mapping.plan;
      isAnnual = mapping.isAnnual;
      console.log(`Étape 2.1 réussie : Détection résiliente par variant_id (${variantId}) -> Plan: ${planId}, isAnnual: ${isAnnual}`);
    } else {
      console.log(`Étape 2.1 : Pas de mapping trouvé pour le variant_id (${variantId}), utilisation des données customData.`);
    }

    console.log(`Étape 3 réussie : Variables extraites - UserID: ${userId}, Plan: ${planId}, isAnnual: ${isAnnual} (Type de isAnnual: ${typeof isAnnual})`);

    // Handle subscription events
    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_updated' ||
      eventName === 'subscription_resumed'
    ) {
      const dataAttr = payload.data?.attributes;
      const endsAt = dataAttr?.ends_at || dataAttr?.renews_at;
      const lsSubscriptionId = payload.data?.id;

      console.log(`Étape 4 réussie : Event de type activation identifié (${eventName}) pour l'abonnement Lemon Squeezy ID: ${lsSubscriptionId}`);

      // Determine a reasonable end date if not specified
      const endDate = endsAt 
        ? new Date(endsAt).toISOString()
        : new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 3600 * 1000).toISOString();

      console.log(`Étape 5 réussie : Date de fin calculée: ${endDate}`);

      // Check if user exists in public.users first to trace issues
      console.log("Étape 5.1 : Vérification de l'existence de l'utilisateur dans la table 'users' de Supabase...");
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, type, onboarding_completed, subscription_status')
        .eq('id', userId)
        .maybeSingle();

      if (checkError) {
        console.error("Étape 5.2 - Erreur lors de la vérification de l'utilisateur :", checkError);
      } else if (!existingUser) {
        console.warn(`Étape 5.2 - Avertissement : L'utilisateur avec l'ID ${userId} n'existe pas encore dans la table 'users' ! Un profil sera créé via UPSERT.`);
      } else {
        console.log(`Étape 5.2 - Utilisateur trouvé : ${existingUser.email} (Status actuel: ${existingUser.subscription_status})`);
      }

      console.log("Étape 6 : Exécution de la requête de mise à jour (UPSERT) de l'abonnement dans Supabase...");
      const email = existingUser?.email || payload.data?.attributes?.user_email || 'user@example.com';
      const name = existingUser?.name || payload.data?.attributes?.user_name || 'User';
      const userType = existingUser?.type || 'entreprise';
      const onboardingVal = existingUser?.onboarding_completed !== undefined ? existingUser.onboarding_completed : true;

      const { data: updatedData, error } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: name,
          type: userType,
          onboarding_completed: onboardingVal,
          subscription_status: 'active',
          subscription_plan: planId,
          subscription_end_date: endDate,
          is_annual: isAnnual,
          paddle_subscription_id: lsSubscriptionId ? `ls_${lsSubscriptionId}` : null,
          payment_method: JSON.stringify({ brand: 'card', last4: 'LS', expiryDate: 'LS' })
        }, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('Failed to update user subscription status in Supabase Admin:', error);
        return res.status(500).json({
          error: "Database update error",
          details: error,
          payload_info: { userId, planId, isAnnual, endDate, lsSubscriptionId }
        });
      }

      console.log(`Étape 7 réussie : Activation de l'abonnement effectuée avec succès dans Supabase pour ${userId}. Données retournées :`, updatedData);
    } else if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired'
    ) {
      console.log(`Étape 4 réussie : Event d'annulation identifié (${eventName})`);

      const { data: updatedData, error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_status: 'canceled'
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Failed to cancel user subscription status in Supabase:', error);
        return res.status(500).json({
          error: "Database update error during cancellation",
          details: error,
          userId
        });
      }

      console.log(`Étape 5 réussie : Désactivation de l'abonnement effectuée avec succès dans Supabase pour l'utilisateur ${userId}. Données retournées :`, updatedData);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    console.error('Lemon Squeezy Webhook parsing/handling error:', error);
    res.status(500).json({
      error: "Webhook Exception Error",
      message: error?.message || String(error)
    });
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

// Endpoint for contact form submission
apiRouter.post('/contact', async (req, res) => {
  try {
    const { email, message } = req.body;
    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured in environment variables');
      return res.status(503).json({ error: "La clé RESEND_API_KEY n'est pas configurée dans les variables d'environnement." });
    }

    // Call Resend API to send the notification to support admin
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Support Vionify <onboarding@resend.dev>',
        to: 'vionify.cloud@gmail.com',
        subject: `[Vionify Support] Nouveau message de ${email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #18181b;">
            <h2 style="color: #7c3aed; margin-top: 0; border-bottom: 1px solid #f4f4f5; padding-bottom: 12px;">Nouveau message de support Vionify</h2>
            <p style="margin-top: 16px;"><strong>Utilisateur :</strong> <a href="mailto:${email}" style="color: #7c3aed; text-decoration: none;">${email}</a></p>
            <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
            <div style="margin-top: 20px; padding: 15px; border-radius: 8px; border: 1px solid #e4e4e7; background-color: #fafafa; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #27272a;">${message}</div>
            <div style="margin-top: 30px; font-size: 12px; color: #a1a1aa; text-align: center; border-top: 1px solid #f4f4f5; padding-top: 12px;">
              Ce message a été envoyé depuis l'application Vionify.
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Resend API returned an error:', response.status, errorData);
      return res.status(response.status).json({
        error: "Erreur lors de l'envoi du message via Resend",
        details: errorData,
      });
    }

    // Try sending a receipt confirmation to the user (optional, catching any sandbox issues gracefully)
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Support Vionify <onboarding@resend.dev>',
          to: email,
          subject: 'Confirmation de réception - Support Vionify',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #18181b;">
              <h2 style="color: #7c3aed; margin-top: 0; border-bottom: 1px solid #f4f4f5; padding-bottom: 12px;">Nous avons bien reçu votre message</h2>
              <p>Bonjour,</p>
              <p>Merci d'avoir contacté le support officiel de Vionify. Nous vous confirmons que votre demande a bien été transmise à notre équipe.</p>
              <p>Voici un récapitulatif de votre message :</p>
              <div style="margin-top: 20px; padding: 15px; border-radius: 8px; border: 1px solid #e4e4e7; background-color: #fafafa; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #27272a;">${message}</div>
              <p style="margin-top: 20px;">Notre équipe s'engage à vous répondre sous 24 heures.</p>
              <p>Merci pour votre confiance !</p>
              <p style="margin-top: 20px; font-weight: bold; color: #7c3aed;">L'équipe Vionify</p>
              <div style="margin-top: 30px; font-size: 12px; color: #a1a1aa; text-align: center; border-top: 1px solid #f4f4f5; padding-top: 12px;">
                Ceci est un e-mail automatique, merci de ne pas y répondre directement.
              </div>
            </div>
          `,
        }),
      }).catch((err) => {
        console.warn('Silently failed to send user confirmation email (possibly unverified sandbox email):', err);
      });
    } catch (confError) {
      console.warn('Silent confirmation email error:', confError);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Contact API Exception:', error);
    return res.status(500).json({ error: 'Exception interne', message: error?.message || String(error) });
  }
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
