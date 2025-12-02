"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import spicesBg from '@/public/img_SignIn.png';
import annGangaLogo from '@/public/img_Logo.png';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const validateEmail = (value: string) => {
        // must start with a letter, then allow letters/numbers and common local-part chars, then @domain
        const re = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        return re.test(value);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setEmail(v);
        if (emailError) {
            if (validateEmail(v)) setEmailError('');
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // allow only digits and limit to 13 (allow 8-13 digits)
        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
        setPhone(digits);
        if (phoneError && /^\d{8,13}$/.test(digits)) setPhoneError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate form
        let ok = true;
        if (!email) {
            setEmailError('Email is required');
            ok = false;
        } else if (!validateEmail(email)) {
            setEmailError('Enter a valid email (must start with a letter)');
            ok = false;
        } else {
            setEmailError('');
        }

        if (!phone) {
            setPhoneError('Phone number is required');
            ok = false;
        } else if (!/^\d{8,13}$/.test(phone)) {
            setPhoneError('Phone number must be between 8 and 13 digits');
            ok = false;
        } else {
            setPhoneError('');
        }

        if (!ok) return;

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    phone,
                    name: '', // Add name if required by your backend
                    dob: null // Add date of birth if required
                })
            });

            const data = await response.json();
            console.log(data);
            if (!response.ok) {
                // Show the error message from backend in toast
                if (data.message) {
                    toast.error(data.message, {
                        style: {
                            background: '#EF4444',
                            color: '#fff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontWeight: 500,
                            maxWidth: '500px',
                            whiteSpace: 'pre-line',
                        },
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#EF4444',
                        },
                        duration: 5000, // Show for 5 seconds
                    });
                    
                    // If it's a phone number error, also show it under the phone field
                    if (data.message.includes('phone') || data.message.includes('Phone')) {
                        setPhoneError(data.message);
                    }
                    // If it's an email error, show it under the email field
                    else if (data.message.includes('email') || data.message.includes('Email')) {
                        setEmailError(data.message);
                    }
                } else {
                    // Fallback error message
                    toast.error('Registration failed. Please try again.');
                }
                return;
            }

            // Show success toast with auto-close after 3 seconds
            toast.success('🎉 Registration successful! Redirecting to home page...', {
                duration: 3000,
                style: {
                    background: '#10B981',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#10B981',
                },
            });

            // Redirect to home page after a short delay
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error: any) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Failed to register. Please try again.', {
                style: {
                    background: '#EF4444',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Side - Background Image */}
            <div className="relative w-full lg:w-1/2 h-64 lg:h-screen">
                <Image
                    src={spicesBg}
                    alt="Delicious spices"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute top-12 left-8 text-white">
                </div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md space-y-8">

                    {/* Logo + App Name */}
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

                    {/* Form Heading */}
                    <div className="text-left -mt-4">
                        <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
                        <p className="mt-2 text-gray-600">Quickly create account</p>
                    </div>

                    {/* Form */}
                    <form className="space-y-6">
                        {/* Email Field */}
                        <div className="relative">
                            <div className="absolute left-0 pl-4 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none z-10">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => {
                                    if (!email) setEmailError('Email is required');
                                    else if (!validateEmail(email)) setEmailError('Enter a valid email (must start with a letter)');
                                }}
                                aria-describedby="email-error"
                                className={`relative z-0 w-full pl-14 pr-4 py-4 bg-white rounded-xl border ${emailError ? 'border-red-500' : 'border-gray-300'} ${emailError ? 'focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'focus:border-green-500 focus:ring-2 focus:ring-green-200'} outline-none transition text-gray-800 placeholder-gray-400`}
                                placeholder="Email address"
                            />
                        </div>
                        {emailError ? (
                            <p id="email-error" className="text-sm text-red-600 mt-2">{emailError}</p>
                        ) : null}

                        {/* Phone Number Field */}
                        <div className="relative">
                            <div className="absolute left-0 pl-4 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none z-10">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0-2 2v-1.382c0-.414-.168-.789-.44-1.06l-2.657-2.657a1 1 0 00-1.414 0l-1.414 1.414a1 1 0 01-1.414 0 8.962 8.962 0 01-4.243-4.243 1 1 0 010-1.414l1.414-1.414a1 1 0 000-1.414l-2.657-2.657A1 1 0 015 6.382V5z" />
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
                                    else if (!/^\d{8,13}$/.test(phone)) setPhoneError('Phone number must be between 8 and 13 digits');
                                }}
                                aria-describedby="phone-error"
                                className={`relative z-0 w-full pl-14 pr-4 py-4 bg-white rounded-xl border ${phoneError ? 'border-red-500' : 'border-gray-300'} ${phoneError ? 'focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'focus:border-green-500 focus:ring-2 focus:ring-green-200'} outline-none transition text-gray-800 placeholder-gray-400 text-base`}
                                placeholder="Phone number"
                            />
                        </div>
                        {phoneError ? (
                            <p id="phone-error" className="text-sm text-red-600 mt-2">{phoneError}</p>
                        ) : null}

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-lg py-4 rounded-xl shadow-lg transform transition ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-gray-600 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium text-green-600 hover:text-green-700 hover:underline">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}