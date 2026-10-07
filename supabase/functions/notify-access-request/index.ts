// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, phone, name } = await req.json();

    const adminEmail = "jnascime06@gmail.com";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      // Fallback: just log — admin must check Supabase dashboard
      console.log(`Nova solicitação de acesso de: ${email} | Telefone: ${phone}`);
      return new Response(JSON.stringify({ ok: true, method: "log" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      from: "Sistema BYD IESA <onboarding@resend.dev>",
      to: [adminEmail],
      subject: "🔐 Nova Solicitação de Acesso – Sistema BYD IESA",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e40af;">Nova Solicitação de Acesso</h2>
          <p>Um novo usuário solicitou acesso ao <strong>Sistema de Documentação Venda Direta BYD IESA</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; font-weight:bold; color:#64748b;">E-mail:</td><td style="padding: 8px;">${email}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding: 8px; font-weight:bold; color:#64748b;">Telefone:</td><td style="padding: 8px;">${phone}</td></tr>
          </table>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
            Acesse o Painel Admin do sistema (<strong>/admin</strong>) com seu login para aprovar ou recusar esta solicitação.
          </p>
        </div>
      `,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
