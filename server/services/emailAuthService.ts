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
          pass: config.smtpPass,
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
   * Dispatches verification code via SMTP email or logs to console
   */
  public async sendVerificationCode(email: string, code: string, type: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET'): Promise<boolean> {
    const actionText = type === 'REGISTER'
      ? 'verify your email address'
      : (type === 'LOGIN' ? 'complete your secure login' : 'reset your password');

    const subject = type === 'REGISTER'
      ? `DeployHub Verification Code: ${code}`
      : (type === 'LOGIN' ? `DeployHub Login Code: ${code}` : `DeployHub Security Code: ${code}`);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">DeployHub Cloud</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Instant Web Hosting & Cloud Edge Platform</p>
        </div>
        
        <div style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 15px; margin-top: 0;">Use the 6-digit one-time code below to ${actionText}:</p>
          
          <div style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 36px; font-weight: 700; color: #60a5fa; letter-spacing: 8px; padding: 16px 24px; background-color: #0b0f17; border-radius: 6px; display: inline-block; margin: 12px 0 16px 0; border: 1px dashed #3b82f6;">
            ${code}
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">⏳ This code is valid for <strong>15 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        
        <div style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="margin: 0;">If you did not request this security code, please ignore this email or contact support.</p>
          <p style="margin: 4px 0 0 0;">© ${new Date().getFullYear()} DeployHub Cloud. All rights reserved.</p>
        </div>
      </div>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        console.log(`[EmailAuthService] Dispatching SMTP email to ${email} via ${config.smtpHost}...`);
        await transporter.sendMail({
          from: config.smtpFrom,
          to: email,
          subject,
          text: `Your DeployHub verification code is: ${code}. It expires in 15 minutes.`,
          html,
        });
        console.log(`[EmailAuthService] Successfully delivered verification email to ${email}`);
        return true;
      } catch (err: any) {
        console.error(`[EmailAuthService] SMTP delivery failed to ${email}:`, err.message);
      }
    }

    // Fallback display log
    console.log(`
============================================================
  📧 [DeployHub Email Dispatcher - Active Code]
  To: ${email}
  Type: ${type}
  Subject: ${subject}
  🔐 6-Digit Verification Code: [ ${code} ]
  ⏳ Valid for: 15 minutes
============================================================
    `);

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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e293b;">
        <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Domain Expiry Notice</h2>
        <p style="color: #cbd5e1; font-size: 15px;">Your domain <strong>${domainName}</strong> is scheduled to expire and deactivate on <strong>${formattedDate}</strong> (${daysRemaining} days remaining).</p>
        
        <div style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #60a5fa; margin-top: 0;">✨ Free Reactivation Available</h4>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 0;">You can extend your domain for another 3 months for <strong>100% FREE</strong> at any time. Just visit your DeployHub dashboard and click <em>"Reactivate Domain (Free)"</em>.</p>
        </div>

        <p style="text-align: center; margin-top: 24px;">
          <a href="${config.apiUrl}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to DeployHub Dashboard</a>
        </p>
      </div>
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #1e293b;">
        <h2 style="color: #ef4444; margin-top: 0;">🔴 Domain Deactivated</h2>
        <p style="color: #cbd5e1; font-size: 15px;">The 3-month free validity period for domain <strong>${domainName}</strong> has completed, and it has been deactivated.</p>
        
        <div style="background-color: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #10b981; margin-top: 0;">✨ Reactivate Instantly for FREE</h4>
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">All your site files and configurations are safe! Click below to reactivate this domain immediately for another 3 months at zero cost.</p>
          <a href="${reactivateUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reactivate Domain Free</a>
        </div>
      </div>
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
