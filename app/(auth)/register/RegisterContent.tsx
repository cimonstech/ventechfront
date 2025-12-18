'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signUp } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react';

export function RegisterContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple rapid submissions
    if (isLoading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });

      if (error) {
        // Handle rate limiting (429 error) - check multiple error properties
        const errorWithStatus = error as any;
        const statusCode = errorWithStatus.status || errorWithStatus.statusCode || errorWithStatus.code;
        const errorCode = errorWithStatus.code || '';
        const errorMessage = error.message || errorWithStatus.message || '';
        const errorString = JSON.stringify(error).toLowerCase();
        
        // Check for email sending rate limit (specific Supabase error)
        if (
          errorCode === 'over_email_send_rate_limit' ||
          errorMessage.toLowerCase().includes('email rate limit') ||
          errorMessage.toLowerCase().includes('email send rate limit')
        ) {
          // Still allow account creation, but show warning about email delay
          // The account is created, just the verification email is delayed
          toast.error(
            'Your account was created successfully, but verification email sending is temporarily limited. We\'ll send your verification email shortly. Please check your inbox in a few minutes, or contact support if you need immediate assistance.',
            {
              duration: 12000,
            }
          );
          console.error('Email rate limit error (account created but email delayed):', error);
          
          // Still proceed to show success - account is created
          // The user can still sign in if email verification is not strictly required
          const userEmail = formData.email;
          if (userEmail) {
            localStorage.setItem('pendingVerificationEmail', userEmail);
          }
          setTimeout(() => {
            router.push(`/verify-email${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`);
          }, 2000);
          return;
        }
        // Check for general 429 rate limit errors
        else if (
          statusCode === 429 || 
          errorMessage.includes('429') || 
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too many requests') ||
          errorString.includes('429') ||
          errorString.includes('rate limit') ||
          errorString.includes('too many requests')
        ) {
          toast.error('Too many signup attempts. Please wait 5-10 minutes before trying again.', {
            duration: 8000,
          });
          console.error('Rate limit error:', error);
        } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.', {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage || 'Failed to create account. Please try again.');
          console.error('Registration error:', error);
        }
        return;
      }

      if (user) {
        // Store email for verification page before clearing form
        const userEmail = formData.email;
        if (userEmail) {
          localStorage.setItem('pendingVerificationEmail', userEmail);
        }
        
        toast.success('Account created successfully! Please check your email to verify your account.');
        // Clear form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
        });
        // Redirect to verification page
        setTimeout(() => {
          router.push(`/verify-email${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">
            Join VENTECH and start shopping for the latest gadgets
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First Name */}
            <Input
              label="First Name"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              required
              icon={<User size={18} />}
            />

            {/* Last Name */}
            <Input
              label="Last Name"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              required
              icon={<User size={18} />}
            />

            {/* Email */}
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              icon={<Mail size={18} />}
            />

            {/* Phone */}
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              required
              icon={<Phone size={18} />}
              placeholder="+233 XX XXX XXXX"
            />

            {/* Password */}
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              icon={<Lock size={18} />}
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
              icon={<Lock size={18} />}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              icon={<ArrowRight size={20} />}
            >
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link
              href="/login"
              className="text-[#FF7A19] hover:text-orange-600 font-medium inline-flex items-center gap-2"
            >
              Sign in to your account
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-[#FF7A19]" />
            Why Create an Account?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Faster checkout and order tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Exclusive deals and discounts</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Save your favorite products</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Order history and easy returns</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

