import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import { api, apiError } from '@/lib/api';

const emailSchema = z.object({ email: z.string().email('Enter a valid email') });
const resetSchema = z.object({ password: z.string().min(8, 'At least 8 characters') });

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState('request'); // request | reset | done
  const [resetToken, setResetToken] = useState('');
  const [serverError, setServerError] = useState('');

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  async function requestReset(values) {
    setServerError('');
    try {
      const { data } = await api.post('/auth/forgot-password', values);
      // In dev the API returns the reset token so we can complete the flow without email.
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setStage('reset');
      } else {
        setStage('done');
      }
    } catch (err) {
      setServerError(apiError(err));
    }
  }

  async function submitReset(values) {
    setServerError('');
    try {
      await api.post('/auth/reset-password', { token: resetToken, password: values.password });
      setStage('done');
    } catch (err) {
      setServerError(apiError(err));
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle={
        stage === 'reset' ? 'Choose a new password' : 'We’ll help you get back into your account'
      }
      footer={
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {serverError}
        </div>
      )}

      {stage === 'request' && (
        <form onSubmit={emailForm.handleSubmit(requestReset)} className="space-y-4">
          <Field label="Email" error={emailForm.formState.errors.email?.message}>
            <Input type="email" placeholder="name@company.com" {...emailForm.register('email')} />
          </Field>
          <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting && <Spinner />}
            Send reset link
          </Button>
        </form>
      )}

      {stage === 'reset' && (
        <form onSubmit={resetForm.handleSubmit(submitReset)} className="space-y-4">
          <div className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
            Dev mode: reset token issued directly. Enter a new password below.
          </div>
          <Field label="New password" error={resetForm.formState.errors.password?.message}>
            <Input type="password" placeholder="••••••••" {...resetForm.register('password')} />
          </Field>
          <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
            {resetForm.formState.isSubmitting && <Spinner />}
            Update password
          </Button>
        </form>
      )}

      {stage === 'done' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-fg-muted">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
