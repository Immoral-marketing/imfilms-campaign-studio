import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const COOLDOWN_MINUTES = 15;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { campaignId, uploaderName, fileCount, fileNames } = await req.json();

        if (!campaignId || !fileCount) {
            throw new Error("Missing required fields: campaignId, fileCount");
        }

        console.log(`Processing creative upload notification for campaign ${campaignId}`);

        const supabaseAdmin = createClient(
            SUPABASE_URL ?? "",
            SUPABASE_SERVICE_ROLE_KEY ?? ""
        );

        // 1. Fetch campaign info
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .select("*, films(title)")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) throw new Error("Campaign not found");

        const campaignTitle = campaign.films?.title || "Campaña";
        const safeUploaderName = uploaderName || "Un usuario";

        // 2. Fetch admin emails first to fail fast if none
        console.log("Fetching admin roles...");
        const { data: adminRoles, error: rolesError } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

        if (rolesError) {
            console.error("Error fetching admin roles:", rolesError);
        }

        const recipientEmails: string[] = [];
        if (adminRoles?.length) {
            console.log(`Found ${adminRoles.length} admin roles. Fetching emails...`);
            for (const role of adminRoles) {
                const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
                if (user?.email) {
                    recipientEmails.push(user.email);
                } else if (userError) {
                    console.error(`Error fetching user ${role.user_id}:`, userError);
                }
            }
        }

        console.log(`Resolved ${recipientEmails.length} recipient emails:`, recipientEmails);

        if (recipientEmails.length === 0) {
            console.warn("No admin emails found. Aborting notification.");
            return new Response(JSON.stringify({
                success: true,
                email_sent: false,
                email_reason: "no_recipients",
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Check email cooldown
        const lastNotification = campaign.last_creative_notification_at;
        console.log(`Checking cooldown. Last notification: ${lastNotification}`);

        let emailSent = false;

        if (lastNotification) {
            const lastDate = new Date(lastNotification);
            const diffMinutes = (new Date().getTime() - lastDate.getTime()) / (1000 * 60);

            console.log(`Time since last notification: ${diffMinutes.toFixed(2)} mins. Cooldown: ${COOLDOWN_MINUTES} mins.`);

            if (diffMinutes < COOLDOWN_MINUTES) {
                console.log(`Email skipped: cooldown active.`);
                return new Response(JSON.stringify({
                    success: true,
                    email_sent: false,
                    email_reason: "cooldown_active",
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        } else {
            console.log("No previous notification found. Proceeding.");
        }

        // 6. Send email via Resend
        const baseUrl = "https://estrenos.imfilms.es";
        const dashboardUrl = `${baseUrl}/campaigns/${campaignId}`;
        const fileList = (fileNames || []).slice(0, 5).map((f: string) => `<li style="color: #a0a0a0; font-size: 13px;">${f}</li>`).join("");
        const moreFiles = fileCount > 5 ? `<li style="color: #a0a0a0; font-size: 13px;">...y ${fileCount - 5} más</li>` : "";

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
                                        <h2 style="margin: 0 0 16px 0; color: #f5f5dc; font-size: 22px; text-align: center;">📎 Nuevas creatividades subidas</h2>
                                        <p style="margin: 0 0 20px 0; color: #a0a0a0; font-size: 15px; line-height: 1.6; text-align: center;">
                                            <strong style="color: #f5f5dc;">${safeUploaderName}</strong> ha subido <strong style="color: #b5a642;">${fileCount}</strong> archivo(s) para la campaña:
                                        </p>
                                        <p style="margin: 0 0 20px 0; color: #b5a642; font-size: 18px; font-weight: bold; text-align: center;">
                                            ${campaignTitle}
                                        </p>
                                        <!-- File list -->
                                        <div style="background-color: #1a1a1a; border-left: 4px solid #b5a642; border-radius: 4px; padding: 16px 20px; margin-bottom: 30px;">
                                            <p style="margin: 0 0 8px 0; color: #f5f5dc; font-size: 13px; font-weight: bold;">Archivos:</p>
                                            <ul style="margin: 0; padding-left: 16px;">
                                                ${fileList}
                                                ${moreFiles}
                                            </ul>
                                        </div>
                                        <!-- Button -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center">
                                                    <a href="${dashboardUrl}" style="background-color: #b5a642; color: #0a0a0a; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                                        Ver creatividades
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
                                            El próximo aviso para esta campaña se enviará en al menos ${COOLDOWN_MINUTES} minutos si hay nuevas subidas.
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
                subject: `📎 Nuevas creatividades: ${campaignTitle}`,
                html: emailHtml,
            }),
        });

        if (!emailRes.ok) {
            const error = await emailRes.text();
            console.error("Resend error:", error);
            // Non-fatal for the overall flow
        } else {
            emailSent = true;
            // 7. Update cooldown timestamp
            await supabaseAdmin
                .from("campaigns")
                .update({ last_creative_notification_at: new Date().toISOString() })
                .eq("id", campaignId);

            console.log("Email sent and cooldown updated.");
        }

        return new Response(JSON.stringify({
            success: true,
            email_sent: emailSent,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Critical error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
