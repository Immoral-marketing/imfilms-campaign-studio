import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
    type: "new_campaign" | "status_update" | "verification_code" | "verify_code";
    campaignId?: string;
    campaignTitle?: string;
    distributorName?: string;
    newStatus?: string;
    recipientEmail?: string;
    code?: string; // For verification
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload: EmailPayload = await req.json();
        console.log("Processing request:", payload);

        if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // --- VERIFY CODE ACTION ---
        if (payload.type === "verify_code") {
            const { recipientEmail, code } = payload;
            if (!recipientEmail || !code) throw new Error("Email and code required");

            const { data, error } = await supabaseAdmin
                .from("verification_codes")
                .select("*")
                .eq("email", recipientEmail)
                .eq("code", code)
                .gt("expires_at", new Date().toISOString())
                .eq("verified", false) // Ensure not already used (optional, or we can just verify existence)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                return new Response(JSON.stringify({ success: false, error: "Código inválido o expirado" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Mark as verified (optional, depending on if we want one-time use)
            // For now, let's just return success. If we want stricter security we should update 'verified' = true.
            await supabaseAdmin
                .from("verification_codes")
                .update({ verified: true })
                .eq("id", data.id);

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // --- SEND VERIFICATION CODE ACTION ---
        if (payload.type === "verification_code") {
            const { recipientEmail } = payload;
            if (!recipientEmail) throw new Error("Recipient email required");

            // 1. Generate Code
            const code = Math.floor(1000 + Math.random() * 9000).toString();

            // 2. Save to DB
            const { error: dbError } = await supabaseAdmin
                .from("verification_codes")
                .insert({
                    email: recipientEmail,
                    code: code,
                    // expires_at defaults to +15 mins in SQL
                });

            if (dbError) throw dbError;

            // 3. Send Email
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #141414; border-radius: 12px; border: 1px solid #b5a642; overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #b5a642 0%, #8a7d32 100%); padding: 24px 30px; text-align: center;">
                                            <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                            <p style="margin: 8px 0 0 0; color: #0a0a0a; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                        </td>
                                    </tr>
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h2 style="margin: 0 0 16px 0; color: #f5f5dc; font-size: 22px; text-align: center;">Verifica tu correo</h2>
                                            <p style="margin: 0 0 30px 0; color: #a0a0a0; font-size: 15px; line-height: 1.6; text-align: center;">
                                                Usa el siguiente código para completar tu registro en Imfilms Campaign Studio:
                                            </p>
                                            <!-- Code Box -->
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center">
                                                        <div style="background-color: #1a1a1a; border: 2px solid #b5a642; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                                                            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #b5a642; font-family: monospace;">${code}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="margin: 30px 0 0 0; color: #666666; font-size: 13px; text-align: center;">
                                                Este código expira en <strong style="color: #b5a642;">15 minutos</strong>.
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #222;">
                                            <p style="margin: 0; color: #555555; font-size: 12px; text-align: center;">
                                                Si no solicitaste este código, puedes ignorar este email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "Imfilms Support <support@estrenos.imfilms.es>", // Or keep existing sender
                    to: recipientEmail,
                    subject: `Tu código de verificación: ${code}`,
                    html: emailHtml,
                }),
            });

            const emailData = await emailRes.json();
            if (!emailRes.ok) throw new Error("Failed to send email: " + JSON.stringify(emailData));

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // --- EXISTING NOTIFICATIONS LOGIC ---

        // Helper to get admin emails
        const getAdminEmails = async () => {
            console.log("Fetching admin emails...");
            // 1. Get user IDs with admin role
            const { data: adminRoles, error: rolesError } = await supabaseAdmin
                .from("user_roles")
                .select("user_id")
                .eq("role", "admin");

            if (rolesError) {
                console.error("Error fetching admin roles:", rolesError);
                throw rolesError;
            }

            console.log("Admin roles found:", adminRoles);

            if (!adminRoles?.length) return [];

            const adminIds = adminRoles.map(r => r.user_id);
            const emails: string[] = [];

            // 2. Fetch email for each ID
            for (const id of adminIds) {
                const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
                if (!userError && user?.email) {
                    emails.push(user.email);
                } else {
                    console.error(`Error fetching user ${id}:`, userError);
                }
            }
            console.log("Admin emails mapped:", emails);
            return emails;
        };

        const fromEmail = "Imfilms Campaign Studio <updates@estrenos.imfilms.es>";
        const emailsToSend = [];

        if (payload.type === "new_campaign") {
            // 1. Notify Admins
            const adminEmails = await getAdminEmails();

            if (adminEmails.length > 0) {
                emailsToSend.push({
                    from: fromEmail,
                    to: adminEmails,
                    subject: `🚀 Nueva Campaña: ${payload.campaignTitle}`,
                    html: `
                <h1>Nueva Campaña Creada</h1>
                <p>El distribuidor <strong>${payload.distributorName}</strong> ha creado una nueva campaña.</p>
                <p><strong>Película:</strong> ${payload.campaignTitle}</p>
                <p><a href="https://estrenos.imfilms.es/admin">Ver en el Dashboard</a></p>
                `
                });
            } else {
                console.warn("No admins found to notify.");
            }

            // 2. Notify Creator (Confirmation)
            if (payload.recipientEmail) {
                emailsToSend.push({
                    from: fromEmail,
                    to: payload.recipientEmail,
                    subject: `✅ Campaña Recibida: ${payload.campaignTitle}`,
                    html: `
                <h1>¡Hemos recibido tu campaña!</h1>
                <p>Hola,</p>
                <p>Tu campaña para <strong>${payload.campaignTitle}</strong> ha sido creada correctamente.</p>
                <p>Nuestro equipo la revisará pronto y te notificaremos cualquier novedad.</p>
                <p>Puedes consultar el estado en cualquier momento en tu dashboard.</p>
                <p><a href="https://estrenos.imfilms.es/campaigns/${payload.campaignId}">Ir a mi Dashboard</a></p>
                `
                });
            }

        } else if (payload.type === "status_update") {
            // Notify Creator (Status Update)
            if (payload.recipientEmail) {
                emailsToSend.push({
                    from: fromEmail,
                    to: payload.recipientEmail,
                    subject: `📢 Actualización de Estado: ${payload.campaignTitle}`,
                    html: `
                <h1>Tu campaña ha sido actualizada</h1>
                <p>El estado de tu campaña para <strong>${payload.campaignTitle}</strong> ha cambiado a:</p>
                <h2>${payload.newStatus?.toUpperCase().replace('_', ' ')}</h2>
                <p>Entra a tu dashboard para ver más detalles.</p>
                <p><a href="https://estrenos.imfilms.es/campaigns/${payload.campaignId}">Ir a mi Dashboard</a></p>
                `
                });
            }
        }

        console.log(`Sending ${emailsToSend.length} emails...`);

        // Execute requests in parallel
        const results = await Promise.all(
            emailsToSend.map(email =>
                fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify(email),
                }).then(async r => {
                    const text = await r.text();
                    return { status: r.status, body: text };
                })
            )
        );

        console.log("Emails sent results:", results);

        // Add proper response info
        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);
