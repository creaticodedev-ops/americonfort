import nodemailer from "nodemailer";
import { defaultAgencyName } from "../utils/brand.js";

let transporter = null;
let verifiedOk = false;
let lastVerifyError = null;

const stripQuotes = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

/** Gmail app passwords are often copied with spaces — strip them. */
const normalizePass = (value) => stripQuotes(value).replace(/\s+/g, "");

const log = (level, message, meta) => {
  const prefix = "[email]";
  if (meta !== undefined) {
    console[level](prefix, message, meta);
  } else {
    console[level](prefix, message);
  }
};

export const getSmtpConfigSummary = () => {
  const host = stripQuotes(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = stripQuotes(process.env.SMTP_USER);
  const passSet = Boolean(normalizePass(process.env.SMTP_PASS));
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  return {
    configured: Boolean(host && user && passSet),
    host: host || null,
    port,
    secure,
    user: user || null,
    from: stripQuotes(process.env.SMTP_FROM) || user || null,
    verified: verifiedOk,
    lastVerifyError,
  };
};

/**
 * Build From header. For providers like Gmail the envelope address should
 * match the authenticated mailbox (or a verified alias).
 */
export const resolveFromAddress = () => {
  const agency = defaultAgencyName();
  const user = stripQuotes(process.env.SMTP_USER);
  const rawFrom = stripQuotes(process.env.SMTP_FROM);

  let name = agency;
  let email = user;

  if (rawFrom) {
    const angled = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
    if (angled) {
      name = angled[1].trim().replace(/^["']|["']$/g, "") || agency;
      email = angled[2].trim();
    } else if (rawFrom.includes("@")) {
      email = rawFrom;
    }
  }

  // Prevent common typo: user@gmail.com.com
  if (email?.endsWith(".com.com")) {
    log("warn", `Correcting invalid From domain: ${email}`);
    email = email.replace(/\.com\.com$/, ".com");
  }

  // Gmail / Google Workspace: From must be the auth user unless SMTP_ALLOW_CUSTOM_FROM=true
  const allowCustom = String(process.env.SMTP_ALLOW_CUSTOM_FROM || "").toLowerCase() === "true";
  if (!allowCustom && user && email && email.toLowerCase() !== user.toLowerCase()) {
    log(
      "warn",
      `SMTP_FROM (${email}) differs from SMTP_USER (${user}). Using SMTP_USER as From to avoid provider rejection.`
    );
    email = user;
  }

  if (!email) {
    email = "noreply@localhost";
  }

  return { name, email, formatted: `"${name}" <${email}>` };
};

export const getTransporter = async ({ forceNew = false } = {}) => {
  if (transporter && !forceNew) return transporter;

  const host = stripQuotes(process.env.SMTP_HOST);
  const user = stripQuotes(process.env.SMTP_USER);
  const pass = normalizePass(process.env.SMTP_PASS);
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  if (!host || !user || !pass) {
    log("warn", "SMTP not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS)");
    return null;
  }

  const options = {
    host,
    port,
    secure,
    auth: { user, pass },
    // Helpful for port 587 STARTTLS
    requireTLS: !secure && port === 587,
    tls: {
      // Keep true in production; allow override for local/dev relays
      rejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    logger: String(process.env.SMTP_DEBUG || "").toLowerCase() === "true",
    debug: String(process.env.SMTP_DEBUG || "").toLowerCase() === "true",
  };

  transporter = nodemailer.createTransport(options);
  verifiedOk = false;
  lastVerifyError = null;

  try {
    await transporter.verify();
    verifiedOk = true;
    log("log", `SMTP transporter verified → ${host}:${port} as ${user}`);
  } catch (error) {
    lastVerifyError = error.message;
    verifiedOk = false;
    log("error", `SMTP verify FAILED → ${host}:${port}`, error.message);
    // Keep transporter — some servers reject verify() but still accept sendMail.
    // Callers must inspect sendMail accepted/rejected carefully.
  }

  return transporter;
};

/**
 * Send email with real delivery checks.
 * success=true only when the SMTP server accepted the recipient.
 */
export const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  const recipient = String(to || "").trim().toLowerCase();
  if (!recipient || !recipient.includes("@")) {
    log("error", "Refusing send: invalid recipient", { to });
    return { success: false, skipped: false, reason: "Invalid recipient email", to };
  }

  const tx = await getTransporter();
  if (!tx) {
    return {
      success: false,
      skipped: true,
      reason: "SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in server/.env)",
      to: recipient,
    };
  }

  const from = resolveFromAddress();
  const mail = {
    from: from.formatted,
    to: recipient,
    subject,
    html,
    text: text || String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    attachments,
    // Envelope helps some providers
    envelope: {
      from: from.email,
      to: recipient,
    },
  };

  log("log", "Sending mail…", {
    to: recipient,
    from: from.formatted,
    subject,
    attachmentCount: attachments?.length || 0,
    smtpVerified: verifiedOk,
  });

  try {
    const info = await tx.sendMail(mail);

    const accepted = (info.accepted || []).map(String);
    const rejected = (info.rejected || []).map(String);
    const pending = (info.pending || []).map(String);
    const recipientAccepted =
      accepted.some((a) => a.toLowerCase().includes(recipient)) ||
      (accepted.length > 0 && rejected.length === 0);

    log("log", "sendMail response", {
      messageId: info.messageId,
      response: info.response,
      accepted,
      rejected,
      pending,
      envelope: info.envelope,
    });

    if (!recipientAccepted || rejected.length > 0) {
      const reason =
        rejected.length > 0
          ? `SMTP rejected recipient(s): ${rejected.join(", ")}`
          : "SMTP did not accept the recipient address";
      log("error", reason, { to: recipient, response: info.response });
      return {
        success: false,
        skipped: false,
        reason,
        to: recipient,
        messageId: info.messageId,
        response: info.response,
        accepted,
        rejected,
      };
    }

    log("log", `Email ACCEPTED by SMTP for ${recipient} (messageId=${info.messageId})`);
    return {
      success: true,
      skipped: false,
      to: recipient,
      messageId: info.messageId,
      response: info.response,
      accepted,
      rejected,
      from: from.formatted,
    };
  } catch (error) {
    log("error", "sendMail threw", {
      to: recipient,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return {
      success: false,
      skipped: false,
      reason: error.message,
      code: error.code,
      to: recipient,
    };
  }
};

export const sendCompletionInviteEmail = async ({
  to,
  customerName,
  reservationId,
  completionUrl,
  vehicle,
  pickupDate,
  returnDate,
  total,
  currency = "MAD",
}) => {
  const agency = defaultAgencyName();
  const subject = `${agency} — Complete your reservation ${reservationId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#161210">
      <h1 style="font-size:22px;color:#8F1F1F">${agency}</h1>
      <p>Hello ${customerName || "Customer"},</p>
      <p>Your reservation <strong>${reservationId}</strong> has been confirmed.</p>
      <p>Please complete the following to finalize your booking:</p>
      <ul>
        <li>Upload your driving license</li>
        <li>Upload a national ID or passport</li>
        <li>Pay the deposit or full amount online</li>
        <li>Sign the rental agreement digitally</li>
      </ul>
      <p><strong>Vehicle:</strong> ${vehicle || "—"}<br/>
      <strong>Pickup:</strong> ${pickupDate || "—"}<br/>
      <strong>Return:</strong> ${returnDate || "—"}<br/>
      <strong>Total:</strong> ${currency}${total ?? "—"}</p>
      <p style="margin:28px 0">
        <a href="${completionUrl}" style="background:#8F1F1F;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">
          Complete your booking securely
        </a>
      </p>
      <p style="font-size:12px;color:#6B6560">This secure link expires in a few days. If you did not make this reservation, ignore this email.</p>
      <p style="font-size:11px;color:#999">If the button does not work, copy this link:<br/>${completionUrl}</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

export const sendFinalConfirmationEmail = async ({
  to,
  customerName,
  reservationId,
  vehicle,
  detailsHtml,
  contractPath,
  invoicePath,
}) => {
  const agency = defaultAgencyName();
  const subject = `${agency} — Ready for pickup · ${reservationId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#161210">
      <h1 style="font-size:22px;color:#8F1F1F">${agency}</h1>
      <p>Hello ${customerName || "Customer"},</p>
      <p>Thank you. Your reservation <strong>${reservationId}</strong> is now <strong>Ready for Pickup</strong>.</p>
      <p><strong>Vehicle:</strong> ${vehicle || "—"}</p>
      ${detailsHtml || ""}
      <p>Your signed rental contract is attached.</p>
      <p style="font-size:12px;color:#6B6560">Please bring your original documents when collecting the vehicle.</p>
    </div>
  `;

  const attachments = [];
  if (contractPath) {
    attachments.push({ filename: `contract-${reservationId}.pdf`, path: contractPath });
  }

  return sendEmail({ to, subject, html, attachments });
};

/** Admin diagnostics — verify SMTP without sending. */
export const verifyEmailTransport = async () => {
  transporter = null;
  verifiedOk = false;
  lastVerifyError = null;
  const tx = await getTransporter({ forceNew: true });
  const summary = getSmtpConfigSummary();
  if (!tx) {
    return { success: false, ...summary, reason: "SMTP not configured" };
  }
  return {
    success: verifiedOk,
    ...summary,
    reason: verifiedOk ? "SMTP connection verified" : lastVerifyError || "Verify failed",
  };
};

export default sendEmail;
