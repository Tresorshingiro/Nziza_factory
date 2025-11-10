import { Link, useNavigate } from 'react-router-dom'
import { 
  Factory, 
  Users, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Package, 
  Clock, 
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  LogIn
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useEffect } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Factory className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">NZIZA Factory</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#services" className="text-gray-600 hover:text-gray-900">Services</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
            <Link 
              to="/login" 
              className="btn btn-primary"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32 lg:py-48 overflow-hidden min-h-[85vh] flex items-center">
        {/* Background image and overlay */}
        <div className="absolute inset-0">
          {/* Place the provided hero image at public/images/hero-cheese.jpg
              If the file is missing, the background will fall back to a muted gray. */}
          <img src="/images/hero-cheese.jpeg" alt="Cheese factory" className="w-full h-full object-cover object-center filter brightness-75" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-block mb-6">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">
                  🧀 Cheese Production Excellence
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                Complete Factory
                <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Management System</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-100 mb-10 leading-relaxed max-w-xl">
                Streamline your cheese production operations from milk collection to sales. 
                Efficient tracking, quality assurance, and consolidated reporting for multiple factories.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/login" 
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-2xl hover:shadow-amber-500/50 transition-all transform hover:scale-105 hover:-translate-y-1"
                >
                  <LogIn className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                  Get Started Free
                </Link>
                <a 
                  href="#features" 
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-md border-2 border-white/30 rounded-xl hover:bg-white/20 hover:border-white/50 transition-all"
                >
                  Learn More
                  <TrendingUp className="w-5 h-5 ml-2" />
                </a>
              </div>
            </div>

            {/* Right Content - enhanced preview card (hidden on small screens) */}
            <div className="relative hidden lg:block">
              <div className="bg-gradient-to-br from-white via-white to-gray-50 rounded-3xl shadow-2xl p-8 backdrop-blur-sm border border-gray-200/50 hover:shadow-amber-500/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Factory className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-xs text-gray-500 font-medium">Dashboard</div>
                      <div className="font-bold text-gray-900 text-lg">Factory Overview</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                    <span className="text-xs text-gray-600 font-semibold">Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200/50">
                    <div className="text-3xl font-extrabold text-blue-600 mb-1">1,247</div>
                    <div className="text-xs text-blue-700 font-medium">Liters Today</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200/50">
                    <div className="text-3xl font-extrabold text-green-600 mb-1">124kg</div>
                    <div className="text-xs text-green-700 font-medium">Produced</div>
                  </div>
                </div>

                <div className="bg-gradient-to-t from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-700">Production Trend</span>
                    <span className="text-xs text-green-600 font-bold">↑ 12%</span>
                  </div>
                  <div className="h-24 flex items-end justify-between gap-2">
                    <div className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-lg shadow-lg" style={{height: '45%'}}></div>
                    <div className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-lg shadow-lg" style={{height: '65%'}}></div>
                    <div className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-lg shadow-lg" style={{height: '85%'}}></div>
                    <div className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-lg shadow-lg" style={{height: '55%'}}></div>
                    <div className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-lg shadow-lg" style={{height: '75%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to manage your factory operations efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-User & Role Management</h3>
              <p className="text-gray-600">
                Hierarchical access control with roles for Main Boss, Senior Manager, and Factory Managers
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-secondary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Inventory Management</h3>
              <p className="text-gray-600">
                Dynamic multi-stock system with real-time tracking, alerts, and no fixed limits
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Factory className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Production Tracking</h3>
              <p className="text-gray-600">
                Track milk collection, production batches, and conversion ratios (10L milk = 1kg cheese)
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-secondary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sales & CRM</h3>
              <p className="text-gray-600">
                Manage orders, invoices, customer relationships, and track payment status
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Reports & Analytics</h3>
              <p className="text-gray-600">
                Daily reports, financial statements, and multi-factory analytics with PDF/Excel export
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="bg-secondary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Compliant</h3>
              <p className="text-gray-600">
                Row-level security, audit trails, and comprehensive access control
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive solutions for your factory management needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Service 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Clock className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold mb-2">Real-Time Operations</h3>
                  <p className="text-gray-600">
                    Monitor factory operations in real-time with live updates on production, 
                    inventory levels, and daily activities
                  </p>
                </div>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start">
                <div className="bg-secondary-100 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-secondary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold mb-2">Workflow Automation</h3>
                  <p className="text-gray-600">
                    Automated approval workflows for reports, expenses, and purchase orders 
                    with hierarchical review
                  </p>
                </div>
              </div>
            </div>

            {/* Service 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Users className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold mb-2">HR Management</h3>
                  <p className="text-gray-600">
                    Complete employee management with attendance tracking, payroll processing, 
                    and task assignment
                  </p>
                </div>
              </div>
            </div>

            {/* Service 4 */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-start">
                <div className="bg-secondary-100 p-3 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-secondary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold mb-2">Financial Reporting</h3>
                  <p className="text-gray-600">
                    Comprehensive financial reports including P&L statements, expense tracking, 
                    and revenue analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                About NZIZA Factory Management
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                NZIZA is a comprehensive factory management system designed specifically for 
                cheese production facilities. Our platform streamlines every aspect of your 
                operations, from milk collection to final product delivery.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                With multi-tenant architecture and role-based access control, NZIZA supports 
                multiple factories under one organization, each with their own managers and 
                staff, while providing senior management with consolidated oversight.
              </p>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">100%</div>
                  <div className="text-gray-600">Production Tracking</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                  <div className="text-gray-600">Real-time Monitoring</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">Secure</div>
                  <div className="text-gray-600">Data Protection</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">Multi</div>
                  <div className="text-gray-600">Factory Support</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl p-8">
              <div className="bg-white rounded-xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">Reduce operational costs by up to 30%</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">Improve production efficiency and tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">Better inventory management and waste reduction</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">Real-time reporting and analytics</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">Simplified compliance and audit trails</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We'd love to hear from you
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="card text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="text-gray-600">info@nzizafactory.com</p>
              <p className="text-gray-600">support@nzizafactory.com</p>
            </div>

            <div className="card text-center">
              <div className="bg-secondary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="text-gray-600">+250 788 000 000</p>
              <p className="text-gray-600">+250 788 111 111</p>
            </div>

            <div className="card text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-600">Kigali, Rwanda</p>
              <p className="text-gray-600">KG 123 St, Building 45</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Factory className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">NZIZA Factory</span>
              </div>
              <p className="text-gray-400">
                Complete factory management solution for cheese production facilities.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-white">Services</a></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">
              © {new Date().getFullYear()} NZIZA Factory Management. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
