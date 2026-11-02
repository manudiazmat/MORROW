// MORROW assistant — Supabase Edge Function (Deno).
// Provider-independent: AI_PROVIDER=anthropic | openai, AI_MODEL, AI_API_KEY live only here (server secrets).
// The model never writes data: its tool calls come back to the app as *proposals* the person must approve.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Role = 'user' | 'assistant';
interface Msg {
  role: Role;
  text: string;
}
interface Body {
  messages: Msg[];
  context: Record<string, unknown>;
  module?: string | null;
  locale?: 'es' | 'en';
}
interface Action {
  kind: string;
  [k: string]: unknown;
}
interface Reply {
  text: string;
  actions: Action[];
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN = ['work', 'sport', 'learning', 'personal', 'social', 'leisure'];
const DIMS = ['career', 'finance', 'health', 'relationships', 'growth', 'leisure', 'home', 'purpose'];
const TXC = [
  'home',
  'food',
  'transport',
  'leisure',
  'health',
  'shopping',
  'education',
  'subscriptions',
  'other',
  'salary',
  'freelance',
  'gift',
  'investment',
  'other_income',
];
const dt = { type: 'string', description: 'Local datetime YYYY-MM-DDTHH:mm' };
const d = { type: 'string', description: 'Date YYYY-MM-DD' };

/** One tool schema, translated per provider. Every tool is a proposal, never an execution. */
const TOOLS = [
  {
    name: 'create_task',
    description: 'Propose a new task.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due: d,
        category: { type: 'string', enum: PLAN },
        priority: { type: 'integer', enum: [1, 2, 3] },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_event',
    description: 'Propose a calendar event. Use free slots from context; never overlap existing events unless asked.',
    schema: {
      type: 'object',
      properties: { title: { type: 'string' }, start: dt, end: dt, category: { type: 'string', enum: PLAN }, location: { type: 'string' } },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'move_event',
    description:
      'Propose moving an existing event (use its id from context). For a recurring event, give occurrenceDate of the occurrence being moved.',
    schema: {
      type: 'object',
      properties: { eventId: { type: 'string' }, start: dt, end: dt, occurrenceDate: d },
      required: ['eventId', 'start', 'end'],
    },
  },
  {
    name: 'add_transaction',
    description: 'Propose logging an income or expense. amount in currency units (e.g. 12.5).',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        type: { type: 'string', enum: ['income', 'expense'] },
        category: { type: 'string', enum: TXC },
        date: d,
        description: { type: 'string' },
      },
      required: ['amount', 'type', 'category', 'date', 'description'],
    },
  },
  {
    name: 'create_goal',
    description: 'Propose a personal goal broken into milestones.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        dimension: { type: 'string', enum: DIMS },
        horizon: { type: 'string', enum: ['short', 'medium', 'long'] },
        targetDate: d,
        milestones: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'dimension', 'horizon'],
    },
  },
  {
    name: 'create_habit',
    description: 'Propose a recurring habit/routine. days: 0=Sunday..6=Saturday.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slot: { type: 'string', enum: ['morning', 'evening', 'anytime'] },
        dimension: { type: 'string', enum: DIMS },
        days: { type: 'array', items: { type: 'integer' } },
      },
      required: ['title', 'slot', 'dimension'],
    },
  },
];

function systemPrompt(locale: 'es' | 'en', module: string | null | undefined, context: unknown) {
  const lang = locale === 'en' ? 'English' : 'Spanish from Spain (castellano)';
  return [
    `You are the personal manager inside MORROW, a life-management app. Answer in ${lang}.`,
    'You are not a general chatbot: you help this person organise time, money, goals and wellbeing using ONLY the JSON context below.',
    'Rules:',
    '- Every number, date and fact you state must come from the context. If something is missing, say so plainly and suggest what to log.',
    '- Never claim you created, moved or changed anything. To suggest a change, call a tool: the app shows it as a proposal the person approves or discards.',
    '- When planning, respect existing events, activeHours and freeSlots; do not overlap events.',
    '- Do not infer that someone is happy, healthy or fulfilled from activity volume. Life Balance "self" is the person\'s own rating; treat it with respect.',
    '- Be brief and calm: 2–5 short sentences, or a short list. No emoji, no hype.',
    module ? `The person opened you from the "${module}" section.` : '',
    `Context (JSON):\n${JSON.stringify(context)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function callAnthropic(key: string, model: string, system: string, messages: Msg[]): Promise<Reply> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })),
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .trim();
  const actions = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'tool_use')
    .map((b: { name: string; input: Record<string, unknown> }) => ({ kind: b.name, ...b.input }));
  return { text, actions };
}

async function callOpenAI(key: string, model: string, system: string, messages: Msg[]): Promise<Reply> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
      tools: TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.schema } })),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const msg = data.choices?.[0]?.message ?? {};
  const actions = (msg.tool_calls ?? [])
    .map((c: { function: { name: string; arguments: string } }) => {
      try {
        return { kind: c.function.name, ...JSON.parse(c.function.arguments) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return { text: (msg.content ?? '').trim(), actions };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });
  try {
    // Only signed-in users; the JWT is verified by Supabase.
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);

    const provider = Deno.env.get('AI_PROVIDER') ?? 'anthropic';
    const key = Deno.env.get('AI_API_KEY');
    const model = Deno.env.get('AI_MODEL') ?? (provider === 'openai' ? 'gpt-4.1-mini' : 'claude-sonnet-5-5');
    if (!key) return json({ error: 'AI provider not configured' }, 503);

    const body = (await req.json()) as Body;
    const messages = (body.messages ?? []).filter((m) => m.text?.trim()).slice(-16);
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'empty' }, 400);
    const system = systemPrompt(body.locale ?? 'es', body.module, body.context ?? {});
    const reply =
      provider === 'openai' ? await callOpenAI(key, model, system, messages) : await callAnthropic(key, model, system, messages);
    const valid = new Set(TOOLS.map((t) => t.name));
    return json({
      text: reply.text || (body.locale === 'en' ? 'Here is my proposal:' : 'Esta es mi propuesta:'),
      actions: reply.actions.filter((a) => valid.has(a.kind)),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
