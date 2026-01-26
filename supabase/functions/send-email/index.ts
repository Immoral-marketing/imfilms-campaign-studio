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
    type: "new_campaign" | "status_update";
    campaignId: string;
    campaignTitle?: string;
    distributorName?: string;
    newStatus?: string;
    recipientEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload: EmailPayload = await req.json();
        console.log("Processing email request:", payload);

        if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
