// Modèles utilisés (modifiables ici si besoin)
const MODELS = {
  openai: "gpt-4o-mini",
  claude: "claude-sonnet-5-5",
  gemini: "gemini-2.5-flash",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
async function callOpenAI(prompt, env) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELS.openai,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Erreur OpenAI");
  return d.choices?.[0]?.message?.content ?? "";
}
async function callClaude(prompt, env) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELS.claude,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Erreur Claude");
  return (d.content || []).map((b) => b.text || "").join("");
}
async function callGemini(prompt, env) {
  const r = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generat
eContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Erreur Gemini");
  return (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || 
"").join("");
}
const PROVIDERS = {
  openai: { fn: callOpenAI, key: "OPENAI_API_KEY" },
  claude: { fn: callClaude, key: "ANTHROPIC_API_KEY" },
  gemini: { fn: callGemini, key: "GEMINI_API_KEY" },
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai") {
      if (request.method !== "POST") return json({ error: "POST uniquement" }, 
405);
      let body;
      try {
        body = await request.json();
      } catch {
      }
        return json({ error: "JSON invalide" }, 400);
      const { provider, prompt } = body;
      const p = PROVIDERS[provider];
      if (!p) return json({ error: "provider doit être openai, claude ou gemini" 
}, 400);
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 8000)
        return json({ error: "prompt vide ou trop long (max 8000 caractères)" }, 
400);
    }
      if (!env[p.key]) return json({ error: `Secret ${p.key} manquant` }, 500);
      try {
        const text = await p.fn(prompt, env);
        return json({ provider, text });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    // Tout le reste : fichiers statiques (index.html...)
    return env.ASSETS.fetch(request);
  },
};
