import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { LogIn, Factory, Mail, Lock, ArrowLeft, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Clear any existing session first
      await supabase.auth.signOut({ scope: 'local' })
      
      // Sign in with new credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        toast.success('Login successful!')
        navigate('/dashboard', { replace: true })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (role: 'boss' | 'manager' | 'factory') => {
    const credentials = {
      boss: { email: 'boss@nziza.com', password: 'boss123456' },
      manager: { email: 'manager@nziza.com', password: 'manager123456' },
      factory: { email: 'factory@nziza.com', password: 'factory123456' }
    }
    setEmail(credentials[role].email)
    setPassword(credentials[role].password)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding with hero image */}
      <div className="hidden lg:flex lg:w-1/2 p-0 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0">
          {/* Hero cheese factory image */}
          <img src="/images/hero-cheese.jpeg" alt="Cheese factory" className="w-full h-full object-cover object-center filter brightness-75" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="absolute inset-0 bg-black/45"></div>
        </div>

        <div className="relative z-10 p-12 flex flex-col justify-between h-full">
          <Link to="/" className="flex items-center text-white mb-8 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Home</span>
          </Link>

          <div>
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Factory className="w-8 h-8 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-3xl font-bold text-white">NZIZA Factory</h1>
                <p className="text-gray-200">Management System</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome back to your factory dashboard
            </h2>
            <p className="text-lg text-gray-200 mb-8 max-w-md">
              Manage your cheese production operations efficiently with real-time insights and comprehensive tools.
            </p>

            <div className="space-y-4 max-w-md">
              <div className="flex items-start text-white">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Real-time Production Tracking</div>
                  <div className="text-sm text-gray-200">Monitor every stage of production</div>
                </div>
              </div>
              <div className="flex items-start text-white">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Multi-Factory Management</div>
                  <div className="text-sm text-gray-200">Control multiple locations</div>
                </div>
              </div>
              <div className="flex items-start text-white">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">Advanced Analytics</div>
                  <div className="text-sm text-gray-200">Data-driven decisions</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 text-white">
            <div>
              <div className="text-2xl font-bold mb-1">100%</div>
              <div className="text-sm">Tracked</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">24/7</div>
              <div className="text-sm">Live</div>
            </div>
            <div>
              <div className="text-2xl font-bold mb-1">Secure</div>
              <div className="text-sm">Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center text-primary-600 mb-4 hover:text-primary-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center">
                <Factory className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">NZIZA Factory</h1>
            <p className="text-gray-600">Management System</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">Enter your credentials to access your account</p>
            </div>

            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Quick Login (Demo Accounts)
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill('boss')}
                  className="text-left px-3 py-2 bg-white hover:bg-blue-50 rounded-lg transition-colors text-xs border border-blue-100"
                >
                  <span className="font-semibold text-blue-900">Main Boss</span>
                  <span className="text-blue-600 block">boss@nziza.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('manager')}
                  className="text-left px-3 py-2 bg-white hover:bg-blue-50 rounded-lg transition-colors text-xs border border-blue-100"
                >
                  <span className="font-semibold text-blue-900">Senior Manager</span>
                  <span className="text-blue-600 block">manager@nziza.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('factory')}
                  className="text-left px-3 py-2 bg-white hover:bg-blue-50 rounded-lg transition-colors text-xs border border-blue-100"
                >
                  <span className="font-semibold text-blue-900">Factory Manager</span>
                  <span className="text-blue-600 block">factory@nziza.com</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-amber-500" />
                  </div>
                  <input
                    type="email"
                    className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-amber-500" />
                  </div>
                  <input
                    type="password"
                    className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-2 border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer" />
                  <span className="ml-2 text-sm text-gray-600 font-medium">Remember me</span>
                </label>
                <a href="#" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-base hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl hover:shadow-amber-500/50 focus:ring-4 focus:ring-amber-200 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
                  Contact Administrator
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  )
}
