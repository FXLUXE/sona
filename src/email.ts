// email.ts — Sona branded HTML email shell.
// Returns a complete, responsive, table-based HTML email document.
// Callers are responsible for HTML-escaping any untrusted content they pass in bodyHtml.

export interface EmailShellOpts {
  title: string;
  bodyHtml: string;
  preheader?: string;
  cta?: { label: string; url: string };
}

export function emailShell({ title, bodyHtml, preheader, cta }: EmailShellOpts): string {
  // CTA button: table-cell wraps the <a> so background + border-radius work in Outlook.
  // background-color fallback (#c79a4b) kicks in when CSS gradients are blocked.
  const ctaBlock = cta
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#c79a4b 0%,#b07f33 100%);background-color:#c79a4b;border-radius:10px;mso-padding-alt:0">
                  <a href="${cta.url.replace(/"/g, "%22")}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.01em;white-space:nowrap;mso-hide:all">${cta.label}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : ``;

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
<style>
/* Reset */
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
/* Mobile */
@media only screen and (max-width:600px){
  .em-wrap{padding:0 12px!important}
  .em-card{border-radius:0!important;border-left:none!important;border-right:none!important}
  .em-body{padding:26px 20px 22px!important}
  .em-foot{padding:16px 20px 20px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#f6f1e9;color:#11212b;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
${preheader ? `<!--[if !mso]><!--><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div><!--<![endif]-->` : ``}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f1e9;padding:32px 0 48px">
<tr><td align="center" class="em-wrap" style="padding:0 20px">

  <!-- Logo lockup -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin-bottom:18px">
  <tr><td style="padding:0 2px">
    <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <!-- "S" mark: rounded box, brass gradient, white letter -->
      <td width="34" height="34" style="width:34px;height:34px;min-width:34px;background:linear-gradient(135deg,#c79a4b 0%,#b07f33 100%);background-color:#c79a4b;border-radius:9px;text-align:center;vertical-align:middle;line-height:34px;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-.01em">
        S
      </td>
      <!-- Wordmark -->
      <td style="padding-left:9px;vertical-align:middle;white-space:nowrap">
        <span style="font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#11212b">Sona</span>
      </td>
    </tr>
    </table>
  </td></tr>
  </table>

  <!-- Email card -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="em-card" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e3dccf">
  <tr>
    <td class="em-body" style="padding:32px 36px 26px">
      ${bodyHtml}
      ${ctaBlock}
    </td>
  </tr>
  <!-- Footer strip -->
  <tr>
    <td class="em-foot" style="padding:18px 36px 22px;border-top:1px solid #ece6da">
      <p style="margin:0 0 5px;font-size:12px;color:#9aa3ac;text-align:center;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif">
        <strong style="color:#6b7280;font-weight:600">Sona</strong>&nbsp;&middot;&nbsp;<a href="https://asksona.co.uk" style="color:#9aa3ac;text-decoration:none">asksona.co.uk</a>
      </p>
      <p style="margin:0;font-size:11px;color:#b8bec4;text-align:center;font-family:system-ui,-apple-system,Helvetica,Arial,sans-serif">
        You're receiving this because you use Sona.&nbsp;
        <a href="mailto:hello@asksona.co.uk" style="color:#b8bec4;text-decoration:underline">Contact us</a> to update your preferences.
      </p>
    </td>
  </tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}
