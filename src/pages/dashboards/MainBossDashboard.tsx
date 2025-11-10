import { Factory, Users, TrendingUp, DollarSign } from 'lucide-react'

export default function MainBossDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Main Boss Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Overview of all factories and operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Total Factories"
          value="5"
          icon={Factory}
          color="blue"
          change="+2 this month"
        />
        <StatsCard
          title="Total Production"
          value="1,234 kg"
          icon={TrendingUp}
          color="green"
          change="+12% from last month"
        />
        <StatsCard
          title="Total Revenue"
          value="$45,678"
          icon={DollarSign}
          color="purple"
          change="+8% from last month"
        />
        <StatsCard
          title="Active Users"
          value="23"
          icon={Users}
          color="orange"
          change="2 new this week"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Factory Performance</h3>
          <div className="h-48 sm:h-64 flex items-center justify-center text-gray-500">
            <p className="text-sm sm:text-base text-center">Chart: Production by Factory (Chart.js integration)</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Chart: Monthly Revenue (Chart.js integration)</p>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Approved Reports</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-cell">Factory</th>
                <th className="table-cell">Date</th>
                <th className="table-cell">Production (kg)</th>
                <th className="table-cell">Revenue</th>
                <th className="table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="table-cell font-medium">Factory A</td>
                <td className="table-cell">2025-10-21</td>
                <td className="table-cell">250 kg</td>
                <td className="table-cell">$5,200</td>
                <td className="table-cell">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Approved
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  icon: any
  color: string
  change: string
}

function StatsCard({ title, value, icon: Icon, color, change }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{change}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex-shrink-0 ml-2`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  )
}
