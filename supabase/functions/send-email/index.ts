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
    type: "new_campaign" | "status_update" | "verification_code" | "verify_code" | "proposal_ready" | "proposal_approved" | "proposal_changes_suggested" | "edit_proposal_created" | "media_plan_ready" | "media_plan_approved" | "media_plan_rejected";
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
                <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                            <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                            <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                        </td>
                                    </tr>
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Verifica tu correo</h2>
                                            <p style="margin: 0 0 30px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                Usa el siguiente código para completar tu registro en Imfilms Campaign Studio:
                                            </p>
                                            <!-- Code Box -->
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center">
                                                        <div style="background-color: #1a1a1a; border: 2px solid #F5D849; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                                                            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #F5D849; font-family: monospace;">${code}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="margin: 30px 0 0 0; color: #666666; font-size: 13px; text-align: center;">
                                                Este código expira en <strong style="color: #F5D849;">15 minutos</strong>.
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
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

        // --- NOTIFICATIONS LOGIC ---
        const fromEmail = "Imfilms Campaign Studio <updates@estrenos.imfilms.es>";
        const emailsToSend: any[] = [];
        const type = (payload.type || "").trim();

        console.log(`Matching email type: "${type}" (length: ${type.length})`);

        switch (type) {
            case "new_campaign": {
                console.log("Branch: new_campaign matched");
                console.log("Branch: new_campaign");
                // 1. Notify Admins
                const adminEmails = await getAdminEmails();
                if (adminEmails.length > 0) {
                    const subject = `🚀 Nueva Campaña: ${payload.campaignTitle}`;
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Nueva Campaña Creada</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    El distribuidor <strong>${payload.distributorName}</strong> ha creado una nueva campaña para:
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5D849; font-size: 18px; font-weight: bold; text-align: center;">
                                                    ${payload.campaignTitle}
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ver en el Dashboard
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: adminEmails,
                        subject: subject,
                        html: emailHtml
                    });
                }
                // 2. Notify Creator
                if (payload.recipientEmail) {
                    const subject = `✅ Campaña Recibida: ${payload.campaignTitle}`;
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">¡Hemos recibido tu campaña!</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Hola, tu campaña para <strong>${payload.campaignTitle}</strong> ha sido creada correctamente.
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Nuestro equipo la revisará pronto y te notificaremos cualquier novedad.
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns/${payload.campaignId}" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ir a mi Dashboard
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: payload.recipientEmail,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "proposal_ready": {
                console.log("Branch: proposal_ready matched");
                console.log("Branch: proposal_ready");
                if (payload.recipientEmail) {
                    const subject = `💡 Propuesta lista para tu revisión: ${payload.campaignTitle}`;
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Propuesta de campaña lista</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Nuestro equipo ha revisado y enriquecido tu campaña para <strong>${payload.campaignTitle}</strong>.
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Hemos creado una propuesta detallada que ya puedes revisar, aprobar o sugerir cambios.
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ver mi Propuesta
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: payload.recipientEmail,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "proposal_approved":
            case "proposal_changes_suggested": {
                console.log(`Branch: ${type} matched`);
                const adminEmails = await getAdminEmails();
                if (adminEmails.length > 0) {
                    const isApproved = type === "proposal_approved";
                    const subject = isApproved
                        ? `🟢 Propuesta Aprobada: ${payload.campaignTitle}`
                        : `🟡 Cambios Sugeridos en Propuesta: ${payload.campaignTitle}`;
                    const title = isApproved
                        ? `Propuesta Aprobada`
                        : `Cambios Sugeridos`;
                    const text = isApproved
                        ? `La distribuidora <strong>${payload.distributorName}</strong> ha aprobado la propuesta de campaña para:`
                        : `La distribuidora <strong>${payload.distributorName}</strong> ha sugerido cambios en la propuesta para:`;

                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">${title}</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    ${text}
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ver en el Dashboard
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: adminEmails,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "edit_proposal_created": {
                console.log("Branch: edit_proposal_created matched");
                console.log("Branch: edit_proposal_created - SUCCESS MATCH");
                const adminEmails = await getAdminEmails();
                if (adminEmails.length > 0) {
                    const subject = `✏️ Propuesta de Edición: ${payload.campaignTitle}`;
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Cambios Propuestos</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    El distribuidor <strong>${payload.distributorName}</strong> ha propuesto ediciones en la campaña para:
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5D849; font-size: 18px; font-weight: bold; text-align: center;">
                                                    ${payload.campaignTitle}
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5F2EB; opacity: 0.7; font-size: 14px; line-height: 1.6; text-align: center;">
                                                    Por favor, revisa y aprueba estos cambios para que se apliquen a la película.
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/admin" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ver en el Dashboard
                              </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: adminEmails,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "media_plan_ready": {
                console.log("Branch: media_plan_ready matched");
                if (payload.recipientEmail) {
                    console.log(`Processing media_plan_ready for ${payload.recipientEmail}`);
                    const subject = `📅 Plan de Medios listo para revisión: ${payload.campaignTitle}`;
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Plan de Medios listo</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Ya tenemos lista la estrategia de medios para <strong>${payload.campaignTitle}</strong>.
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    Por favor, revisa el desglose de fases, canales y audiencias para darnos tu aprobación.
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns/${payload.campaignId}/media-plan" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Revisar Plan de Medios
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: payload.recipientEmail,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "media_plan_approved":
            case "media_plan_rejected": {
                console.log(`Branch: ${type} matched`);
                const adminEmails = await getAdminEmails();
                if (adminEmails.length > 0) {
                    const isApproved = type === "media_plan_approved";
                    const subject = isApproved
                        ? `✅ Plan de Medios Aprobado: ${payload.campaignTitle}`
                        : `❌ Sugerencias en Plan de Medios: ${payload.campaignTitle}`;
                    const title = isApproved
                        ? `Plan de Medios Aprobado`
                        : `Sugerencias Recibidas`;
                    const text = isApproved
                        ? `La distribuidora <strong>${payload.distributorName}</strong> ha aprobado el plan de medios para:`
                        : `La distribuidora <strong>${payload.distributorName}</strong> ha sugerido cambios en el plan de medios para:`;

                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">${title}</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    ${text}
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5D849; font-size: 18px; font-weight: bold; text-align: center;">
                                                    ${payload.campaignTitle}
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/admin/media-plan/${payload.campaignId}" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ver Plan de Medios
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: adminEmails,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            case "status_update": {
                console.log("Branch: status_update matched");
                if (payload.recipientEmail) {
                    const subject = `📢 Actualización de Estado: ${payload.campaignTitle}`;
                    const newStatusLabel = payload.newStatus?.toUpperCase().replace('_', ' ') || "ACTUALIZADO";

                    const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #191919; font-family: Arial, sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #191919; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #191919; border-radius: 12px; border: 1px solid #F5D849; overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #F5D849 0%, #B8A237 100%); padding: 24px 30px; text-align: center;">
                                                <img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height: 40px; width: auto;" />
                                                <p style="margin: 8px 0 0 0; color: #191919; font-size: 13px; opacity: 0.8;">Campaign Studio</p>
                                            </td>
                                        </tr>
                                        <!-- Content -->
                                        <tr>
                                            <td style="padding: 40px 30px;">
                                                <h2 style="margin: 0 0 16px 0; color: #F5F2EB; font-size: 22px; text-align: center;">Estado de campaña actualizado</h2>
                                                <p style="margin: 0 0 20px 0; color: #F5F2EB; opacity: 0.7; font-size: 15px; line-height: 1.6; text-align: center;">
                                                    El estado de tu campaña para <strong>${payload.campaignTitle}</strong> ha cambiado a:
                                                </p>
                                                <p style="margin: 0 0 30px 0; color: #F5D849; font-size: 18px; font-weight: bold; text-align: center;">
                                                    ${newStatusLabel}
                                                </p>
                                                <!-- Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://estrenos.imfilms.es/campaigns/${payload.campaignId}" style="background-color: #F5D849; color: #191919; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                                Ir a mi Dashboard
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #333;">
                                                <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                                    Este es un aviso automático de Imfilms Campaign Studio.
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

                    emailsToSend.push({
                        from: fromEmail,
                        to: payload.recipientEmail,
                        subject: subject,
                        html: emailHtml
                    });
                }
                break;
            }
            default: {
                console.log(`Unknown payload type encountered: "${type}"`);
            }
        }

        console.log(`Queueing ${emailsToSend.length} emails to send...`);

        if (emailsToSend.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No emails to send for this payload." }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Execute requests in parallel
        const results = await Promise.all(
            emailsToSend.map(async (email) => {
                console.log(`Sending email to: ${email.to}`);
                const response = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify(email),
                });
                const body = await response.text();
                return {
                    to: email.to,
                    status: response.status,
                    body
                };
            })
        );

        console.log("Resend API Results:", results);

        // Check for failures
        const failures = results.filter(r => r.status < 200 || r.status >= 300);
        if (failures.length > 0) {
            console.error("Some emails failed:", failures);
            throw new Error(`Resend Error: ${failures[0].body}`);
        }

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Fatal function error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);

