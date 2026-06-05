// netlify/functions/send-email.js
// Dependência: nodemailer
// Configure as variáveis de ambiente no painel do Netlify:
//   SMTP_HOST     — ex: smtp.office365.com
//   SMTP_PORT     — ex: 587
//   SMTP_USER     — e-mail remetente (ex: ti@rezendeenergia.com.br)
//   SMTP_PASS     — senha ou App Password
//   MAIL_TO       — marketing@rezendeenergia.com.br

const nodemailer = require("nodemailer");

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

  const { nome, setor, tipo, prioridade, data, descricao, arquivo_nome } = body;

  if (!nome || !setor || !tipo || !data || !descricao) {
    return {
      statusCode: 422,
      body: JSON.stringify({ error: "Campos obrigatórios ausentes" }),
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0A0A0A;padding:28px 36px;border-bottom:3px solid #F97316;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F97316;width:44px;height:44px;text-align:center;vertical-align:middle;clip-path:polygon(10% 0%,100% 0%,90% 100%,0% 100%);display:inline-block;">
                  <span style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#000;padding-left:4px;">R</span>
                </td>
                <td style="padding-left:16px;vertical-align:middle;">
                  <p style="margin:0;font-size:10px;letter-spacing:4px;color:#F97316;text-transform:uppercase;">Rezende Energia</p>
                  <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#F0EDE8;letter-spacing:1px;text-transform:uppercase;">Nova Solicitação de Marketing</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px;">
            <p style="margin:0 0 24px;font-size:14px;color:#555;">Uma nova solicitação foi enviada através do formulário de marketing.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${row("Solicitante", nome)}
              ${row("Setor", setor)}
              ${row("Tipo de Solicitação", tipo)}
              ${priorityRow(prioridade)}
              ${row("Data Desejada", data)}
              ${arquivo_nome ? row("Arquivo Anexado", arquivo_nome) : ""}
            </table>
            <div style="margin-top:28px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999;">Descrição</p>
              <div style="background:#f9f9f9;border-left:3px solid #F97316;border-radius:0 6px 6px 0;padding:16px 20px;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${escapeHtml(descricao)}</div>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 36px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">Rezende Construção e Manutenção Ltda &nbsp;·&nbsp; Uso interno &nbsp;·&nbsp; Formulário de Marketing</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  function row(label, value) {
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:40%;vertical-align:top;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${label}</span>
        </td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#222;">${escapeHtml(String(value))}</td>
      </tr>`;
  }

  function priorityRow(prio) {
    const colors = { Baixa: "#22c55e", Normal: "#3b82f6", Alta: "#f59e0b", Urgente: "#ef4444" };
    const color = colors[prio] || "#3b82f6";
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:40%;vertical-align:top;">
          <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">Prioridade</span>
        </td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;">
          <span style="display:inline-block;background:${color};color:#fff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:100px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(prio)}</span>
        </td>
      </tr>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const textBody = `
NOVA SOLICITAÇÃO DE MARKETING — REZENDE ENERGIA
================================================
Solicitante : ${nome}
Setor       : ${setor}
Tipo        : ${tipo}
Prioridade  : ${prioridade}
Data        : ${data}
Arquivo     : ${arquivo_nome || "Nenhum"}

Descrição:
${descricao}
================================================
Rezende Construção e Manutenção Ltda — Uso interno
  `.trim();

  try {
    await transporter.sendMail({
      from: `"Formulário de Marketing" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO || "ingrid.silva@rezendeenergia.com.br",
      replyTo: process.env.SMTP_USER,
      subject: `[Marketing] ${tipo} — ${prioridade} | ${setor} (${nome})`,
      text: textBody,
      html: htmlBody,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha no envio do e-mail", detail: err.message }),
    };
  }
};
