import { LoginForm } from '@/components/auth/login-form'
import { Home } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600">
            <Home className="h-5 w-5 text-white" />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">KEJA Enterprise</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
