import { supabase } from "@/integrations/supabase/client";

export type AccessEvent = "login" | "export";

/**
 * Registra uso por login na tabela access_logs (fire-and-forget: nunca quebra o app).
 * - "login": 1x por sessão (sessionStorage evita duplicar a cada F5).
 * - "export": 1 linha por documento gerado (docType = ex. "procuracao_0km").
 */
export async function logAccess(event: AccessEvent, docType?: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    if (event === "login") {
      if (sessionStorage.getItem("logged_access") === session.user.id) return;
      sessionStorage.setItem("logged_access", session.user.id);
    }
    await supabase.from("access_logs").insert({
      user_id: session.user.id,
      email: session.user.email ?? "",
      event,
      doc_type: docType ?? null,
    });
  } catch (e) {
    console.warn("accessLog:", e);
  }
}
