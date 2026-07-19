// MODULE — Dicte vocalement les défauts et parse en mises à jour d'items via IA
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);

    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user } } = await anon.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Non autorisé' }, 401);

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'multipart/form-data attendu' }, 400);
    }
    const form = await req.formData();
    const audio = form.get('file');
    const itemsJson = form.get('items');
    if (!(audio instanceof File)) return json({ error: 'file manquant' }, 400);
    const items: Array<{ id: string; room_name: string; item_name: string }> =
      itemsJson ? JSON.parse(itemsJson.toString()) : [];

    // 1) Transcription via Lovable AI STT
    const sttForm = new FormData();
    sttForm.append('model', 'openai/gpt-4o-transcribe');
    sttForm.append('file', audio, audio.name || 'recording.webm');
    sttForm.append('language', 'fr');

    const sttResp = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: sttForm,
    });
    if (!sttResp.ok) {
      const t = await sttResp.text();
      return json({ error: 'Transcription échouée', details: t }, sttResp.status);
    }
    const sttJson = await sttResp.json();
    const transcript: string = sttJson.text ?? '';

    // 2) Parse la transcription en mises à jour d'items (si liste fournie)
    let updates: Array<{ item_id: string; condition: string; notes: string }> = [];
    if (items.length > 0 && transcript.trim()) {
      const catalog = items.map((i) => `${i.id} | ${i.room_name} > ${i.item_name}`).join('\n');
      const parseResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant d'état des lieux. À partir d'une dictée en français, tu identifies quels items ont un défaut. Renvoie STRICTEMENT un JSON de la forme { "updates": [{ "item_id": "uuid", "condition": "good|acceptable|damaged|broken|missing", "notes": "description courte" }] }. Utilise les IDs exacts du catalogue. Ne renvoie que les items mentionnés. Si l'utilisateur dit "nickel", "OK", "rien à signaler" → condition "good". "Rayé", "taché", "abîmé" → "damaged". "Cassé", "HS" → "broken". "Manquant" → "missing".`,
            },
            {
              role: 'user',
              content: `Catalogue d'items (id | pièce > nom):\n${catalog}\n\nDictée:\n"""${transcript}"""`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (parseResp.ok) {
        const parsed = await parseResp.json();
        try {
          const content = JSON.parse(parsed.choices?.[0]?.message?.content ?? '{}');
          updates = Array.isArray(content.updates) ? content.updates : [];
        } catch { /* ignore */ }
      }
    }

    return json({ transcript, updates });
  } catch (e: any) {
    return json({ error: e.message ?? 'Erreur' }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
