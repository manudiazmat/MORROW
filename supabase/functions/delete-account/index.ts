// Deletes the calling user's account. Rows cascade from auth.users (see migration).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await user.auth.getUser();
  if (!data?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'content-type': 'application/json' } });
});
