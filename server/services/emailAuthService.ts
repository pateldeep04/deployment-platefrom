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
}

export const emailAuthService = new EmailAuthService();
