import crypto from 'crypto';

export interface IOtpVerificationResult {
  success: boolean;
  error?: string;
}

class EmailAuthService {
  /**
   * Generates a secure, unpredictable 6-digit numeric OTP code
   */
  public generateNumericOtp(): string {
    const buffer = crypto.randomBytes(3);
    const num = (buffer.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  /**
   * Dispatches verification code via email (or secure cloud delivery log)
   */
  public async sendVerificationCode(email: string, code: string, type: 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET'): Promise<boolean> {
    const subject = type === 'REGISTER'
      ? 'DeployHub Email Verification Code'
      : (type === 'LOGIN' ? 'DeployHub One-Time Login Code' : 'DeployHub Security Code');

    console.log(`
============================================================
  📧 [DeployHub Email Dispatcher]
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

    console.log(`
============================================================
  📧 [DeployHub Email Dispatcher - ⚠️ DOMAIN EXPIRY WARNING]
  To: ${email}
  Subject: ⚠️ Notice: Your domain [${domainName}] expires in ${daysRemaining} days
  ------------------------------------------------------------
  Dear DeployHub Developer,

  Your domain [${domainName}] will expire and be deactivated on:
  📅 ${formattedDate} (${daysRemaining} days remaining)

  Good news: You can reactivate your domain for FREE at any time!
  Simply log in to your DeployHub Console and click "Reactivate Domain (Free)"
  to extend your domain validity for another 3 months at zero cost.

  DeployHub Console: https://deployeai.duckdns.org/dashboard
============================================================
    `);

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
    console.log(`
============================================================
  📧 [DeployHub Email Dispatcher - 🔴 DOMAIN DEACTIVATED]
  To: ${email}
  Subject: 🔴 Action Required: Your domain [${domainName}] has been deactivated
  ------------------------------------------------------------
  Dear DeployHub Developer,

  The 3-month free validity period for your domain [${domainName}]
  has completed, and the domain is now temporarily deactivated.

  ✨ Reactivate for FREE:
  Your site files and configurations are safe! You can reactivate
  this domain immediately for FREE with one click:

  👉 Reactivate Free Now: ${reactivateUrl}

  Once reactivated, your domain will be immediately restored and active
  for another 3 months.
============================================================
    `);

    return true;
  }
}

export const emailAuthService = new EmailAuthService();
