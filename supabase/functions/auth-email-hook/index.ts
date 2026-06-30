import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const AUTH_HOOK_SECRET = Deno.env.get("AUTH_HOOK_SECRET") ?? "";
const FROM_EMAIL = "Imfilms Campaign Studio <updates@estrenos.imfilms.es>";
const BASE_URL = "https://estrenos.imfilms.es";
const LOGO_URL = `${BASE_URL}/logo-imfilms.png`;

// ─── Shared HTML layout ──────────────────────────────────────────────────────

function buildEmail(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#191919;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#191919;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#191919;border-radius:12px;border:1px solid #F5D849;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#F5D849 0%,#B8A237 100%);padding:24px 30px;text-align:center;">
              <img src="${LOGO_URL}" alt="Imfilms" style="height:40px;width:auto;" />
              <p style="margin:8px 0 0 0;color:#191919;font-size:13px;opacity:0.8;">Campaign Studio</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0d0d0d;padding:20px 30px;border-top:1px solid #333;">
              <p style="margin:0;color:#555555;font-size:12px;text-align:center;">
                Si no solicitaste este email, puedes ignorarlo sin problema.<br/>
                <a href="${BASE_URL}" style="color:#F5D849;text-decoration:none;">imfilms.es</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string, color = "#F5D849", textColor = "#191919"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td align="center">
        <a href="${url}" style="background-color:${color};color:${textColor};padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;letter-spacing:0.3px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── Email templates ─────────────────────────────────────────────────────────

function signupHtml(confirmUrl: string): string {
  return buildEmail(`
    <h2 style="margin:0 0 16px 0;color:#F5F2EB;font-size:22px;text-align:center;">Confirma tu cuenta</h2>
    <p style="margin:0 0 8px 0;color:#F5F2EB;opacity:0.7;font-size:15px;line-height:1.6;text-align:center;">
      Bienvenido a <strong style="color:#F5D849;">Imfilms Campaign Studio</strong>.<br/>
      Haz clic en el botón para activar tu cuenta y empezar a gestionar tus campañas.
    </p>
    ${ctaButton("Confirmar cuenta", confirmUrl)}
    <p style="margin:24px 0 0 0;color:#555555;font-size:12px;text-align:center;">
      Este enlace expira en <strong style="color:#F5D849;">24 horas</strong>.
    </p>
  `);
}

function recoveryHtml(resetUrl: string): string {
  return buildEmail(`
    <h2 style="margin:0 0 16px 0;color:#F5F2EB;font-size:22px;text-align:center;">Recupera tu contraseña</h2>
    <p style="margin:0 0 8px 0;color:#F5F2EB;opacity:0.7;font-size:15px;line-height:1.6;text-align:center;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br/>
      Haz clic en el botón para crear una nueva contraseña.
    </p>
    ${ctaButton("Restablecer contraseña", resetUrl)}
    <p style="margin:24px 0 0 0;color:#555555;font-size:12px;text-align:center;">
      Este enlace expira en <strong style="color:#F5D849;">1 hora</strong>.<br/>
      Si no solicitaste este cambio, puedes ignorar este email.
    </p>
  `);
}

function inviteHtml(inviteUrl: string): string {
  return buildEmail(`
    <h2 style="margin:0 0 16px 0;color:#F5F2EB;font-size:22px;text-align:center;">Te han invitado a Imfilms Campaign Studio</h2>
    <p style="margin:0 0 8px 0;color:#F5F2EB;opacity:0.7;font-size:15px;line-height:1.6;text-align:center;">
      Has sido invitado a unirte a la plataforma de gestión de campañas publicitarias para distribuidoras de cine.<br/>
      Haz clic para aceptar la invitación y crear tu contraseña.
    </p>
    ${ctaButton("Aceptar invitación", inviteUrl)}
    <p style="margin:24px 0 0 0;color:#555555;font-size:12px;text-align:center;">
      Este enlace expira en <strong style="color:#F5D849;">24 horas</strong>.
    </p>
  `);
}

function magiclinkHtml(magicUrl: string): string {
  return buildEmail(`
    <h2 style="margin:0 0 16px 0;color:#F5F2EB;font-size:22px;text-align:center;">Tu enlace de acceso</h2>
    <p style="margin:0 0 8px 0;color:#F5F2EB;opacity:0.7;font-size:15px;line-height:1.6;text-align:center;">
      Haz clic en el botón para acceder a tu cuenta de Imfilms Campaign Studio.<br/>
      No necesitas contraseña.
    </p>
    ${ctaButton("Acceder a mi cuenta", magicUrl)}
    <p style="margin:24px 0 0 0;color:#555555;font-size:12px;text-align:center;">
      Este enlace expira en <strong style="color:#F5D849;">1 hora</strong> y solo puede usarse una vez.
    </p>
  `);
}

function emailChangeHtml(changeUrl: string): string {
  return buildEmail(`
    <h2 style="margin:0 0 16px 0;color:#F5F2EB;font-size:22px;text-align:center;">Confirma tu nuevo email</h2>
    <p style="margin:0 0 8px 0;color:#F5F2EB;opacity:0.7;font-size:15px;line-height:1.6;text-align:center;">
      Has solicitado cambiar el email de tu cuenta.<br/>
      Haz clic para confirmar el nuevo email.
    </p>
    ${ctaButton("Confirmar nuevo email", changeUrl)}
    <p style="margin:24px 0 0 0;color:#555555;font-size:12px;text-align:center;">
      Este enlace expira en <strong style="color:#F5D849;">24 horas</strong>.
    </p>
  `);
}

// ─── Subject lines ────────────────────────────────────────────────────────────

function getSubject(type: string): string {
  const subjects: Record<string, string> = {
    signup: "Confirma tu cuenta en Imfilms Campaign Studio",
    recovery: "Recupera tu contraseña — Imfilms Campaign Studio",
    invite: "Te han invitado a Imfilms Campaign Studio",
    magiclink: "Tu enlace de acceso — Imfilms Campaign Studio",
    email_change: "Confirma tu nuevo email — Imfilms Campaign Studio",
  };
  return subjects[type] ?? "Imfilms Campaign Studio";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Verify request comes from Supabase via shared secret
  const hookSecret = req.headers.get("x-supabase-signature") ?? req.headers.get("authorization");
  if (AUTH_HOOK_SECRET && hookSecret !== AUTH_HOOK_SECRET && hookSecret !== `Bearer ${AUTH_HOOK_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const payload = await req.json();

    // Supabase Auth Hook payload structure
    const user = payload.user;
    const emailData = payload.email_data;
    const emailType: string = emailData?.email_action_type ?? "";
    const recipientEmail: string = user?.email ?? "";

    if (!recipientEmail) {
      console.error("No recipient email in hook payload", JSON.stringify(payload));
      return new Response(JSON.stringify({}), { status: 200 });
    }

    // Build the action URL from token_hash (Supabase provides this)
    const siteUrl = BASE_URL;
    const tokenHash = emailData?.token_hash ?? emailData?.token ?? "";
    const redirectTo = emailData?.redirect_to ?? siteUrl;

    const buildUrl = (type: string) => {
      if (emailData?.site_url) {
        // Supabase already provides a full URL in some hook versions
        return `${emailData.site_url}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${redirectTo}`;
      }
      return `${siteUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}&next=${encodeURIComponent(redirectTo)}`;
    };

    let html = "";
    switch (emailType) {
      case "signup":
      case "email_confirmation":
        html = signupHtml(buildUrl("signup"));
        break;
      case "recovery":
        html = recoveryHtml(buildUrl("recovery"));
        break;
      case "invite":
        html = inviteHtml(buildUrl("invite"));
        break;
      case "magiclink":
        html = magiclinkHtml(buildUrl("magiclink"));
        break;
      case "email_change":
        html = emailChangeHtml(buildUrl("email_change"));
        break;
      default:
        // Unknown type — log and return 200 to not block Supabase Auth
        console.warn("Unknown auth email type:", emailType, "— skipping send");
        return new Response(JSON.stringify({}), { status: 200 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject: getSubject(emailType),
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", JSON.stringify(err));
      // Return 200 anyway so Supabase Auth doesn't block the user flow
      return new Response(JSON.stringify({}), { status: 200 });
    }

    console.log(`Auth email sent: type=${emailType} to=${recipientEmail}`);
    return new Response(JSON.stringify({}), { status: 200 });

  } catch (err) {
    console.error("auth-email-hook error:", err);
    // Always return 200 to Supabase — never block the auth flow
    return new Response(JSON.stringify({}), { status: 200 });
  }
});
