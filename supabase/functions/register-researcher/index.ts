import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: corsHeaders });

  try {
    const { name, email, password, researcherKey } = await request.json();
    if (!name?.trim() || !email?.trim() || !password || !researcherKey) throw new Error("Complete every field to create a researcher account.");
    if (password.length < 12) throw new Error("Use a password with at least 12 characters.");
    if (researcherKey !== Deno.env.get("RESEARCHER_REGISTRATION_KEY")) return Response.json({ error: "That researcher registration key is not valid." }, { status: 403, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
      app_metadata: { role: "researcher" },
    });
    if (error) throw error;
    return Response.json({ userId: data.user.id }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create researcher account." }, { status: 400, headers: corsHeaders });
  }
});
