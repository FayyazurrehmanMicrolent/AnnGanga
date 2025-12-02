import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'Annganga12345@';
const JWT_EXPIRES_IN: number | string = process.env.JWT_EXPIRES_IN || '7d';

// Password hashing function
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Password verify function
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(userId: string, email?: string): string {
  return jwt.sign(
    {
      userId,
      email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// SMTP Email bhejne ke liye
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const FALLBACK_TO_ETHEREAL = process.env.EMAIL_FALLBACK_TO_ETHEREAL !== 'false';
  const connectionTimeout = parseInt(process.env.SMTP_CONNECTION_TIMEOUT || '10000');
  const greetingTimeout = parseInt(process.env.SMTP_GREETING_TIMEOUT || '10000');
  const socketTimeout = parseInt(process.env.SMTP_SOCKET_TIMEOUT || '20000');



  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', 
      auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,        
      } : undefined,   
    });
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || 'noreply@ann-ganga.com',
      to,
      subject,
      html,
    };
    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal or a test transport, log the preview URL
    try {
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.info('Preview URL:', preview);
    } catch (e) {
      // ignore if getTestMessageUrl fails
    }

    return true;
  } catch (error: any) {
    console.error('Email send error:', error);

    if (!FALLBACK_TO_ETHEREAL) {
      console.info('Ethereal fallback disabled by EMAIL_FALLBACK_TO_ETHEREAL=false');
      return false;
    }

    // If auth failed or SMTP not configured, fall back to Ethereal test account
    try {
      console.info('Falling back to Ethereal test account for emails.');
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
      });

      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || testAccount.user,
        to,
        subject,
        html,
      };

      const info = await testTransporter.sendMail(mailOptions);
      const preview = nodemailer.getTestMessageUrl(info);
      console.info('Ethereal preview URL:', preview);
      return true;
    } catch (err) {
      console.error('Ethereal fallback failed:', err);
      return false;
    }
  }
}

// Welcome email template
export function getWelcomeEmailTemplate(
  name: string,
  email: string,
  deviceToken: string
): string {
  console.log(`📧 Registration Details:\n   Email: ${email || 'Not provided'}\n   Device Token: ${deviceToken}`);
  return `
    <h2>Welcome to Ann-Ganga! 🎉</h2>
    <p>Hi ${name || email || 'User'},</p>
    <p>Your account has been successfully created.</p>
    <p>Your Device Token: <strong>${deviceToken}</strong></p>
    <p>You can now login to your account using your phone number and device token.</p>
    <br/>
    <p>Thank you for joining us!</p>
    <p><strong>Ann-Ganga Team</strong></p>
  `;
}

// Login success email template
export function getLoginEmailTemplate(email: string, timestamp: string): string {
  return `
    <h2>New Login to Your Account</h2>
    <p>Hi,</p>
    <p>A new login to your Ann-Ganga account was detected.</p>
    <p><strong>Time:</strong> ${timestamp}</p>
    <p>If this wasn't you, please change your password immediately.</p>
    <br/>
    <p>Best regards,</p>
    <p><strong>Ann-Ganga Security Team</strong></p>
  `;
}

// Password validation function
export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
} {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long.',
    };
  }
  return {
    isValid: true,
    message: 'Password is valid.',
  };
}

// Email validation function
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation function
export function validatePhone(phone: string): { isValid: boolean; message: string; cleaned?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, message: 'Phone number is required.' };
  }

  // Disallow any whitespace characters explicitly
  if (/\s/.test(phone)) {
    return { isValid: false, message: 'Spaces are not allowed in phone number.' };
  }

  // Disallow alphabetic characters explicitly
  if (/[A-Za-z]/.test(phone)) {
    return { isValid: false, message: 'Characters are not allowed in phone number. Please enter digits only.' };
  }

  // Require exactly 10 digits and nothing else
  if (!/^\d{10}$/.test(phone)) {
    // Provide different messages for too short / too long
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      return { isValid: false, message: 'Phone number must be exactly 10 digits long.' };
    }
    if (digitsOnly.length > 10) {
      return { isValid: false, message: 'Phone number cannot be more than 10 digits.' };
    }
    return { isValid: false, message: 'Phone number must contain exactly 10 digits and no other characters.' };
  }

  return { isValid: true, message: 'Phone number is valid.', cleaned: phone };
}

// Generate default device token with 6 random numbers
export function generateDeviceToken(): string {
  const randomNumbers = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔑 Device Token Generated: ${randomNumbers}`);
  return randomNumbers;
}
