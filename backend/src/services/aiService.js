const https = require('https');
const http = require('http');

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

const TOUR_OPERATOR_SYSTEM_PROMPT = `You are a professional AI assistant for a Tour Operator Management System. You help tour operators manage their business efficiently.

You can assist with:
- Lead and customer analysis, follow-up suggestions
- Tour itinerary creation and modification
- Quotation generation and pricing advice
- Professional customer communication (WhatsApp, email, follow-up, booking confirmation, payment reminder, thank-you messages)
- Business analytics and reporting
- Destination and activity suggestions
- Day-wise schedule planning

Keep responses professional, concise, and actionable. Use the business data provided in context to give specific, data-driven answers. Format messages clearly with appropriate structure.

Do not make up data that is not in the context. If you don't have enough information, ask for clarification.`;

function makeRequest(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out after 60 seconds'));
    }, 60000);

    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
        ...headers,
      },
      signal: controller.signal,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        if (res.statusCode >= 400) {
          let errorMsg = `AI API error: ${res.statusCode}`;
          try {
            const parsed = JSON.parse(data);
            errorMsg = parsed.error?.message || parsed.message || errorMsg;
          } catch (_) {}
          reject(new Error(errorMsg));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse AI response'));
        }
      });
    });

    req.on('error', (e) => {
      clearTimeout(timeout);
      reject(new Error(`AI API request failed: ${e.message}`));
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function queryAI(messages) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY is not configured. Please set the environment variable.');
  }

  const url = `${AI_BASE_URL}/chat/completions`;

  const body = {
    model: AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  const result = await makeRequest(url, {}, body);

  if (!result.choices || !result.choices.length || !result.choices[0].message) {
    throw new Error('Invalid response from AI API');
  }

  return result.choices[0].message.content;
}

function buildContextFromBusinessData(businessData) {
  const parts = [];

  if (businessData.leads) {
    parts.push('=== LEADS ===');
    parts.push(JSON.stringify(businessData.leads, null, 2));
  }

  if (businessData.customers) {
    parts.push('=== CUSTOMERS ===');
    parts.push(JSON.stringify(businessData.customers, null, 2));
  }

  if (businessData.tours) {
    parts.push('=== TOUR PACKAGES ===');
    parts.push(JSON.stringify(businessData.tours, null, 2));
  }

  if (businessData.bookings) {
    parts.push('=== BOOKINGS ===');
    parts.push(JSON.stringify(businessData.bookings, null, 2));
  }

  if (businessData.payments) {
    parts.push('=== PAYMENTS ===');
    parts.push(JSON.stringify(businessData.payments, null, 2));
  }

  if (businessData.quotations) {
    parts.push('=== QUOTATIONS ===');
    parts.push(JSON.stringify(businessData.quotations, null, 2));
  }

  if (businessData.summary) {
    parts.push('=== BUSINESS SUMMARY ===');
    parts.push(JSON.stringify(businessData.summary, null, 2));
  }

  return parts.join('\n\n');
}

async function assist(prompt, businessData = null, conversationHistory = []) {
  const messages = [
    { role: 'system', content: TOUR_OPERATOR_SYSTEM_PROMPT },
  ];

  if (businessData) {
    const context = buildContextFromBusinessData(businessData);
    messages.push({
      role: 'system',
      content: `Here is the current business data from the Tour Operator Management System:\n\n${context}\n\nUse this data to answer questions accurately. Reference specific leads, customers, bookings, or tours when relevant.`,
    });
  }

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push(msg);
    }
  }

  messages.push({ role: 'user', content: prompt });

  const response = await queryAI(messages);
  return response;
}

async function checkHealth() {
  if (!AI_API_KEY) {
    return { available: false, reason: 'AI_API_KEY not configured' };
  }
  return { available: true, model: AI_MODEL };
}

module.exports = { assist, checkHealth, queryAI };
