/**
 * EmailPreviewPanel — reusable panel for all transactional email templates.
 * Design: Premium Cinema Dark — Awwwards-tier email aesthetic.
 */
import { useState } from 'react';

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const LOGO = `<img src="https://estrenos.imfilms.es/logo-imfilms.png" alt="Imfilms" style="height:38px;width:auto;display:block;margin:0 auto;" />`;

// ─── Premium layout ────────────────────────────────────────────────────────────
// Cinema Dark: OLED black base, gold accent bar, machined card borders
function layout(content: string, accent = '#F5D849', accentDark = '#B8A237') {
  const diamondDivider = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="width:50%;height:1px;background:linear-gradient(90deg,transparent,${accent}40);"></td>
        <td style="width:8px;height:8px;background:${accent};transform:rotate(45deg);display:block;margin:0 auto;"></td>
        <td style="width:50%;height:1px;background:linear-gradient(270deg,transparent,${accent}40);"></td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Imfilms Campaign Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#080809;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!--[if mso]><center><table><tr><td width="560"><![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#080809;padding:48px 16px 72px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

        <!-- TOP GOLD BAR -->
        <tr>
          <td style="background:linear-gradient(90deg,${accentDark} 0%,${accent} 45%,#ffe87a 70%,${accentDark} 100%);height:3px;border-radius:4px 4px 0 0;"></td>
        </tr>

        <!-- HEADER -->
        <tr>
          <td style="background:#0f0f12;padding:36px 48px 30px;text-align:center;border-left:1px solid #1c1c20;border-right:1px solid #1c1c20;">
            ${LOGO}
            <p style="margin:10px 0 0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:${accent};opacity:0.75;font-weight:600;">CAMPAIGN STUDIO</p>
          </td>
        </tr>

        <!-- HEADER / CONTENT DIVIDER -->
        <tr>
          <td style="background:#0f0f12;padding:0 48px;border-left:1px solid #1c1c20;border-right:1px solid #1c1c20;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(245,216,73,0.2) 30%,rgba(245,216,73,0.2) 70%,transparent);"></td>
            </tr></table>
          </td>
        </tr>

        <!-- CONTENT AREA -->
        <tr>
          <td style="background:#0f0f12;padding:48px 48px 52px;border-left:1px solid #1c1c20;border-right:1px solid #1c1c20;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER DIVIDER -->
        <tr>
          <td style="background:#0a0a0d;padding:0 48px;border-left:1px solid #1c1c20;border-right:1px solid #1c1c20;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="height:1px;background:#1c1c20;"></td>
            </tr></table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0a0a0d;padding:28px 48px 32px;border-left:1px solid #1c1c20;border-right:1px solid #1c1c20;border-bottom:1px solid #1c1c20;border-radius:0 0 12px 12px;text-align:center;">
            <p style="margin:0 0 10px;color:#3a3a40;font-size:11px;line-height:1.6;">Aviso automático de Imfilms Campaign Studio.<br>Este mensaje fue generado por el sistema y no requiere respuesta.</p>
            <a href="https://estrenos.imfilms.es" style="color:${accent};text-decoration:none;font-size:11px;letter-spacing:0.12em;opacity:0.6;">estrenos.imfilms.es</a>
          </td>
        </tr>

        <!-- BOTTOM GLOW LINE -->
        <tr>
          <td style="height:1px;background:linear-gradient(90deg,transparent,${accent}20,transparent);"></td>
        </tr>

      </table>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table></center><![endif]-->
</body>
</html>`;
}

// ─── Content helpers ───────────────────────────────────────────────────────────
function eyebrow(t: string, c = '#F5D849') {
  return `<p style="margin:0 0 14px 0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:${c};font-weight:700;text-align:center;opacity:0.7;">${t}</p>`;
}
function h2(t: string, c = '#F0EDE6') {
  return `<h1 style="margin:0 0 20px 0;color:${c};font-size:26px;font-weight:700;text-align:center;line-height:1.25;letter-spacing:-0.02em;">${t}</h1>`;
}
function p(t: string) {
  return `<p style="margin:0 0 20px 0;color:#7a7a85;font-size:14px;line-height:1.75;text-align:center;">${t}</p>`;
}
function hl(t: string, c = '#F5D849') {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 28px 0;"><tr><td style="background:${c}10;border:1px solid ${c}25;border-radius:8px;padding:14px 24px;text-align:center;"><span style="color:${c};font-size:16px;font-weight:700;letter-spacing:-0.01em;">${t}</span></td></tr></table>`;
}
function btn(label: string, url: string, c = '#F5D849', tc = '#0a0a0c') {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;"><tr><td align="center"><a href="${url}" style="background:${c};color:${tc};padding:15px 36px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.04em;display:inline-block;text-transform:uppercase;">${label}</a></td></tr></table>`;
}
function metaRow(rows: { label: string; value: string }[], accent = '#F5D849') {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:12px 16px;background:#141418;border-radius:6px;border-bottom:1px solid #1a1a1e;">
        <p style="margin:0 0 3px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#3a3a45;">${r.label}</p>
        <p style="margin:0;font-size:14px;color:${accent};font-weight:600;">${r.value}</p>
      </td>
    </tr>`).join('<tr><td style="height:4px;"></td></tr>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">${cells}</table>`;
}
function codeBox(code: string, accent = '#F5D849') {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td align="center" style="background:#0a0a0d;border:2px solid ${accent}30;border-radius:10px;padding:28px 40px;"><span style="font-size:42px;font-weight:700;letter-spacing:14px;color:${accent};font-family:Courier,monospace;">${code}</span></td></tr></table>`;
}

// ─── Demo data ─────────────────────────────────────────────────────────────────
const DEMO = {
  campaignTitle: 'El Último Suspiro',
  campaignId: 'abc-123',
  distributorName: 'Avalon PC',
  assetName: 'Teaser 15s Vertical',
  userEmail: 'distribuidor@ejemplo.com',
  subject: 'Problema con la factura del mes de mayo',
  message: 'Hola, necesito revisar el detalle de la factura porque hay un cargo que no reconozco. ¿Podéis ayudarme?',
  code: '7842',
};

const templates: { key: string; label: string; html: string; subject: string }[] = [
  {
    key: 'new_campaign_admin',
    label: '🚀 Nueva campaña (admin)',
    subject: `🚀 Nueva Campaña: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Nueva campaña') +
      h2(`Ha llegado una<br>nueva campaña`) +
      p(`La distribuidora <strong style="color:#F0EDE6;font-weight:600;">${DEMO.distributorName}</strong> acaba de crear una campaña publicitaria.`) +
      hl(DEMO.campaignTitle) +
      btn('Ver en el Dashboard', 'https://estrenos.imfilms.es/campaigns')
    ),
  },
  {
    key: 'new_campaign_user',
    label: '✅ Campaña recibida (usuario)',
    subject: `✅ Campaña Recibida: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Confirmación de recepción') +
      h2('Campaña recibida<br>correctamente') +
      p(`Tu campaña para <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong> ha sido registrada en nuestro sistema.`) +
      p('Nuestro equipo la revisará y te notificará cualquier novedad en las próximas horas.') +
      btn('Ver mi campaña', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}`)
    ),
  },
  {
    key: 'proposal_ready',
    label: '💡 Propuesta lista',
    subject: `💡 Propuesta lista: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Propuesta de campaña') +
      h2('Tu propuesta<br>está lista') +
      p(`Hemos revisado y enriquecido tu campaña para <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong>.`) +
      p('Ya puedes ver la propuesta completa, aprobarla o sugerir cambios.') +
      btn('Ver mi propuesta', 'https://estrenos.imfilms.es/campaigns')
    ),
  },
  {
    key: 'proposal_approved',
    label: '🟢 Propuesta aprobada (admin)',
    subject: `🟢 Propuesta Aprobada: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Propuesta aprobada', '#22C55E') +
      h2('Propuesta aprobada', '#22C55E') +
      p(`<strong style="color:#F0EDE6;">${DEMO.distributorName}</strong> ha aprobado la propuesta para:`) +
      hl(DEMO.campaignTitle, '#22C55E') +
      btn('Ver en el Dashboard', 'https://estrenos.imfilms.es/campaigns', '#22C55E', '#ffffff'),
      '#22C55E', '#16A34A'
    ),
  },
  {
    key: 'proposal_changes',
    label: '🟡 Cambios sugeridos (admin)',
    subject: `🟡 Cambios Sugeridos: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Cambios solicitados', '#F59E0B') +
      h2('Han sugerido cambios', '#F59E0B') +
      p(`<strong style="color:#F0EDE6;">${DEMO.distributorName}</strong> ha solicitado ajustes en la propuesta para:`) +
      hl(DEMO.campaignTitle, '#F59E0B') +
      btn('Revisar cambios', 'https://estrenos.imfilms.es/campaigns', '#F59E0B', '#0a0a0c'),
      '#F59E0B', '#D97706'
    ),
  },
  {
    key: 'media_plan_ready',
    label: '📅 Plan de Medios listo',
    subject: `📅 Plan de Medios listo: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Plan de medios') +
      h2('Tu plan de medios<br>está listo') +
      p(`Hemos preparado la estrategia completa de medios para <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong>.`) +
      p('Revisa el desglose de fases, canales y audiencias y danos tu aprobación.') +
      btn('Revisar plan de medios', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}/media-plan`)
    ),
  },
  {
    key: 'media_plan_approved',
    label: '✅ Plan de Medios aprobado (admin)',
    subject: `✅ Plan de Medios Aprobado: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Plan aprobado', '#22C55E') +
      h2('Plan de medios<br>aprobado', '#22C55E') +
      p(`<strong style="color:#F0EDE6;">${DEMO.distributorName}</strong> ha dado luz verde al plan de medios para:`) +
      hl(DEMO.campaignTitle, '#22C55E') +
      btn('Ver Plan de Medios', `https://estrenos.imfilms.es/admin/media-plan/${DEMO.campaignId}`, '#22C55E', '#ffffff'),
      '#22C55E', '#16A34A'
    ),
  },
  {
    key: 'media_plan_rejected',
    label: '❌ Plan de Medios con sugerencias (admin)',
    subject: `❌ Sugerencias Plan de Medios: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Ajustes solicitados', '#EF4444') +
      h2('Solicitan cambios<br>en el plan', '#EF4444') +
      p(`<strong style="color:#F0EDE6;">${DEMO.distributorName}</strong> ha sugerido ajustes en el plan de medios para:`) +
      hl(DEMO.campaignTitle, '#EF4444') +
      btn('Ver sugerencias', `https://estrenos.imfilms.es/admin/media-plan/${DEMO.campaignId}`, '#EF4444', '#ffffff'),
      '#EF4444', '#DC2626'
    ),
  },
  {
    key: 'report_ready',
    label: '📊 Informe listo',
    subject: `📊 Informe listo: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Informe de campaña') +
      h2('Tu informe está<br>listo para revisar') +
      p(`El informe de resultados de tu campaña <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong> ya está disponible.`) +
      btn('Revisar Informe', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}/report`)
    ),
  },
  {
    key: 'report_approved',
    label: '✅ Informe aprobado (admin)',
    subject: `✅ Informe aprobado: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Informe aprobado', '#22C55E') +
      h2('Informe aprobado', '#22C55E') +
      p(`<strong style="color:#F0EDE6;">${DEMO.distributorName}</strong> ha aprobado el informe final de:`) +
      hl(DEMO.campaignTitle, '#22C55E') +
      btn('Ver en el Dashboard', 'https://estrenos.imfilms.es/campaigns', '#22C55E', '#ffffff'),
      '#22C55E', '#16A34A'
    ),
  },
  {
    key: 'creative_approved',
    label: '✅ Creativo aprobado',
    subject: `✅ Creativo Aprobado: ${DEMO.assetName}`,
    html: layout(
      eyebrow('Creativo aprobado', '#22C55E') +
      h2('¡Tu creativo<br>ha sido aprobado!', '#22C55E') +
      p(`El siguiente material para la campaña <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong> está listo para publicar:`) +
      hl(DEMO.assetName, '#22C55E') +
      btn('Ver en mi Dashboard', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}`, '#22C55E', '#ffffff'),
      '#22C55E', '#16A34A'
    ),
  },
  {
    key: 'creative_rejected',
    label: '❌ Creativo con ajustes',
    subject: `❌ Creativo con Ajustes: ${DEMO.assetName}`,
    html: layout(
      eyebrow('Ajustes requeridos', '#EF4444') +
      h2('Tu creativo necesita<br>pequeños ajustes', '#EF4444') +
      p(`El siguiente material para <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong> requiere modificaciones:`) +
      hl(DEMO.assetName, '#EF4444') +
      p('Revisa las notas en tu dashboard, realiza los cambios solicitados y sube una nueva versión.') +
      btn('Ver notas y re-subir', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}`, '#EF4444', '#ffffff'),
      '#EF4444', '#DC2626'
    ),
  },
  {
    key: 'status_update',
    label: '📢 Estado actualizado',
    subject: `📢 Estado actualizado: ${DEMO.campaignTitle}`,
    html: layout(
      eyebrow('Actualización de estado') +
      h2('El estado de tu<br>campaña ha cambiado') +
      p(`Tu campaña para <strong style="color:#F0EDE6;">${DEMO.campaignTitle}</strong> ha pasado al siguiente estado:`) +
      hl('EN REVISIÓN') +
      btn('Ver mi campaña', `https://estrenos.imfilms.es/campaigns/${DEMO.campaignId}`)
    ),
  },
  {
    key: 'support_request',
    label: '💬 Soporte (admin)',
    subject: `💬 Mensaje de soporte: ${DEMO.subject}`,
    html: layout(
      eyebrow('Soporte al cliente') +
      h2('Nuevo mensaje<br>de soporte') +
      metaRow([
        { label: 'De', value: DEMO.userEmail },
        { label: 'Asunto', value: DEMO.subject },
      ]) +
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:#141418;border-left:3px solid #F5D849;border-radius:0 6px 6px 0;padding:16px 20px;"><p style="margin:0;color:#8a8a95;font-size:13px;line-height:1.75;">${DEMO.message}</p></td></tr></table>` +
      `<p style="margin:0;color:#3a3a45;font-size:11px;text-align:center;">Responde directamente a este email para contestar al usuario.</p>`
    ),
  },
  {
    key: 'verification_code',
    label: '🔐 Código de verificación',
    subject: `Tu código de verificación: ${DEMO.code}`,
    html: layout(
      eyebrow('Verificación de cuenta') +
      h2('Verifica tu<br>correo electrónico') +
      p('Usa el siguiente código de 4 dígitos para completar tu registro en Imfilms Campaign Studio:') +
      codeBox(DEMO.code) +
      `<p style="margin:0;color:#3a3a45;font-size:12px;text-align:center;">Este código expira en <strong style="color:#F5D849;">15 minutos</strong>. No lo compartas con nadie.</p>`
    ),
  },
];

interface EmailPreviewPanelProps {
  height?: string;
}

export const EmailPreviewPanel = ({ height = 'calc(100vh - 320px)' }: EmailPreviewPanelProps) => {
  const [selected, setSelected] = useState(templates[0]);

  return (
    <div className="flex gap-4" style={{ height }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 overflow-y-auto space-y-1 pr-1">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelected(t)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${
              selected.key === t.key
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-cinema-ivory hover:bg-white/5 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </aside>

      {/* Preview pane */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Subject */}
        <div className="bg-[#141416] border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Asunto</span>
          <span className="text-cinema-ivory text-sm truncate">{selected.subject}</span>
        </div>

        {/* HTML iframe */}
        <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
          <iframe
            key={selected.key}
            srcDoc={selected.html}
            className="w-full h-full"
            title={`Email preview: ${selected.label}`}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};
