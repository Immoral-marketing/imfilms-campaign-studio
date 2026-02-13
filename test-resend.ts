import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

console.log("Testing Resend API...");

if (!RESEND_API_KEY) {
    console.error("ERROR: RESEND_API_KEY is not set.");
    Deno.exit(1);
}

const testEmail = async () => {
    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Imfilms Support <support@estrenos.imfilms.es>",
                to: ["danie@estrenos.imfilms.es"], // Fallback or current user? usually admin
                subject: "Test Email from Local Script",
                html: "<p>This is a test email to verify Resend API.</p>",
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            console.error("Resend API Error:", error);
        } else {
            const data = await res.json();
            console.log("Email sent successfully:", data);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
};

testEmail();
