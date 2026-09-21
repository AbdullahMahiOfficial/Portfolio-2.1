import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Crucial: body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Helper function to validate HTTP/HTTPS URLs safely
  const isValidHttpUrl = (str: unknown): boolean => {
    if (!str || typeof str !== "string") return false;
    const trimmed = str.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  // API Route: Expose public webhook URLs configured securely on backend (Azure App Settings)
  app.get("/api/config", (req, res) => {
    try {
      const rawGoogleWebhook = (process.env.VITE_GOOGLE_SHEET_WEBHOOK || process.env.GOOGLE_SHEET_WEBHOOK || "").trim();
      const rawExcelWebhook = (process.env.VITE_EXCEL_WEBHOOK_URL || process.env.EXCEL_WEBHOOK_URL || "").trim();
      res.status(200).json({
        googleSheetWebhook: isValidHttpUrl(rawGoogleWebhook) ? rawGoogleWebhook : "",
        excelWebhookUrl: isValidHttpUrl(rawExcelWebhook) ? rawExcelWebhook : ""
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch configurations" });
    }
  });

  // API Route: Send automatic replies and handle submissions
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message, ticketRef, googleSheetWebhook, excelWebhookUrl } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Generate random strictly 6-digit fallback serial starting in the 260001+ range
      const activeTicketRef = ticketRef || (Math.floor(260001 + Math.random() * 739999)).toString();

      let smtpHost = (process.env.SMTP_HOST || "smtp.office365.com").trim();
      let smtpPort = Number(process.env.SMTP_PORT) || 587;
      let smtpUser = (process.env.SMTP_USER || "no-reply@abdullahmahiofficial.com").trim();
      let rawSmtpPass = (process.env.SMTP_PASS || "bbsqsxbrtmxxbdcm").trim();

      const stripSurroundingQuotes = (str: string): string => {
        let s = str.trim();
        while (
          (s.startsWith('"') && s.endsWith('"')) ||
          (s.startsWith("'") && s.endsWith("'")) ||
          (s.startsWith('“') && s.endsWith('”')) ||
          (s.startsWith('‘') && s.endsWith('’'))
        ) {
          s = s.substring(1, s.length - 1).trim();
        }
        return s;
      };

      smtpHost = stripSurroundingQuotes(smtpHost);
      smtpUser = stripSurroundingQuotes(smtpUser);
      const smtpPass = stripSurroundingQuotes(rawSmtpPass);

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        requireTLS: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      try {
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SMTP verification timed out after 5000ms")), 5000)
        );
        await Promise.race([verifyPromise, timeoutPromise]);
      } catch (verifyError: any) {
        console.warn("SMTP Verification warning, continuing mail dispatch attempt anyway:", verifyError.message || verifyError);
      }

      const resolvedGoogleWebhook = (googleSheetWebhook || process.env.VITE_GOOGLE_SHEET_WEBHOOK || process.env.GOOGLE_SHEET_WEBHOOK || "").trim();
      const resolvedExcelWebhook = (excelWebhookUrl || process.env.VITE_EXCEL_WEBHOOK_URL || process.env.EXCEL_WEBHOOK_URL || "").trim();

      const runSyncWebhook = async (url: string, platformName: string) => {
        const targetUrl = stripSurroundingQuotes(url);
        if (!targetUrl) return;

        if (!isValidHttpUrl(targetUrl)) {
          console.warn(`[Backend Sync] Skipping ${platformName}: Provided webhook URL is not a valid HTTP/HTTPS URL.`);
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
          const payload = JSON.stringify({
            name,
            email,
            subject,
            message,
            ticketRef: activeTicketRef,
            createdAt: new Date().toISOString()
          });

          let webhookRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            redirect: "manual",
            signal: controller.signal,
            body: payload
          });

          if (webhookRes.status >= 300 && webhookRes.status < 400) {
            const redirectLocation = webhookRes.headers.get("location");
            if (redirectLocation) {
              let redirectUrl = redirectLocation;
              try {
                redirectUrl = new URL(redirectLocation, targetUrl).toString();
              } catch {
                redirectUrl = redirectLocation;
              }
              if (isValidHttpUrl(redirectUrl)) {
                webhookRes = await fetch(redirectUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  redirect: "manual",
                  signal: controller.signal,
                  body: payload
                });
              }
            }
          }
          clearTimeout(timeoutId);
        } catch (webhookErr: any) {
          clearTimeout(timeoutId);
          console.error(`[Backend Sync] Failed sending to ${platformName}:`, webhookErr.message || webhookErr);
        }
      };

      // Plaintext body for sender's auto-reply
      const clientText = `Dear ${name},


Thank you for contacting me through my professional portfolio.

Your message has been successfully received, and I sincerely appreciate your interest in connecting. Whether you are reaching out regarding career opportunities, cloud and infrastructure projects, Microsoft technologies, DevOps initiatives, digital transformation, consulting services, partnerships, or professional collaboration, your inquiry is important to me.

I personally review every message to ensure a thoughtful and meaningful response. I am currently evaluating your request and will typically respond within 24–48 business hours.

I strongly believe that great opportunities are built through meaningful conversations, shared ideas, and trusted professional relationships. Whether you're exploring new technology initiatives, seeking technical expertise, discussing potential collaborations, or considering me for a role within your organization, I look forward to learning more about your objectives and finding ways to create value together.

Thank you once again for your time, trust, and interest. I appreciate the opportunity to connect and look forward to our conversation.

Sincerely,
Solution Architect | Cloud & Infrastructure Engineer
hello@abdullahmahiofficial.com

WhatsApp: https://wa.me/AbdullahMahiOfficial
Website: https://abdullahmahiofficial.com`;

      // HTML body for sender's auto-reply with justify alignment and modern spacing
      const clientHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.7;">
          <p style="margin-top: 0; font-size: 15px; text-align: left;">Dear <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px; text-align: justify; text-justify: inter-word; margin-bottom: 16px;">Thank you for contacting me through my professional portfolio.</p>
          
          <p style="font-size: 15px; text-align: justify; text-justify: inter-word; margin-bottom: 16px;">Your message has been successfully received, and I sincerely appreciate your interest in connecting. Whether you are reaching out regarding career opportunities, cloud and infrastructure projects, Microsoft technologies, DevOps initiatives, digital transformation, consulting services, partnerships, or professional collaboration, your inquiry is important to me.</p>
          
          <p style="font-size: 15px; text-align: justify; text-justify: inter-word; margin-bottom: 16px;">I personally review every message to ensure a thoughtful and meaningful response. I am currently evaluating your request and will typically respond within 24–48 business hours.</p>
          
          <p style="font-size: 15px; text-align: justify; text-justify: inter-word; margin-bottom: 16px;">I strongly believe that great opportunities are built through meaningful conversations, shared ideas, and trusted professional relationships. Whether you're exploring new technology initiatives, seeking technical expertise, discussing potential collaborations, or considering me for a role within your organization, I look forward to learning more about your objectives and finding ways to create value together.</p>
          
          <p style="font-size: 15px; text-align: justify; text-justify: inter-word; margin-bottom: 24px;">Thank you once again for your time, trust, and interest. I appreciate the opportunity to connect and look forward to our conversation.</p>
          
          <p style="margin-top: 32px; margin-bottom: 0; font-size: 15px; text-align: left;">Best regards,</p>
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0f172a; text-align: left;">Solution Architect | Cloud & Infrastructure Engineer</p>
          <p style="margin: 0; font-size: 15px; margin-bottom: 20px; text-align: left;"><a href="mailto:hello@abdullahmahiofficial.com" style="color: #0284c7; text-decoration: none; font-weight: 500;">hello@abdullahmahiofficial.com</a></p>
          
          <table cellspacing="0" cellpadding="0" border="0" style="margin-top: 8px;">
            <tr>
              <td style="padding-right: 12px; vertical-align: middle;">
                <a href="https://wa.me/AbdullahMahiOfficial" target="_blank" style="text-decoration: none; display: inline-block;">
                  <table cellspacing="0" cellpadding="0" border="0" style="background-color: #25D366; border-radius: 4px;">
                    <tr>
                      <td style="padding: 9px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #ffffff; text-align: center; vertical-align: middle; border-radius: 4px;">
                        WhatsApp
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
              <td style="vertical-align: middle;">
                <a href="https://abdullahmahiofficial.com" target="_blank" style="text-decoration: none; display: inline-block;">
                  <table cellspacing="0" cellpadding="0" border="0" style="background-color: #0284c7; border-radius: 4px;">
                    <tr>
                      <td style="padding: 9px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: bold; color: #ffffff; text-align: center; vertical-align: middle; border-radius: 4px;">
                        Website
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
          </table>
        </div>
      `;

      const clientMailOptions = {
        from: `"Abdullah Mahi Official System" <${smtpUser}>`,
        to: email,
        subject: `Message Received: Thank you for connecting | TICKET REF: ${activeTicketRef}`,
        text: clientText,
        html: clientHtml
      };

      const adminText = `⚡ New Portfolio Lead Captured | Ticket Ref ${activeTicketRef}
Name: ${name}
Email: ${email}
Subject: ${subject}
Message: "${message}"`;

      const adminMailOptions = {
        from: `"Portfolio Alerts" <${smtpUser}>`,
        to: smtpUser,
        subject: `⚡ New Portfolio Lead Captured: ${subject} | Ticket Ref ${activeTicketRef}`,
        text: adminText
      };

      let smtpClientError: string | null = null;
      let smtpAdminError: string | null = null;

      await Promise.all([
        transporter.sendMail(clientMailOptions).catch((err) => { smtpClientError = err.message; }),
        transporter.sendMail(adminMailOptions).catch((err) => { smtpAdminError = err.message; })
      ]);

      await Promise.allSettled([
        runSyncWebhook(resolvedGoogleWebhook, "Google Sheets"),
        runSyncWebhook(resolvedExcelWebhook, "Microsoft Excel")
      ]);

      if (smtpClientError || smtpAdminError) {
        return res.status(200).json({
          success: true,
          partialFailure: true,
          message: `Submission received, but email delivery had issues.`
        });
      }

      return res.status(200).json({ success: true, message: "Emails sent successfully" });
    } catch (err: any) {
      console.error("API endpoint general failure:", err);
      return res.status(500).json({ error: "System contact routing failed: " + err.message });
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const possiblePaths = [
      path.join(process.cwd(), "dist"),
      process.cwd()
    ];
    let distPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, "index.html"))) {
        distPath = p;
        break;
      }
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();