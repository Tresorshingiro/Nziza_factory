export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User & Permission Management</h1>
          <p className="text-gray-600 mt-2">Manage users, roles, and permissions (Senior Manager Only)</p>
        </div>
        <button className="btn btn-primary">+ Add New User</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Main Boss</h3>
          <p className="text-3xl font-bold text-purple-600">1</p>
          <p className="text-sm text-gray-600 mt-1">Full system access</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Senior Managers</h3>
          <p className="text-3xl font-bold text-blue-600">3</p>
          <p className="text-sm text-gray-600 mt-1">Manage users & review reports</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Factory Managers</h3>
          <p className="text-3xl font-bold text-green-600">19</p>
          <p className="text-sm text-gray-600 mt-1">Factory operations</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">All Users</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-cell">Name</th>
                <th className="table-cell">Email</th>
                <th className="table-cell">Role</th>
                <th className="table-cell">Factory</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="table-cell font-medium">John Doe</td>
                <td className="table-cell">john@nziza.com</td>
                <td className="table-cell">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Factory Manager
                  </span>
                </td>
                <td className="table-cell">Factory A</td>
                <td className="table-cell">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="table-cell">
                  <button className="text-blue-600 hover:underline mr-3">Edit Permissions</button>
                  <button className="text-red-600 hover:underline">Deactivate</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
