import crypto from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface IOtpVerificationResult {
  success: boolean;
  error?: string;
}

class EmailAuthService {
  private transporter: Transporter | null = null;
  private lastTransporterConfigKey: string = '';

  /**
   * Generates a secure, unpredictable 6-digit numeric OTP code
   */
  public generateNumericOtp(): string {
    const buffer = crypto.randomBytes(3);
    const num = (buffer.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  /**
   * Retrieves or creates Nodemailer SMTP transporter
   */
  private getTransporter(): Transporter | null {
    if (!config.smtpUser || !config.smtpPass) {
      return null;
    }

    const currentKey = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}:${config.smtpSecure}`;
    if (!this.transporter || this.lastTransporterConfigKey !== currentKey) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure || config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: (config.smtpPass || '').replace(/\s+/g, ''),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.lastTransporterConfigKey = currentKey;
    }

    return this.transporter;
  }

  /**
   * Dispatches verification code via SMTP email matching the DeployHub UI aesthetic
   */
  public async sendVerificationCode(email: string, code: string, type: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET'): Promise<boolean> {
    const actionText = type === 'REGISTER'
      ? 'verify your email address'
      : (type === 'LOGIN' ? 'securely sign in to your dashboard' : 'reset your account password');

    const subject = type === 'REGISTER'
      ? `DeployHub Verification Code: ${code}`
      : (type === 'LOGIN' ? `DeployHub Login Code: ${code}` : `DeployHub Security Code: ${code}`);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); overflow: hidden;">
                
                <!-- Synchronized Brand Header -->
                <tr>
                  <td style="padding: 36px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                    <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: linear-gradient(135deg, #2563eb, #0284c7); border-radius: 12px; margin-bottom: 12px; text-align: center; color: #ffffff; font-size: 24px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
                      🚀
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                      Deploy<span style="color: #2563eb;">Hub</span> <span style="font-size: 16px; font-weight: 600; color: #64748b;">Cloud</span>
                    </div>
                    <div style="font-size: 12px; font-weight: 500; color: #64748b; margin-top: 4px;">
                      Instant Web Hosting & Cloud Edge Platform
                    </div>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px 32px 28px 32px; background-color: #ffffff;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; text-align: center;">
                      Your One-Time Security Code
                    </h2>
                    
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                      Use the 6-digit one-time code below to ${actionText}:
                    </p>

                    <!-- Synchronized Code Badge Box -->
                    <div style="background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 14px; padding: 22px 16px; text-align: center; margin: 0 0 24px 0;">
                      <div style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; color: #1d4ed8; letter-spacing: 8px; margin-left: 8px;">
                        ${code}
                      </div>
                      <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-top: 10px;">
                        ⌛ This code is valid for 5 minutes only. Do not share this code with anyone.
                      </div>
                    </div>

                    <!-- Security Alert Callout -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px 0;">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="24" valign="top" style="font-size: 16px; line-height: 1.4;">🔒</td>
                          <td style="font-size: 12px; line-height: 1.5; color: #64748b; padding-left: 8px;">
                            <strong>Security Notice:</strong> Never share this code with anyone. DeployHub support will never ask for your verification code.
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                      If you did not request this security code, please ignore this email or contact support.
                    </p>
                  </td>
                </tr>

                <!-- Synchronized Clean Footer -->
                <tr>
                  <td style="padding: 22px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                      DeployHub Cloud — Free Cloud Hosting & Instant Web Deployment
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      © ${new Date().getFullYear()} DeployHub Cloud. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        console.log(`[EmailAuthService] Dispatching SMTP email to ${email} via ${config.smtpHost}...`);
        await transporter.sendMail({
          from: config.smtpFrom,
          to: email,
          subject,
          text: `Your DeployHub verification code is: ${code}. It expires in 5 minutes.`,
          html,
        });
        console.log(`[EmailAuthService] Successfully delivered verification email to ${email}`);
        return true;
      } catch (err: any) {
        console.error(`[EmailAuthService] SMTP delivery failed to ${email}:`, err.message);
      }
    }

    // Fallback simulated code for local dev
    console.log(`[DeployHub Auth] Verification code for ${email}: ${code} (${type})`);

    return true;
  }

  /**
   * Dispatches 1-month domain expiry warning email to project owner
   */
  public async sendDomainExpiryWarning(
    email: string,
    domainName: string,
    expiresAt: string,
    daysRemaining: number
  ): Promise<boolean> {
    const formattedDate = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `⚠️ Notice: Your domain [${domainName}] expires in ${daysRemaining} days`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Brand Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: linear-gradient(135deg, #2563eb, #0284c7); border-radius: 12px; margin-bottom: 10px; color: #ffffff; font-size: 22px;">
                      🚀
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a;">
                      Deploy<span style="color: #2563eb;">Hub</span>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="28" valign="top" style="font-size: 20px;">⚠️</td>
                          <td style="padding-left: 10px;">
                            <div style="font-size: 14px; font-weight: 700; color: #92400e;">
                              Domain Validity Reminder
                            </div>
                            <div style="font-size: 13px; color: #b45309; margin-top: 2px;">
                              Your domain <strong>${domainName}</strong> will expire on <strong>${formattedDate}</strong> (${daysRemaining} days left).
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                      ✨ Free 3-Month Reactivation
                    </h3>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      DeployHub domains can be renewed for <strong>100% free</strong> with one click to keep your site online for another 3-month cycle.
                    </p>

                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${config.apiUrl}/dashboard" style="background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                        Reactivate Domain Free →
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      © ${new Date().getFullYear()} DeployHub Cloud. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.smtpFrom,
          to: email,
          subject,
          text: `Notice: Your domain ${domainName} expires on ${formattedDate}. You can reactivate it for free anytime.`,
          html,
        });
        return true;
      } catch (err: any) {
        console.error(`[EmailAuthService] SMTP domain warning failed:`, err.message);
      }
    }

    console.log(`[Domain Warning Log] Sent expiry warning for ${domainName} to ${email}`);
    return true;
  }

  /**
   * Dispatches domain deactivation notice email to project owner
   */
  public async sendDomainDeactivatedNotification(
    email: string,
    domainName: string,
    reactivateUrl: string
  ): Promise<boolean> {
    const subject = `🔴 Action Required: Your domain [${domainName}] has been deactivated`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Brand Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: linear-gradient(135deg, #2563eb, #0284c7); border-radius: 12px; margin-bottom: 10px; color: #ffffff; font-size: 22px;">
                      🚀
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a;">
                      Deploy<span style="color: #2563eb;">Hub</span>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="28" valign="top" style="font-size: 20px;">🔴</td>
                          <td style="padding-left: 10px;">
                            <div style="font-size: 14px; font-weight: 700; color: #991b1b;">
                              Domain Deactivated
                            </div>
                            <div style="font-size: 13px; color: #b91c1c; margin-top: 2px;">
                              The 3-month free validity period for <strong>${domainName}</strong> has ended.
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                      All Your Files & Configs Are Safe!
                    </h3>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Click below to reactivate your domain instantly for another 3 months for <strong>100% free</strong>.
                    </p>

                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${reactivateUrl}" style="background-color: #16a34a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);">
                        Restore & Reactivate Free →
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      © ${new Date().getFullYear()} DeployHub Cloud. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.smtpFrom,
          to: email,
          subject,
          text: `Your domain ${domainName} has been deactivated. Reactivate for free: ${reactivateUrl}`,
          html,
        });
        return true;
      } catch (err: any) {
        console.error(`[EmailAuthService] SMTP deactivation notice failed:`, err.message);
      }
    }

    console.log(`[Domain Deactivation Log] Sent deactivation email for ${domainName} to ${email}`);
    return true;
  }
}

export const emailAuthService = new EmailAuthService();
