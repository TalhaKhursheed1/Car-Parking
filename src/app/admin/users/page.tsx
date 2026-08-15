'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';

const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Active', joinDate: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Provider', status: 'Active', joinDate: '2024-01-20' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'User', status: 'Inactive', joinDate: '2024-02-01' },
  { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', role: 'Provider', status: 'Active', joinDate: '2024-02-10' },
  { id: 5, name: 'David Brown', email: 'david@example.com', role: 'User', status: 'Active', joinDate: '2024-02-15' },
];

export default function UsersPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors">
          ← Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: '1rem' }}>
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              User Activities
            </h1>
            <p className="text-base sm:text-lg text-white/70">
              Monitor user actions and activities
            </p>
          </div>
        </div>
        <Button variant="secondary" className="p-2 rounded-lg mt-4">Export Data</Button>

      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Join Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-sm text-white">{user.name}</td>
                  <td className="py-4 px-4 text-sm text-white/70">{user.email}</td>
                  <td className="py-4 px-4 text-sm">
                    <span 
                      className="px-4 py-2 rounded text-xs font-medium"
                      style={{
                        background: user.role === 'Provider' 
                          ? 'rgba(139, 92, 246, 0.2)' 
                          : 'rgba(59, 130, 246, 0.2)',
                        color: user.role === 'Provider' ? '#c4b5fd' : '#93c5fd',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span 
                      className="px-4 py-2 rounded text-xs font-medium"
                      style={{
                        background: user.status === 'Active' 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : 'rgba(239, 68, 68, 0.2)',
                        color: user.status === 'Active' ? '#86efac' : '#fca5a5',
                      }}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-white/70">{user.joinDate}</td>
                  <td className="py-4 px-4 text-sm">
                    <button
                      className="transition-colors"
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: 'none', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    </AuthGuard>
  );
}

