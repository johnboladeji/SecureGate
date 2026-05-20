export function VerificationEmail(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your SecureGate email</title>
  </head>
  <body style="background-color:#0a0a0a;font-family:system-ui,sans-serif;margin:0;padding:0">
    <table role="presentation" style="max-width:560px;margin:0 auto;padding:40px 24px;color:#fafafa" width="100%">
      <tr>
        <td>
          <h1 style="font-size:24px;font-weight:600;color:#fafafa;margin:0 0 16px">Welcome to SecureGate</h1>
          <p style="font-size:16px;line-height:24px;color:#d4d4d8;margin:0 0 16px">Hi ${name},</p>
          <p style="font-size:16px;line-height:24px;color:#d4d4d8;margin:0 0 16px">Click the button below to verify your email. This link expires in 15 minutes.</p>
          <table role="presentation" style="text-align:center;margin:32px 0" width="100%">
            <tr>
              <td>
                <a href="${verifyUrl}" style="background-color:#22c55e;color:#052e16;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Verify Email</a>
              </td>
            </tr>
          </table>
          <p style="font-size:14px;line-height:20px;color:#a1a1aa;margin:0 0 8px">Or paste this URL into your browser: ${verifyUrl}</p>
          <p style="font-size:14px;line-height:20px;color:#a1a1aa;margin:0">If you did not create a SecureGate account, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
