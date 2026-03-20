import * as process from 'node:process'
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'

const DEFAULT_APP_NAME = 'ZeroRoku'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required for password reset emails.`)
  }
  return value
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function createSesClient(): SESClient {
  const region = process.env.AUTH_EMAIL_AWS_REGION?.trim() || process.env.AWS_REGION?.trim()
  if (!region) {
    throw new Error('AUTH_EMAIL_AWS_REGION or AWS_REGION is required for password reset emails.')
  }
  return new SESClient({ region })
}

function createResetPasswordHtml(appName: string, resetUrl: string): string {
  const safeAppName = escapeHtml(appName)
  const safeResetUrl = escapeHtml(resetUrl)
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="UTF-8">',
    `  <title>${safeAppName} 重置密码</title>`,
    '</head>',
    '<body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">',
    '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;">',
    '    <tr>',
    '      <td style="padding:32px 28px;">',
    `        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;">${safeAppName} 密码重置</h1>`,
    '        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;">你收到这封邮件，是因为有人请求重置你在本站的登录密码。</p>',
    '        <p style="margin:0 0 20px;font-size:14px;line-height:1.7;">点击下面的按钮继续设置新密码。如果这不是你的操作，可以直接忽略这封邮件。</p>',
    `        <p style="margin:0 0 24px;"><a href="${safeResetUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #0f172a;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;">重置密码</a></p>`,
    '        <p style="margin:0 0 12px;font-size:12px;line-height:1.7;color:#475569;">如果按钮无法打开，请复制下面的链接到浏览器：</p>',
    `        <p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;color:#334155;">${safeResetUrl}</p>`,
    '      </td>',
    '    </tr>',
    '  </table>',
    '</body>',
    '</html>',
  ].join('\n')
}

function createResetPasswordText(appName: string, resetUrl: string): string {
  return [
    `${appName} 密码重置`,
    '',
    '你收到这封邮件，是因为有人请求重置你在本站的登录密码。',
    '打开下面的链接继续设置新密码：',
    resetUrl,
    '',
    '如果这不是你的操作，可以直接忽略这封邮件。',
  ].join('\n')
}

export async function sendResetPasswordEmail(email: string, resetUrl: string): Promise<void> {
  const fromAddress = requireEnv('AUTH_EMAIL_FROM')
  const appName = process.env.AUTH_EMAIL_APP_NAME?.trim() || DEFAULT_APP_NAME
  const sesClient = createSesClient()

  await sesClient.send(new SendEmailCommand({
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Charset: 'utf8',
        Data: `${appName} 密码重置`,
      },
      Body: {
        Html: {
          Charset: 'utf8',
          Data: createResetPasswordHtml(appName, resetUrl),
        },
        Text: {
          Charset: 'utf8',
          Data: createResetPasswordText(appName, resetUrl),
        },
      },
    },
    Source: fromAddress,
  }))
}
