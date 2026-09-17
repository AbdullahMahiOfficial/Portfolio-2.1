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

      // 1. Send automatic reply to the sender using nodemailer with Office 365.
      // Use fallback defaults from user if prompt envs are not explicitly set
      let smtpHost = (process.env.SMTP_HOST || "smtp.office365.com").trim();
      let smtpPort = Number(process.env.SMTP_PORT) || 587;
      let smtpUser = (process.env.SMTP_USER || "no-reply@abdullahmahiofficial.com").trim();
      let rawSmtpPass = (process.env.SMTP_PASS || "bbsqsxbrtmxxbdcm").trim();

      // Helper function to thoroughly strip surrounding quotes (single, double, curly, smart quotes)
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

      // Safe Diagnostic Log
      console.log(`[SMTP Config Diagnosis]`);
      console.log(`- Host: ${smtpHost}`);
      console.log(`- Port: ${smtpPort}`);
      console.log(`- User: ${smtpUser}`);
      console.log(`- Pass length: ${smtpPass.length}`);
      console.log(`- Pass prefix: ${smtpPass ? smtpPass.substring(0, 3) + '...' : 'none'}`);

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // true for 465, false for 587 (STARTTLS)
        requireTLS: true,
        connectionTimeout: 10000, // 10 seconds connection timeout
        greetingTimeout: 10000,    // 10 seconds greeting timeout
        socketTimeout: 15000,      // 15 seconds socket timeout
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration with a safety timeout
      try {
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SMTP verification timed out after 5000ms")), 5000)
        );
        await Promise.race([verifyPromise, timeoutPromise]);
      } catch (verifyError: any) {
        console.warn("SMTP Verification warning, continuing mail dispatch attempt anyway:", verifyError.message || verifyError);
      }

      // Current Timestamp for Dhaka / Bangladesh timezone
      const timestampDhaka = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
        dateStyle: "medium",
        timeStyle: "medium"
      }) + " (Dhaka Time)";

      // Secure server-side forward to Google Sheets & Microsoft Excel using request payload hooks or environment variables
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
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6-second timeout limit to preserve performance

        try {
          console.log(`[Backend Sync] Forwarding submission to ${platformName} (URL: ${targetUrl.substring(0, 45)}...)...`);
          
          const payload = JSON.stringify({
            name,
            email,
            subject,
            message,
            ticketRef: activeTicketRef,
            createdAt: new Date().toISOString()
          });

          // CRITICAL: Set redirect to "manual". Google Apps Script returns a 302 redirect.
          // By default, standard Fetch will redirect using GET and discard the POST body.
          // We intercept the 302 and manually dispatch another POST request to preserve the payload!
          let res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            redirect: "manual",
            signal: controller.signal,
            body: payload
          });

          if (res.status >= 300 && res.status < 400) {
            const redirectLocation = res.headers.get("location");
            if (redirectLocation) {
              let redirectUrl = redirectLocation;
              try {
                redirectUrl = new URL(redirectLocation, targetUrl).toString();
              } catch {
                redirectUrl = redirectLocation;
              }
              if (isValidHttpUrl(redirectUrl)) {
                console.log(`[Backend Sync] Intercepted redirect (Status: ${res.status}). Manually dispatching POST payload to target: ${redirectUrl.substring(0, 45)}...`);
                res = await fetch(redirectUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  redirect: "manual",
                  signal: controller.signal,
                  body: payload
                });
              }
            }
          }

          clearTimeout(timeoutId);
          console.log(`[Backend Sync] Finished sending to ${platformName} (Status: ${res.status})`);
        } catch (webhookErr: any) {
          clearTimeout(timeoutId);
          console.error(`[Backend Sync] Failed sending to ${platformName}:`, webhookErr.name === 'AbortError' ? 'Request timed out after 6000ms' : (webhookErr.message || webhookErr));
        }
      };

      // Plaintext body for sender's auto-reply (clean of any raw numbers or outage paragraphs, with beautiful footer links)
      const clientText = `Dear ${name},

Thank you for initiating contact through my professional portfolio portal. 

This automated communication serves to confirm that your transmission has been securely received, validated, and successfully routed to my primary operations queue. I appreciate you taking the time to share your details and explore my professional background.

I treat all professional inquiries, project proposals, and technical consultations with the utmost priority. I am currently evaluating the parameters of your message and will provide a formal, comprehensive response within 24 to 48 business hours to discuss how we can strategically drive your initiatives forward.

Thank you once again for your interest, engagement, and professional connection. I look forward to our upcoming collaboration.

Best regards,
Solution Architect & IT Infrastructure Practitioner
hello@abdullahmahiofficial.com

WhatsApp: https://wa.me/AbdullahMahiOfficial
Website: https://abdullahmahiofficial.com

----------------------------------------------------------------------
CREDENTIALS: AZURE ARCHITECT • DEVOPS ENGINEER • CKA KUBERNETES
----------------------------------------------------------------------
This is an automated system notification generated by the portfolio communication engine.`;

      // HTML body for sender's auto-reply
      const clientHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px;">Thank you for initiating contact through my professional portfolio portal.</p>
          
          <p style="font-size: 15px;">This automated communication serves to confirm that your transmission has been securely received, validated, and successfully routed to my primary operations queue. I appreciate you taking the time to share your details and explore my professional background.</p>
          
          <div style="background-color: #f8fafc; border-left: 3px solid #0284c7; border-radius: 4px; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">🔒 Operations Routing Secured</p>
            <p style="margin: 4px 0 0 0; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #0284c7; font-weight: bold;">TICKET REF: ${activeTicketRef}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Status: Securely Logged &bull; Assigned to Solutions Architect</p>
          </div>
          
          <p style="font-size: 15px;">I treat all professional inquiries, project proposals, and technical consultations with the utmost priority. I am currently evaluating the parameters of your message and will provide a formal, comprehensive response within 24 to 48 business hours to discuss how we can strategically drive your initiatives forward.</p>
          
          <p style="font-size: 15px;">Thank you once again for your interest, engagement, and professional connection. I look forward to our upcoming collaboration.</p>
          
          <p style="margin-top: 32px; margin-bottom: 0; font-size: 15px;">Best regards,</p>
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0f172a;">Solution Architect & IT Infrastructure Practitioner</p>
          <p style="margin: 0; font-size: 15px; margin-bottom: 12px;"><a href="mailto:hello@abdullahmahiofficial.com" style="color: #0284c7; text-decoration: none; font-weight: 500;">hello@abdullahmahiofficial.com</a></p>
          
          <table cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px;">
            <tr>
              <td style="padding-right: 12px; vertical-align: middle;">
                <a href="https://wa.me/AbdullahMahiOfficial" target="_blank" style="text-decoration: none; display: inline-block;">
                  <table cellspacing="0" cellpadding="0" border="0" style="background-color: #25D366; border-radius: 4px;">
                    <tr>
                      <td style="padding: 7px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #ffffff; text-align: center; vertical-align: middle; border-radius: 4px; display: inline-flex; align-items: center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="14" height="14" alt="WhatsApp" style="border: 0; margin-right: 6px; display: inline-block; vertical-align: middle;" />
                        <span style="vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">WhatsApp</span>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
              <td style="vertical-align: middle;">
                <a href="https://abdullahmahiofficial.com" target="_blank" style="text-decoration: none; display: inline-block;">
                  <table cellspacing="0" cellpadding="0" border="0" style="background-color: #0284c7; border-radius: 4px;">
                    <tr>
                      <td style="padding: 7px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold; color: #ffffff; text-align: center; vertical-align: middle; border-radius: 4px; display: inline-flex; align-items: center;">
                        <span style="font-size: 13px; margin-right: 6px; line-height: 1; vertical-align: middle;">🌐</span>
                        <span style="vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">Website</span>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 40px; text-align: center;">
            <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0; letter-spacing: 0.5px; text-transform: uppercase;">CREDENTIALS: AZURE ARCHITECT &bull; DEVOPS ENGINEER &bull; CKA KUBERNETES</p>
            <p style="font-size: 11px; color: #94a3b8; font-style: italic; margin: 6px 0 0 0;">This is an automated system notification generated by the portfolio communication engine.</p>
          </div>
        </div>
      `;

      const clientMailOptions = {
        from: `"Abdullah Mahi Official System" <${smtpUser}>`,
        to: email, // Send to the form-filler
        subject: `Message Received: Thank you for connecting | TICKET REF: ${activeTicketRef}`,
        text: clientText,
        html: clientHtml
      };

      // Plaintext and HTML templates for Admin notification
      const adminText = `⚡ New Portfolio Lead Captured | Ticket Ref ${activeTicketRef}

Sender Information:
--------------------------------------------------
Sender Name:    ${name}
Email Address:  ${email}
Subject Line:   ${subject}
Timestamp:      ${timestampDhaka}
--------------------------------------------------

Message Content:
"${message}"

---
System Notification Engine | Portfolio Platform Alert`;

      const adminHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fca5a5; border-radius: 8px; background-color: #fef2f2; color: #1e293b; line-height: 1.6;">
          <h2 style="color: #991b1b; margin-top: 0; font-size: 17px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #fee2e2; padding-bottom: 12px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span>⚡</span> New Portfolio Lead Captured
            </span>
            <span style="font-size: 14px; font-weight: bold; color: #b91c1c; white-space: nowrap;">| Ticket Ref ${activeTicketRef}</span>
          </h2>
          
          <p style="font-weight: bold; font-size: 14px; color: #475569; margin-bottom: 6px;">Sender Information:</p>
          <div style="background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 6px; padding: 16px; margin: 0 0 20px 0; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 13px;">
            <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: inherit;">
              <tr>
                <td style="width: 130px; font-weight: bold; color: #64748b; padding: 4px 0;">Sender Name:</td>
                <td style="color: #0f172a; padding: 4px 0;">${name}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Email Address:</td>
                <td style="color: #0f172a; padding: 4px 0;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Subject Line:</td>
                <td style="color: #0f172a; padding: 4px 0;">${subject}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #64748b; padding: 4px 0;">Timestamp:</td>
                <td style="color: #0f172a; padding: 4px 0;">${timestampDhaka}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-weight: bold; font-size: 14px; color: #475569; margin-bottom: 6px;">Message Content:</p>
          <div style="background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 6px; padding: 16px; margin: 0 0 20px 0; font-size: 14px; color: #0f172a; font-style: italic;">
            "${message}"
          </div>
          
          <div style="border-top: 1px solid #fee2e2; margin: 20px 0 10px 0;"></div>
          <p style="font-size: 11px; color: #94a3b8; font-weight: 500; margin: 0;">System Notification Engine | Portfolio Platform Alert</p>
        </div>
      `;

      // HTML body for Admin notification
      const adminMailOptions = {
        from: `"Portfolio Alerts" <${smtpUser}>`,
        to: smtpUser, // Send notification to the main box
        subject: `⚡ New Portfolio Lead Captured: ${subject} | Ticket Ref ${activeTicketRef}`,
        text: adminText,
        html: adminHtml
      };

      // Send both the client auto-reply and admin notification independently
      let smtpClientError: string | null = null;
      let smtpAdminError: string | null = null;

      console.log(`[SMTP] Dispatching emails for Ticket Ref: ${activeTicketRef}...`);
      
      const emailPromises = [
        (async () => {
          try {
            console.log(`[SMTP] Sending client auto-reply to: ${email}...`);
            const clientInfo = await transporter.sendMail(clientMailOptions);
            console.log(`[SMTP] Client auto-reply sent successfully: ${clientInfo.messageId}`);
          } catch (mailErr: any) {
            console.error("[SMTP] Client Auto-Reply Mail Failed:", mailErr);
            smtpClientError = mailErr.message || "Failed to deliver client auto-reply";
          }
        })(),
        (async () => {
          try {
            console.log(`[SMTP] Sending system admin notification to: ${smtpUser}...`);
            const adminInfo = await transporter.sendMail(adminMailOptions);
            console.log(`[SMTP] System admin notification sent successfully: ${adminInfo.messageId}`);
          } catch (adminErr: any) {
            console.error("[SMTP] System Admin Mail Notification Failed:", adminErr);
            smtpAdminError = adminErr.message || "Failed to deliver system admin alert";
          }
        })()
      ];

      // Await both dispatches to ensure they finish before responding to the request
      await Promise.all(emailPromises);

      // ONLY AFTER SMTP MAIL LOGIC completes, we synchronize with external database webhooks.
      // Doing this afterward prevents slow or unreachable Google/Excel webhooks from ever delaying or breaking the SMTP mail routing.
      console.log(`[Backend Sync] Starting concurrent webhook updates (Google Sheets & Excel) AFTER emails dispatched...`);
      await Promise.allSettled([
        runSyncWebhook(resolvedGoogleWebhook, "Google Sheets"),
        runSyncWebhook(resolvedExcelWebhook, "Microsoft Excel")
      ]);
      console.log(`[Backend Sync] All webhooks finalized.`);

      if (smtpClientError || smtpAdminError) {
        const errorMsg = [
          smtpClientError ? `Client auto-reply failed: ${smtpClientError}` : null,
          smtpAdminError ? `Admin alert failed: ${smtpAdminError}` : null
        ].filter(Boolean).join(" | ");

        return res.status(200).json({
          success: true,
          partialFailure: true,
          error: errorMsg,
          message: `Submission received and logged, but email delivery was incomplete: ${errorMsg}`
        });
      }

      return res.status(200).json({ success: true, message: "Automatic reply and admin system alert mails sent successfully" });
    } catch (err: any) {
      console.error("API endpoint general failure:", err);
      return res.status(500).json({ error: "System contact routing failed: " + err.message });
    }
  });

  // Serve static assets / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust resolution: check if we are deployed with flat dist contents unpacked at root (like Azure App Service artifact), or standard nested folders
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
