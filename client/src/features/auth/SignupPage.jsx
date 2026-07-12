import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput, PasswordChecklist, PASSWORD_POLICY } from '@/components/ui/password-input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().regex(PASSWORD_POLICY.regex, PASSWORD_POLICY.message),
});

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  const passwordValue = watch('password') || '';

  async function onSubmit(values) {
    setServerError('');
    try {
      await signup(values);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(apiError(err, 'Sign up failed'));
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with AssetFlow"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>Sign up creates an Employee account. Admin roles are assigned later by an administrator.</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" placeholder="Jane Doe" {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" placeholder="name@company.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" placeholder="••••••••" {...register('password')} />
          <PasswordChecklist value={passwordValue} />
        </Field>

        {serverError && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
