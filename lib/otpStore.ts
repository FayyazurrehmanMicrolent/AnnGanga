// Simple in-memory OTP store for development. Replace with Redis in production.
type OtpEntry = { otp: string; expiresAt: number };

export const otpStore: Map<string, OtpEntry> = new Map();

export function setOtp(phone: string, otp: string, ttlMinutes = 10) {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  otpStore.set(phone, { otp, expiresAt });
}

export function getOtp(phone: string) {
  return otpStore.get(phone);
}

export function deleteOtp(phone: string) {
  otpStore.delete(phone);
}
