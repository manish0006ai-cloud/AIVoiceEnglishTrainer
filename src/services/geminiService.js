let apiKey = '';
let chatHistory = [];
let systemPrompt = '';

function buildSystemPrompt(mode, topic) {
  let prompt = `You are Angelina, an expert, warm, and encouraging English communication trainer.
The user is practising spoken English. They have selected:
  - Training Mode : ${mode}  (conversation | grammar | vocabulary)
  - Topic         : ${topic}

YOUR TASK:
1. Read the user's spoken message carefully.
2. Respond naturally as a conversational partner on the topic (2-3 sentences).
   Keep the conversation going with a follow-up question or comment.
3. After your reply, append feedback in the EXACT JSON format below.
   Do NOT deviate from this format or add extra keys.

FEEDBACK FORMAT (append at end of every response):
FEEDBACK_JSON:{"good":"[What the user did well]","fix":"[One grammar or phrasing correction. If none: No corrections needed!]","tip":"[One vocabulary/fluency upgrade]","score":[Integer 1-10]}

RULES:
- Always complete all 4 feedback fields.
- Never use markdown formatting (no ** or # symbols) in your reply.
- Keep your conversational reply under 60 words.
- Be culturally sensitive and encouraging, especially for beginners.
- If the user speaks a language other than English, gently ask them to try in English.

MODE INSTRUCTIONS:
  conversation : Focus on natural fluency and engagement.
  grammar      : Focus on sentence structure, tense, subject-verb agreement.
  vocabulary   : Focus on word choice, idioms, collocations, and register.`;

  if (mode === 'pronunciation') {
    prompt += `\n\nPRONUNCIATION MODE:
- After FEEDBACK_JSON, append a PRONUNCIATION_JSON block.
- Identify 1-2 words the user likely mispronounced.

PRONUNCIATION_JSON:{"words":[{"word":"example","ipa":"/ɪɡˈzæmpəl/","tip":"Stress on second syllable."}]}`;
  }

  return prompt;
}

export function initGemini(key) {
  apiKey = key;
}

export function startChat(mode, topicLabel, topicStarter) {
  if (!apiKey) throw new Error('Gemini not initialized. Please set your API key in Settings.');
  systemPrompt = buildSystemPrompt(mode, topicLabel);
  chatHistory = [];
}

export async function sendMessage(text) {
  chatHistory.push({ role: 'user', parts: [{ text }] });

  // Try multiple models in order
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      const result = await callGeminiAPI(model);
      // Gemini 2.5 may return multiple parts (thinking + text) — extract text parts only
      const parts = result.candidates[0].content.parts || [];
      const aiText = parts.filter(p => p.text && !p.thought).map(p => p.text).join('') 
                     || parts.map(p => p.text || '').join('');
      chatHistory.push({ role: 'model', parts: [{ text: aiText }] });
      return parseResponse(aiText);
    } catch (e) {
      lastError = e;
      console.warn(`Model ${model} failed:`, e.message);
      // If it's not a model-not-found or quota error, don't try other models
      if (!e.message.includes('404') && !e.message.includes('429') && !e.message.includes('not found')) {
        throw e;
      }
    }
  }

  throw lastError || new Error('All models failed. Please check your API key.');
}

async function callGeminiAPI(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build contents with system prompt embedded in first user message
  const contents = [];
  for (let i = 0; i < chatHistory.length; i++) {
    const msg = chatHistory[i];
    if (i === 0 && msg.role === 'user') {
      // Prepend system prompt to first user message
      contents.push({
        role: 'user',
        parts: [{ text: `[System Instructions: ${systemPrompt}]\n\nUser message: ${msg.parts[0].text}` }],
      });
    } else {
      contents.push(msg);
    }
  }

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.8,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(`${response.status}: ${errMsg}`);
  }

  return await response.json();
}

export async function getGreeting(topicStarter) {
  return { reply: topicStarter, feedback: null, pronunciation: null };
}

function parseResponse(raw) {
  let reply = raw;
  let feedback = null;
  let pronunciation = null;

  // Extract FEEDBACK_JSON
  const feedbackMatch = raw.match(/FEEDBACK_JSON:\s*(\{[\s\S]*?\})\s*(?:PRONUNCIATION_JSON:|$)/);
  if (feedbackMatch) {
    try {
      feedback = JSON.parse(feedbackMatch[1]);
      reply = raw.substring(0, raw.indexOf('FEEDBACK_JSON:')).trim();
    } catch (e) {
      try {
        const jsonStr = feedbackMatch[1].replace(/'/g, '"');
        feedback = JSON.parse(jsonStr);
        reply = raw.substring(0, raw.indexOf('FEEDBACK_JSON:')).trim();
      } catch {}
    }
  }

  // Extract PRONUNCIATION_JSON
  const pronMatch = raw.match(/PRONUNCIATION_JSON:\s*(\{[\s\S]*?\})\s*$/);
  if (pronMatch) {
    try {
      pronunciation = JSON.parse(pronMatch[1]);
    } catch {}
  }

  return { reply, feedback, pronunciation };
}

export function isInitialized() { return !!apiKey; }
