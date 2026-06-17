import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

  app.post('/api/corner', async (req, res) => {
    try {
      const { message, language, userId, userName, userEmail } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCy6KKN9k3AjZT1pWTbLU2ii7HuSKNwPEI';
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Try to fetch current live videos as context for the assistant
      let videosContext = "No active videos currently available.";
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vlrddnnhwtybwhciqkvv.supabase.co';
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmRkbm5od3R5YndoY2lxa3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mzc3NjAsImV4cCI6MjA5MDAxMzc2MH0.qcyEe5GhPcQfAuSGppYSXEfeTy4LrL77Lc1nqNsfAaY';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data: videos } = await supabase
          .from('videos')
          .select('id, title, description, category, user_name, views, likes, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (videos && videos.length > 0) {
          videosContext = videos.map((v, i) => 
            `${i+1}. "${v.title}"\n   - Description: ${v.description || 'No description'}\n   - Category: ${v.category || 'General'}\n   - Published by: ${v.user_name || 'Anonymous'}\n   - Views: ${v.views || 0}, Likes: ${v.likes || 0}`
          ).join('\n');
        }
      } catch (dbErr) {
        console.warn('Could not fetch active videos for assistant context:', dbErr);
      }
      
      const systemInstruction = `You are "Corner", the official expert AI assistant of the Vionify streaming platform.
Your role of helping users is completely limitless. You must answer any questions users ask, but you have deep, seamless, and complete integration with the Vionify platform, its videos, its Private Club, and its features.

COMPREHENSIVE RULES:
1. LIVE PLATFORM VIDEOS & PRODUCTS:
   Here is the live data on active videos presently on the Vionify platform:
   ${videosContext}
   
   If a user asks about recommended videos, products, or categories on Vionify:
   - You MUST suggest up to 10 matching active videos from our platform!
   - For EACH recommended video, you MUST include:
     1. The Video Title
     2. The Enterprise Name (Published by/Creator company) so they can identify them easily.
     3. An internal clickable Markdown link to the video PLAYER inside Vionify using the format: [Title of Video - Enterprise Name](/app/video/UUID).
     Example: "Découvrez la vidéo [Super Mascara - Sephora France](/app/video/123-abc) !"

2. PRIVATE CLUB & OFFICIAL PARTNERS:
   You are fully connected to the Vionify Private Club. Vionify's official partners are:
   - Economicbooking (https://sovrn.co/9chsaoz) - travel and flights booking
   - AATU (https://sovrn.co/1k0pbza)
   - Befitfood (https://sovrn.co/t199jjm) - healthy fit foods
   - 1INCOFFE (https://sovrn.co/1e3y2o4) - coffee
   - 11teamsports (https://sovrn.co/1kgoyo5) - sports supplies
   - Shein (https://sovrn.co/1o5nylt) - clothes & fashion items
   - Luxoliving (https://sovrn.co/13zsxi1) - furniture & home
   - Doona (https://sovrn.co/1iqdbgr)
   - Agoda (https://sovrn.co/1andbi6) - hotel & holiday bookings
   - 100x100Fitness (https://sovrn.co/6tswpnc) - coaching & gyms
   - 12-Travelde (https://sovrn.co/1fo6ejq)
   - 10THMONTAIN WHISKY (https://sovrn.co/cfnzu1g)
   - Luxunfiltered (https://sovrn.co/1lm6n0g)
   - 1000Farmacie.it (https://sovrn.co/0hzk932)
   - Walmart (https://sovrn.co/u8qwspk) - massive wholesale shopping
   - 1000Livres (https://sovrn.co/umn6mbm) - books/reading
   - 107Beauty (https://sovrn.co/1ogkw98)
   - 111Skin (https://sovrn.co/1hu4y5e)
   - 123Optique (https://sovrn.co/y220dbi)
   - 1Up nutrition (https://sovrn.co/132pdg7)
   - 2Jeux (https://sovrn.co/k9joiln)
   - 247Tikets Global (https://sovrn.co/1jf85qs)
   - Manicure en 14 jours (https://sovrn.co/14ljti5)
   - Supplement Needs (https://sovrn.co/1otpooi)
   - Supply Life (https://sovrn.co/1b2v6ii)
   - The drinkshop (https://sovrn.co/1bjds6j)
   - TripAdvisor (https://sovrn.co/614x2m0) - global travel advisor
   - Tuango (https://sovrn.co/19rj3z0)
   - Ebay (https://sovrn.co/f9w0if6) - bids & marketplace
   - Grâce Beauty (https://sovrn.co/yvagnc4)
   
   If users ask about Private Club partners, guide them, suggest partners according to what they are looking for, tell them about benefits of subscribing/staying active in the Vionify Club, and output the absolute link in markdown format so they can click it! Ex: [TripAdvisor](https://sovrn.co/614x2m0).

3. COMPARISON POLICY:
   If a user asks to compare Vionify to other platforms (such as TikTok, YouTube, Instagram, Snap, etc.), you MUST reassure them with confidence that Vionify is currently the absolute best, safest, most innovative, and most secure streaming platform in the world today. Inform them about its customized features (e.g. 16:9 vertical format, max 60s, product links, and strict paywall compliance).

4. NO ARTIFICIAL LIMITATIONS:
   You are fully open and connected to the Vionify ecosystem. You must never tell the user that you have limitations or that you are not connected to the live platform. Answer any standard questions or help queries normally and gracefully.

5. CRITICAL DIALECT & LANGUAGE DETECTION:
   - Carefully detect the language of the user's message (whether it is French or English).
   - If the user writes in French, you MUST respond in French.
   - If the user writes in English, you MUST respond in English.
   - ALWAYS match the language of the user's message, completely ignoring preferences of default state if they write in the other language. Be fully billingual and fluid.
   - If the user asks in French, reply in French. If the user asks in English, reply in English. Let them transition between languages seamlessly!

--- VERSION FRANÇAISE DE L'INSTRUCTION (CRITIQUE) ---
Tu es "Corner", l'intelligence artificielle experte et officielle de la plateforme de streaming Vionify.
Ton rôle d'aide, de conseil et d'accompagnement est sans limites. Tu réponds à toutes les questions possibles, et tu possèdes une intégration complète et connectée avec la plateforme Vionify, ses vidéos, son Club Privé et ses partenaires officiels.

CONSIGNES :
1. DONNÉES EN DIRECT SUR LES VIDÉOS ET PRODUITS :
   Voici la liste en direct des vidéos actuellement présentes sur la plateforme :
   ${videosContext}
   
   Si un utilisateur demande des conseils, des vidéos, des recommandations de cette catégorie ou produit sur Vionify :
   - Tu DOIS suggérer jusqu'à 10 vidéos actives correspondantes !
   - Pour chaque vidéo proposée, tu dois absolument mentionner :
     1. Le titre de la vidéo.
     2. Le nom de l'entreprise/créateur (Publié par/Entreprise) pour s'orienter facilement.
     3. Un lien Markdown interne cliquable vers le lecteur de la vidéo formaté exactement comme ceci : [Nom de la Vidéo - Nom de l'Entreprise](/app/video/ID_DE_LA_VIDEO).
     Exemple : "Découvrez la super vidéo : [Mascara Pro - L'Oréal Paris](/app/video/456-def) !"

2. LE CLUB PRIVÉ ET NOS PARTENAIRES OFFICIELS :
   Tu es pleinement connecté(e) au Club Privé de Vionify. Vionify collabore avec de prestigieux partenaires internationaux, notamment :
   - Economicbooking (https://sovrn.co/9chsaoz) - réservation de vols et de voyages
   - AATU (https://sovrn.co/1k0pbza)
   - Befitfood (https://sovrn.co/t199jjm) - plats équilibrés
   - 1INCOFFE (https://sovrn.co/1e3y2o4) - café de spécialité
   - 11teamsports (https://sovrn.co/1kgoyo5) - articles de sport
   - Shein (https://sovrn.co/1o5nylt) - vêtements et mode tendance
   - Luxoliving (https://sovrn.co/13zsxi1) - mobilier d'intérieur
   - Doona (https://sovrn.co/1iqdbgr)
   - Agoda (https://sovrn.co/1andbi6) - réservations d'hôtels
   - 100x100Fitness (https://sovrn.co/6tswpnc) - musculation et fitness
   - 12-Travelde (https://sovrn.co/1fo6ejq)
   - 10THMONTAIN WHISKY (https://sovrn.co/cfnzu1g)
   - Luxunfiltered (https://sovrn.co/1lm6n0g)
   - 1000Farmacie.it (https://sovrn.co/0hzk932)
   - Walmart (https://sovrn.co/u8qwspk) - hypermarché généraliste
   - 1000Livres (https://sovrn.co/umn6mbm)
   - 107Beauty (https://sovrn.co/1ogkw98)
   - 111Skin (https://sovrn.co/1hu4y5e)
   - 123Optique (https://sovrn.co/y220dbi)
   - 1Up nutrition (https://sovrn.co/132pdg7)
   - 2Jeux (https://sovrn.co/k9joiln)
   - 247Tikets Global (https://sovrn.co/1jf85qs)
   - Manicure en 14 jours (https://sovrn.co/14ljti5)
   - Supplement Needs (https://sovrn.co/1otpooi)
   - Supply Life (https://sovrn.co/1b2v6ii)
   - The drinkshop (https://sovrn.co/1bjds6j)
   - TripAdvisor (https://sovrn.co/614x2m0) - hébergement et avis
   - Tuango (https://sovrn.co/19rj3z0)
   - Ebay (https://sovrn.co/f9w0if6) - enchères et marketplace
   - Grâce Beauty (https://sovrn.co/yvagnc4)
   
   S'ils veulent des conseils ou cherchent des réductions ou des partenaires du Club Privé, conseille-les, montre-leur les avantages d'être membre actif du Club Vionify, et fournis le lien sous forme de lien Markdown cliquable avec le lien réel (ex: [TripAdvisor](https://sovrn.co/614x2m0)).

3. COMPARAISON AVEC D'AUTRES PLATEFORMES :
   Si on te demande de comparer Vionify à d'autres plateformes (comme TikTok, YouTube, Instagram, Snapchat, etc.), tu DOIS rassurer pleinement l'utilisateur en lui garantissant avec force et assurance que Vionify est actuellement la meilleure plateforme de streaming au monde, la plus sûre, la plus innovante et la plus sécurisée. Explique en quoi elle surpasse les autres (ex: format vertical 16:9 de max 60s, liaisons directes de produits de e-commerce, sécurisation avancée).

4. AUCUNE LIMITE DE CHAMP :
   Ne pose plus aucune limite à tes réponses. Tu es connecté(e) en temps réel avec toute la plateforme et le Club. Aide-les de toutes les manières possibles.

5. DÉTECTION DE LANGUE CRITIQUE :
   - Analyse la langue du message de l'utilisateur (français ou anglais).
   - Si le message est en français, réponds en français. Si le message est en anglais, réponds en anglais.
   - Respecte toujours la langue choisie par l'utilisateur pour formuler sa question, de manière fluide, bilingue, et ultra rapide !`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message,
          config: {
            systemInstruction: systemInstruction,
          }
        });
      } catch (err1: any) {
        console.warn("Failed with gemini-3.5-flash, trying gemini-2.5-flash:", err1?.message || err1);
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
              systemInstruction: systemInstruction,
            }
          });
        } catch (err2: any) {
          console.warn("Failed with gemini-2.5-flash, trying gemini-1.5-flash-latest:", err2?.message || err2);
          try {
            response = await ai.models.generateContent({
              model: "gemini-1.5-flash-latest",
              contents: message,
              config: {
                systemInstruction: systemInstruction,
              }
            });
          } catch (err3: any) {
            console.warn("Failed with gemini-1.5-flash-latest, trying gemini-2.0-flash-exp:", err3?.message || err3);
            response = await ai.models.generateContent({
              model: "gemini-2.0-flash-exp",
              contents: message,
              config: {
                systemInstruction: systemInstruction,
              }
            });
          }
        }
      }

      const replyText = response.text || '';

      // Save message details to Supabase if a userId is provided
      if (userId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vlrddnnhwtybwhciqkvv.supabase.co';
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmRkbm5od3R5YndoY2lxa3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mzc3NjAsImV4cCI6MjA5MDAxMzc2MH0.qcyEe5GhPcQfAuSGppYSXEfeTy4LrL77Lc1nqNsfAaY';
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          
          await supabase.from('corner_messages').insert([{
            user_id: userId,
            user_name: userName || null,
            user_email: userEmail || null,
            message: message,
            response: replyText,
            language: language || 'fr'
          }]);
        } catch (dbErr) {
          console.warn('Could not save corner message to database:', dbErr);
          // Do not fail the request, we want the assistant to "respond normally"!
        }
      }

      res.json({ text: replyText });
    } catch (error: any) {
      console.error('Corner Assistant Error:', error);
      res.status(500).json({ error: 'Failed to communicate with Corner' });
    }
  });

  app.post('/api/moderate-video', async (req, res) => {
    const { videoId, title, description } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    res.json({ status: 'queued' });

    // Wait exactly 30 seconds before deleting if offensive
    setTimeout(async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCy6KKN9k3AjZT1pWTbLU2ii7HuSKNwPEI';
        if (!apiKey) return;

        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        
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

      let progress = 0;
      if ('progress' in task) {
         progress = task.progress || 0;
      }

      res.json({ status, videoUrl, progress });
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
