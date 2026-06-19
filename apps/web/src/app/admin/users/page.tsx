'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Search, Eye, X, Phone, Mail, Calendar, Shield, Building } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  orgName: string | null;
  orgDescription: string | null;
  avatarUrl: string | null;
  statusReason: string | null;
  emailVerified: boolean;
  idDocumentType: string | null;
  profileCompleted: boolean;
  createdAt: string;
  _count: { events: number };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const roleColors: Record<string, string> = {
  CUSTOMER: 'bg-blue-100 text-blue-700',
  ORGANISER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-gray-800 text-white',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<User | null>(null);
  const [statusReason, setSuspendReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await apiClient.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (userId: string, status: string, reason?: string) => {
    setActionLoading(userId);
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { status, reason });
      fetchUsers();
      setShowSuspendModal(null);
      setSuspendReason('');
      setSelectedUser(null);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users ({total})</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
          </div>
          <Button type="submit" size="sm">Search</Button>
        </form>
        <div className="flex gap-2">
          {['', 'CUSTOMER', 'ORGANISER', 'ADMIN'].map((r) => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={cn('rounded-full px-3 py-1 text-xs font-medium', roleFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {r || 'All Roles'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['', 'ACTIVE', 'PENDING', 'SUSPENDED'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn('rounded-full px-3 py-1 text-xs font-medium', statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-gray-200" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    {user.orgName && <p className="text-xs text-purple-600">{user.orgName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-600">{user.email}</p>
                    {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleColors[user.role])}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[user.status])}>{user.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user._count.events}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedUser(user)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {user.role !== 'ADMIN' && (
                        <>
                          {user.status !== 'ACTIVE' && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-green-600" onClick={() => handleStatusChange(user.id, 'ACTIVE')} disabled={actionLoading === user.id}>
                              Activate
                            </Button>
                          )}
                          {user.status !== 'SUSPENDED' && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-red-600" onClick={() => { setShowSuspendModal(user); setSuspendReason(''); }} disabled={actionLoading === user.id}>
                              Suspend
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="px-4 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-600">
                      {selectedUser.firstName[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleColors[selectedUser.role])}>{selectedUser.role}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[selectedUser.status])}>{selectedUser.status}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {selectedUser.email}
                  {selectedUser.emailVerified && <span className="text-xs text-green-600">(Verified)</span>}
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selectedUser.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Joined {new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>

                {selectedUser.role === 'ORGANISER' && (
                  <>
                    {selectedUser.orgName && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="h-4 w-4 text-gray-400" />
                        {selectedUser.orgName}
                      </div>
                    )}
                    {selectedUser.orgDescription && (
                      <p className="text-gray-500 pl-6">{selectedUser.orgDescription}</p>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Shield className="h-4 w-4 text-gray-400" />
                      ID: {selectedUser.idDocumentType || 'Not uploaded'} | Profile: {selectedUser.profileCompleted ? 'Complete' : 'Incomplete'}
                    </div>
                    <div className="text-gray-600 pl-6">Events created: {selectedUser._count.events}</div>
                  </>
                )}

                {selectedUser.statusReason && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 mt-3">
                    <p className="text-xs font-medium text-red-700">Suspension Reason:</p>
                    <p className="mt-1 text-sm text-red-600">{selectedUser.statusReason}</p>
                  </div>
                )}
              </div>

              {selectedUser.role !== 'ADMIN' && (
                <div className="mt-6 flex gap-2 border-t border-gray-200 pt-4">
                  {selectedUser.status !== 'ACTIVE' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(selectedUser.id, 'ACTIVE')} disabled={!!actionLoading}>
                      Activate
                    </Button>
                  )}
                  {selectedUser.status !== 'SUSPENDED' && (
                    <Button size="sm" variant="destructive" onClick={() => { setShowSuspendModal(selectedUser); setSuspendReason(''); }} disabled={!!actionLoading}>
                      Suspend
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suspend Reason Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Suspend User</h2>
            <p className="mt-1 text-sm text-gray-500">
              Suspending <strong>{showSuspendModal.firstName} {showSuspendModal.lastName}</strong> ({showSuspendModal.email}).
              This user will see the suspension reason on their dashboard.
            </p>
            <textarea
              placeholder="Reason for suspension (required)..."
              value={statusReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
              rows={3}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSuspendModal(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleStatusChange(showSuspendModal.id, 'SUSPENDED', statusReason)} disabled={!statusReason.trim() || !!actionLoading}>
                {actionLoading ? 'Suspending...' : 'Confirm Suspend'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
