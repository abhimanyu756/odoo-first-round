import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput, PasswordChecklist, PASSWORD_POLICY } from '@/components/ui/password-input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import { api, apiError } from '@/lib/api';

const emailSchema = z.object({ email: z.string().email('Enter a valid email') });
const resetSchema = z.object({ password: z.string().regex(PASSWORD_POLICY.regex, PASSWORD_POLICY.message) });

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  // If the user arrived via the emailed reset link, jump straight to reset.
  const [stage, setStage] = useState(tokenFromUrl ? 'reset' : 'request'); // request | reset | done
  const [resetToken, setResetToken] = useState(tokenFromUrl || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [serverError, setServerError] = useState('');

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  async function requestReset(values) {
    setServerError('');
    try {
      const { data } = await api.post('/auth/forgot-password', values);
      // Dev convenience: show the Ethereal email preview + allow inline reset.
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setStage('sent');
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

      {stage === 'sent' && (
        <div className="space-y-4">
          <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            ✉️ A reset link has been sent to your email. It’s valid for 30 minutes.
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info hover:underline"
            >
              Dev: open the test email →
            </a>
          )}
          <p className="text-center text-sm text-fg-muted">
            Or reset your password directly below.
          </p>
          <Button className="w-full" onClick={() => setStage('reset')}>
            Enter new password
          </Button>
        </div>
      )}

      {stage === 'reset' && (
        <form onSubmit={resetForm.handleSubmit(submitReset)} className="space-y-4">
          <Field label="New password" error={resetForm.formState.errors.password?.message}>
            <PasswordInput placeholder="••••••••" {...resetForm.register('password')} />
            <PasswordChecklist value={resetForm.watch('password') || ''} />
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
