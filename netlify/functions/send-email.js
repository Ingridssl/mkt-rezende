// netlify/functions/send-email.js
// Envio via Microsoft Graph API com suporte a anexo (base64)
//
// Variáveis de ambiente no Netlify:
//   AZURE_TENANT_ID     — 56a8eefc-c653-4efd-a3db-db881ffbde6e
//   AZURE_CLIENT_ID     — aac7ce36-bf33-4a43-afe4-b7625b00d6a1
//   AZURE_CLIENT_SECRET — valor do secret
//   MAIL_FROM           — ti@rezendeenergia.com.br
//   MAIL_TO             — ingrid.silva@rezendeenergia.com.br

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { nome, setor, tipo, prioridade, data, descricao, arquivo_nome, arquivo_base64, arquivo_tipo } = body;

  if (!nome || !setor || !tipo || !data || !descricao) {
    return {
      statusCode: 422,
      body: JSON.stringify({ error: "Campos obrigatórios ausentes" }),
    };
  }

  const TENANT_ID     = process.env.AZURE_TENANT_ID;
  const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
  const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
  const MAIL_FROM     = process.env.MAIL_FROM || "ti@rezendeenergia.com.br";
  const MAIL_TO       = process.env.MAIL_TO   || "ingrid.silva@rezendeenergia.com.br";

  // ── 1. Obter access token ──────────────────────────────────────────────────
  let accessToken;
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type:    "client_credentials",
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope:         "https://graph.microsoft.com/.default",
        }),
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Erro ao obter token:", tokenData);
      throw new Error(tokenData.error_description || "Falha na autenticação Azure");
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error("Token error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha na autenticação Azure", detail: err.message }),
    };
  }

  // ── 2. HTML do e-mail ──────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function row(label, value) {
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:38%;vertical-align:top;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${label}</span>
        </td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#222;">${escapeHtml(String(value))}</td>
      </tr>`;
  }

  const prioColors = { Baixa: "#22c55e", Normal: "#3b82f6", Alta: "#f59e0b", Urgente: "#ef4444" };
  const prioColor  = prioColors[prioridade] || "#3b82f6";

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#0A0A0A;padding:28px 36px;border-bottom:3px solid #F97316;">
          <p style="margin:0;font-size:10px;letter-spacing:4px;color:#F97316;text-transform:uppercase;">Rezende Energia</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#F0EDE8;letter-spacing:1px;text-transform:uppercase;">Nova Solicitação de Marketing</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px;">
          <p style="margin:0 0 24px;font-size:14px;color:#555;">Uma nova solicitação foi enviada através do formulário de marketing.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${row("Solicitante", nome)}
            ${row("Setor", setor)}
            ${row("Tipo de Solicitação", tipo)}
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:38%;vertical-align:middle;">
                <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">Prioridade</span>
              </td>
              <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;">
                <span style="display:inline-block;background:${prioColor};color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:100px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(prioridade)}</span>
              </td>
            </tr>
            ${row("Data Desejada", data)}
            ${arquivo_nome ? row("Arquivo Anexado", arquivo_nome) : ""}
          </table>
          <div style="margin-top:28px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;">Descrição</p>
            <div style="background:#f9f9f9;border-left:3px solid #F97316;border-radius:0 6px 6px 0;padding:16px 20px;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${escapeHtml(descricao)}</div>
          </div>
          ${arquivo_nome ? `<p style="margin:24px 0 0;font-size:12px;color:#999;">📎 O arquivo <strong>${escapeHtml(arquivo_nome)}</strong> está anexado neste e-mail.</p>` : ""}
        </td>
      </tr>
      <tr>
        <td style="background:#f9f9f9;padding:18px 36px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">Rezende Construção e Manutenção Ltda &nbsp;·&nbsp; Formulário de Marketing</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  // ── 3. Montar payload Graph API ────────────────────────────────────────────
  const mailPayload = {
    message: {
      subject: `[Marketing] ${tipo} — ${prioridade} | ${setor} (${nome})`,
      body: { contentType: "HTML", content: htmlBody },
      toRecipients: [{ emailAddress: { address: MAIL_TO } }],
      from: { emailAddress: { address: MAIL_FROM } },
    },
    saveToSentItems: false,
  };

  // Adicionar anexo se enviado
  if (arquivo_base64 && arquivo_nome) {
    mailPayload.message.attachments = [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: arquivo_nome,
        contentType: arquivo_tipo || "application/octet-stream",
        contentBytes: arquivo_base64,
      },
    ];
  }

  // ── 4. Enviar ──────────────────────────────────────────────────────────────
  try {
    const sendRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${MAIL_FROM}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mailPayload),
      }
    );

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      console.error("Graph send error:", JSON.stringify(errData));
      throw new Error(errData?.error?.message || `HTTP ${sendRes.status}`);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error("Erro ao enviar e-mail via Graph:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha no envio do e-mail", detail: err.message }),
    };
  }
};
