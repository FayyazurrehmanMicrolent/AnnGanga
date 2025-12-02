"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import spicesBg from '@/public/img_SignIn.png';
import annGangaLogo from '@/public/img_Logo.png';

export default function OTPVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const id = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(id);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // If no phone number is provided, redirect to login
  useEffect(() => {
    if (!phone) {
      toast.error('Phone number is required for OTP verification');
      router.push('/login');
    }
  }, [phone, router]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && index === 5) {
      handleSubmit();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      // Reset timer and OTP input
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();

      toast.success('OTP has been resent to your phone');
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp: code }),
        credentials: 'include', // Important for cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      toast.success('Verification successful!');
      router.push('/'); // Redirect to home page after successful verification
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* Left Image - Desktop Only */}
      <div className="hidden lg:block relative w-1/2 h-screen">
        <Image src={spicesBg} alt="Spices" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Right Side - OTP Form */}
      <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center px-6 py-12 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md space-y-10">

          {/* Logo + Name (inline) */}
          <div className="flex items-center justify-center space-x-4">
            <Image src={annGangaLogo} alt="Ann Ganga" width={72} height={72} className="drop-shadow-lg" priority />
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900">Ann Ganga</h1>
              <p className="text-sm text-gray-600">आहारम् • आरोग्यम् • आनंदम्</p>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Verify your number</h2>
            <p className="mt-3 text-gray-600 text-lg">
              Enter your OTP code below
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Sent to <span className="font-semibold text-gray-800">+{phone}</span>
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-3 md:gap-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputsRef.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={isLoading}
                className={`w-14 h-14 md:w-16 md:h-16 text-center text-2xl font-bold text-gray-800 bg-white border-2 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all shadow-md ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={handleSubmit}
            disabled={otp.join('').length < 6}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-xl transition-all transform
              ${otp.join('').length === 6 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95' 
                : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            Next
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            <p className="text-gray-600">
              Didn't receive the code?{' '}
              {canResend ? (
                <button
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className={`font-semibold text-green-600 hover:text-green-700 hover:underline ${
                    !canResend || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Sending...' : 'Resend'}
                </button>
              ) : (
                <span className="font-medium text-gray-500">
                  Resend in {timer}s
                </span>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}