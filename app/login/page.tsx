"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import spicesBg from '@/public/img_SignIn.png';
import annGangaLogo from '@/public/img_Logo.png';

export default function LoginPage() {
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpSent, setOtpSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpInputs = useRef<(HTMLInputElement | null)[]>([]);
    const router = useRouter();
    const { login } = useAuth();

    const validatePhone = (phone: string) => {
        return /^\d{8,13}$/.test(phone);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
        setPhone(value);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value && !/^\d$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input on number input
        if (value && index < 5) {
            otpInputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputs.current[index - 1]?.focus();
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validatePhone(phone)) {
            toast.error('Please enter a valid phone number (8-13 digits)');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }
            
            setOtpSent(true);
            startResendCooldown();
            toast.success('OTP sent successfully!');
            
        } catch (error: any) {
            console.error('OTP send error:', error);
            toast.error(error.message || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const otpString = otp.join('');
        if (otpString.length !== 6) {
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
                body: JSON.stringify({
                    phone,
                    otp: otpString,
                }),
                credentials: 'include' // Important for cookies to be set
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }
            
            // Call login function from AuthContext
            if (data.data?.user && data.data?.token) {
                login(data.data.user, data.data.token);
                toast.success('Login successful!');
                router.push('/');
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error: any) {
            console.error('OTP verification error:', error);
            toast.error(error.message || 'OTP verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const startResendCooldown = () => {
        setResendCooldown(30);
        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend OTP');
            }
            
            startResendCooldown();
            toast.success('OTP resent successfully!');
            
        } catch (error: any) {
            console.error('Resend OTP error:', error);
            toast.error(error.message || 'Failed to resend OTP. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

            {/* Left Side - Spices Image (Desktop only) */}
            <div className="hidden lg:block relative w-1/2 h-screen">
                <Image
                    src={spicesBg}
                    alt="Pure Indian Spices"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center px-6 py-8 lg:py-0 min-h-screen lg:min-h-0">
                <div className="w-full max-w-md space-y-10">

                    {/* Logo + Name */}
                    <div className="text-center">
                        <div className="flex items-center justify-center space-x-4">
                            <Image
                                src={annGangaLogo}
                                alt="Ann Ganga Logo"
                                width={72}
                                height={72}
                                className="inline-block"
                                priority
                            />
                            <h1 className="text-4xl font-bold text-gray-900">Ann Ganga</h1>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">आहारम् • आरोग्यम् • आनंदम्</p>
                    </div>

                    {/* Heading */}
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900">Login to your account</h2>
                        <p className="mt-2 text-gray-600">Enter your phone number to continue</p>
                    </div>

                    {/* Form - Phone Number and OTP */}
                    {!otpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="relative">
                                <div className="absolute left-0 pl-4 top-1/2 transform -translate-y-1/2 flex items-center z-10">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1.382c-.414 0-.789-.168-1.06-.44l-2.657-2.657a1 1 0 00-1.414 0l-1.414 1.414a1 1 0 01-1.414 0 8.962 8.962 0 01-4.243-4.243 1 1 0 010-1.414l1.414-1.414a1 1 0 000-1.414l-2.657-2.657A1 1 0 015 6.382V5z" />
                                    </svg>
                                </div>
                                <input
                                    type="tel"
                                    required
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={13}
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    onBlur={() => {
                                        if (!phone) setPhoneError('Phone number is required');
                                        else if (!validatePhone(phone)) setPhoneError('Phone number must be between 8 and 13 digits');
                                    }}
                                    aria-describedby="login-phone-error"
                                    placeholder="Phone number"
                                    className={`relative z-0 w-full pl-14 pr-4 py-5 text-lg bg-white rounded-xl border ${phoneError ? 'border-red-500' : 'border-gray-300'} ${phoneError ? 'focus:border-red-500 focus:ring-4 focus:ring-red-100' : 'focus:border-green-500 focus:ring-4 focus:ring-green-100'} outline-none transition-all duration-300 placeholder-gray-400`}
                                />
                            </div>
                            {phoneError && (
                                <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                            )}
                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter 6-digit OTP sent to +{phone}
                                </label>
                                <div className="flex space-x-3">
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={otp[index]}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, index)}
                                            ref={(el: HTMLInputElement | null): void => {
                                                if (el) {
                                                    otpInputs.current[index] = el;
                                                }
                                            }}
                                            className="w-full h-12 text-center text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            disabled={isLoading}
                                        />
                                    ))}
                                </div>
                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setOtpSent(false)}
                                        className="text-sm text-green-600 hover:text-green-800"
                                        disabled={isLoading}
                                    >
                                        Change phone number
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading || otp.length !== 6}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 ${(isLoading || otp.length !== 6) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Register Link */}
                    <p className="text-center text-gray-600">
                        Don't have an account?{' '}
                        <Link href="/register" className="font-semibold text-green-600 hover:text-green-700 hover:underline">
                            Sign up
                        </Link>
                    </p>

                </div>
            </div>
        </div>
    );
}