import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useForm } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'react-hot-toast';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
  newsletter: boolean;
}

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { values, errors, handleChange, handleBlur, validate, setFieldError } = useForm<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
    newsletter: true,
  });

  // Wrapper functions to adapt useForm handlers to React event handlers
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox') {
      handleChange(target.name as keyof RegisterForm, target.checked);
    } else {
      handleChange(target.name as keyof RegisterForm, target.value);
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    handleBlur(e.target.name as keyof RegisterForm);
  };

  const validationRules = {
    name: (value: string) => {
      if (!value) return 'Name is required';
      if (value.length < 2) return 'Name must be at least 2 characters';
      return undefined;
    },
    email: (value: string) => {
      if (!value) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
      return undefined;
    },
    password: (value: string) => {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return undefined;
    },
    confirmPassword: (value: string) => {
      if (!value) return 'Please confirm your password';
      if (value !== values.password) return 'Passwords do not match';
      return undefined;
    },
    terms: (value: boolean) => {
      if (!value) return 'You must accept the terms and conditions';
      return undefined;
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(validationRules)) return;

    setIsLoading(true);
    try {
      await register(values.name, values.email, values.password);
      toast.success('Account created successfully!');
      navigate('/handwriting-profile');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      if (message.includes('email')) {
        setFieldError('email', message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoRegister = async () => {
    setIsLoading(true);
    try {
      await register('Demo User', 'demo@handwriteai.com', 'demo123456');
      toast.success('Demo account created!');
      navigate('/handwriting-profile');
    } catch {
      // Demo might already exist, try login
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const metRequirements = passwordRequirements.filter(req => req.test(values.password)).length;

  return (
    <div className="min-h-screen bg-notebook-paper-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-notebook-blue-600 to-notebook-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-heading text-2xl text-notebook-blue-800">HandwriteAI</span>
          </Link>
          <h1 className="font-heading text-3xl text-notebook-ink-50 mb-2">Create Your Account</h1>
          <p className="text-notebook-blue-600">Start creating handwritten assignments in minutes</p>
        </div>

        {/* Register Form */}
        <Card variant="notebook" padding="xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={values.name}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="John Doe"
              error={errors.name}
              autoComplete="name"
              autoFocus
              leftIcon={<User className="w-5 h-5" />}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={values.email}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="you@example.com"
              error={errors.email}
              autoComplete="email"
              leftIcon={<Mail className="w-5 h-5" />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={values.password}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                error={errors.password}
                autoComplete="new-password"
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-notebook-blue-400 hover:text-notebook-blue-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>

            {/* Password Strength */}
            {values.password && (
              <div className="space-y-2">
                <div className="h-1.5 bg-notebook-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-notebook-blue-500 to-notebook-purple-600 transition-all duration-300"
                    style={{ width: `${(metRequirements / passwordRequirements.length) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1.5 transition-colors ${
                        req.test(values.password) ? 'text-green-600' : 'text-notebook-blue-400'
                      }`}
                    >
                      <CheckCircle className={`w-3 h-3 ${req.test(values.password) ? 'fill-current' : 'text-notebook-blue-200'}`} />
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                error={errors.confirmPassword}
                autoComplete="new-password"
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-notebook-blue-400 hover:text-notebook-blue-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                name="terms"
                id="terms"
                checked={values.terms}
                onChange={onChange}
                className="w-4 h-4 mt-0.5 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-notebook-blue-600">
                I agree to the{' '}
                <Link to="/terms" className="text-notebook-blue-600 hover:text-notebook-blue-700 underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-notebook-blue-600 hover:text-notebook-blue-700 underline">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && (
              <p className="text-sm text-red-500" role="alert">{errors.terms}</p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="newsletter"
                id="newsletter"
                checked={values.newsletter}
                onChange={onChange}
                className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
              />
              <label htmlFor="newsletter" className="text-sm text-notebook-blue-600">
                Send me product updates and tips (optional)
              </label>
            </div>

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-notebook-blue-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-notebook-blue-400">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" onClick={handleDemoRegister} disabled={isLoading}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button variant="outline" type="button" disabled={isLoading}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-notebook-blue-500">
            Already have an account?{' '}
            <Link to="/login" className="text-notebook-blue-600 hover:text-notebook-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </Card>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Shield, label: 'Secure', desc: 'Encrypted data' },
            { icon: CheckCircle, label: 'Free Trial', desc: '14 days free' },
            { icon: AlertCircle, label: 'No Card', desc: 'No credit card' },
          ].map((item, index) => (
            <div key={index} className="p-3 bg-white rounded-xl border border-notebook-blue-100">
              <item.icon className="w-5 h-5 text-notebook-blue-500 mx-auto mb-2" />
              <p className="font-medium text-notebook-ink-50 text-sm">{item.label}</p>
              <p className="text-xs text-notebook-blue-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}