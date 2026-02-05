import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const COOLDOWN_MINUTES = 30;
const WAIT_SECONDS = 120; // 2 minutes

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const { record: message } = payload;

        if (!message) throw new Error("No record found in payload");

        console.log(`Processing message ${message.id} for campaign ${message.campaign_id}`);

        const supabaseAdmin = createClient(
            SUPABASE_URL ?? "",
            SUPABASE_SERVICE_ROLE_KEY ?? ""
        );

        // 1. Fetch Campaign and check cooldown
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .select("*, films(title)")
            .eq("id", message.campaign_id)
            .single();

        if (campaignError || !campaign) throw new Error("Campaign not found");

        const lastNotification = campaign.last_chat_notification_at;
        if (lastNotification) {
            const lastDate = new Date(lastNotification);
            const diffMinutes = (new Date().getTime() - lastDate.getTime()) / (1000 * 60);

            if (diffMinutes < COOLDOWN_MINUTES) {
                console.log(`Skipping: Notification sent ${Math.round(diffMinutes)} mins ago (Cooldown: ${COOLDOWN_MINUTES}m)`);
                return new Response(JSON.stringify({ success: true, message: "Cooldown active" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 2. Wait 2 minutes to see if message is read
        console.log(`Waiting ${WAIT_SECONDS}s before re-checking message status...`);
        await new Promise((resolve) => setTimeout(resolve, WAIT_SECONDS * 1000));

        // 3. Re-fetch message to check read_at
        const { data: updatedMessage, error: messageError } = await supabaseAdmin
            .from("campaign_messages")
            .select("read_at")
            .eq("id", message.id)
            .single();

        if (messageError || !updatedMessage) {
            console.log("Message deleted during wait.");
            return new Response(JSON.stringify({ success: true, message: "Message gone" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (updatedMessage.read_at) {
            console.log("Message already read. Notification cancelled.");
            return new Response(JSON.stringify({ success: true, message: "Already read" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Identify recipients
        let recipientEmails: string[] = [];
        let recipientName = "";
        const campaignTitle = campaign.films?.title || "Campaña";

        if (message.sender_role === "distributor") {
            // If distributor writes, notify admins
            console.log("Sender is distributor, notifying admins...");
            const { data: adminRoles } = await supabaseAdmin
                .from("user_roles")
                .select("user_id")
                .eq("role", "admin");

            if (adminRoles?.length) {
                for (const role of adminRoles) {
                    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
                    if (user?.email) recipientEmails.push(user.email);
                }
            }
            recipientName = "Administrador";
        } else {
            // If admin writes, notify campaign contact
            console.log("Sender is admin, notifying distributor contact...");
            if (campaign.contact_email) {
                recipientEmails.push(campaign.contact_email);
            }
            recipientName = campaign.contact_name || "Distribuidor";
        }

        if (recipientEmails.length === 0) {
            console.warn("No recipients found.");
            return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5. Send Email
        const baseUrl = "https://estrenos.imfilms.es";
        const dashboardUrl = message.sender_role === "distributor"
            ? `${baseUrl}/admin`
            : `${baseUrl}/campaigns/${campaign.id}`;

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
                                        <h2 style="margin: 0 0 16px 0; color: #f5f5dc; font-size: 22px; text-align: center;">Nuevo mensaje de chat</h2>
                                        <p style="margin: 0 0 20px 0; color: #a0a0a0; font-size: 15px; line-height: 1.6; text-align: center;">
                                            Hola ${recipientName}, tienes un nuevo mensaje sin leer en la campaña:
                                        </p>
                                        <p style="margin: 0 0 30px 0; color: #b5a642; font-size: 18px; font-weight: bold; text-align: center;">
                                            ${campaignTitle}
                                        </p>
                                        <!-- Message Preview -->
                                        <div style="background-color: #1a1a1a; border-left: 4px solid #b5a642; border-radius: 4px; padding: 20px; margin-bottom: 30px; color: #f5f5dc; font-style: italic; font-size: 14px;">
                                            "${message.message.length > 150 ? message.message.substring(0, 150) + '...' : message.message}"
                                        </div>
                                        <!-- Button -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center">
                                                    <a href="${dashboardUrl}" style="background-color: #b5a642; color: #0a0a0a; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                        Responder en el Chat
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0d0d0d; padding: 20px 30px; border-top: 1px solid #222;">
                                        <p style="margin: 0; color: #555555; font-size: 11px; text-align: center; line-height: 1.4;">
                                            Este es un aviso automático de Imfilms Campaign Studio.<br>
                                            El próximo aviso para esta campaña se enviará en al menos 30 minutos si hay nuevos mensajes.
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
                from: "Imfilms Support <support@estrenos.imfilms.es>",
                to: recipientEmails,
                subject: `💬 Nuevo mensaje: ${campaignTitle}`,
                html: emailHtml,
            }),
        });

        if (!emailRes.ok) {
            const error = await emailRes.text();
            throw new Error(`Resend error: ${error}`);
        }

        // 6. Update Cooldown
        await supabaseAdmin
            .from("campaigns")
            .update({ last_chat_notification_at: new Date().toISOString() })
            .eq("id", campaign.id);

        console.log("Notification sent successfully.");
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Critical error in function:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
