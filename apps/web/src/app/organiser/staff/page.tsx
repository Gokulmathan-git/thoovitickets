'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Plus, Trash2, UserPlus, QrCode, Shield, Settings } from 'lucide-react';

interface StaffMember {
  id: string;
  accessLevel: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
  };
}

const accessLabels: Record<string, { label: string; icon: typeof QrCode; color: string }> = {
  SCANNER: { label: 'Scanner', icon: QrCode, color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  SUB_ADMIN: { label: 'Sub Admin', icon: Settings, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  FULL_ACCESS: { label: 'Full Access', icon: Shield, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
};

export default function OrganiserStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', accessLevel: 'SCANNER' });
  const [adding, setAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/staff');
      setStaff(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async () => {
    if (!addForm.email) return;
    setAdding(true);
    setError(null);
    try {
      await apiClient.post('/staff', addForm);
      setShowAddModal(false);
      setAddForm({ email: '', accessLevel: 'SCANNER' });
      fetchStaff();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to add staff');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    setActionLoading(member.id);
    try {
      await apiClient.patch(`/staff/${member.id}`, { isActive: !member.isActive });
      fetchStaff();
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeAccess = async (member: StaffMember, accessLevel: string) => {
    setActionLoading(member.id);
    try {
      await apiClient.patch(`/staff/${member.id}`, { accessLevel });
      fetchStaff();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (member: StaffMember) => {
    if (!confirm(`Remove ${member.user.firstName} ${member.user.lastName} from your staff?`)) return;
    setActionLoading(member.id);
    try {
      await apiClient.delete(`/staff/${member.id}`);
      fetchStaff();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Staff Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Add team members to help manage your events</p>
        </div>
        <Button onClick={() => { setShowAddModal(true); setError(null); }} className="self-start bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white sm:self-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No staff members yet</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Add team members by their customer account email</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => {
            const access = accessLabels[member.accessLevel] || accessLabels.SCANNER;
            const AccessIcon = access.icon;
            return (
              <Card key={member.id} className={!member.isActive ? 'opacity-50' : ''}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {member.user.avatarUrl ? (
                      <img src={member.user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-bold text-orange-600">
                        {member.user.firstName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{member.user.firstName} {member.user.lastName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <select
                      value={member.accessLevel}
                      onChange={(e) => handleChangeAccess(member, e.target.value)}
                      disabled={actionLoading === member.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="SCANNER">Scanner</option>
                      <option value="SUB_ADMIN">Sub Admin</option>
                      <option value="FULL_ACCESS">Full Access</option>
                    </select>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', access.color)}>
                      <AccessIcon className="inline h-3 w-3 mr-1" />
                      {access.label}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(member)}
                      disabled={actionLoading === member.id}
                      className={member.isActive ? 'text-amber-600' : 'text-green-600'}
                    >
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(member)}
                      disabled={actionLoading === member.id}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Staff Member</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the email of an existing customer account on ThooviTickets.
            </p>
            {error && <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="staff@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <select
                  value={addForm.accessLevel}
                  onChange={(e) => setAddForm({ ...addForm, accessLevel: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="SCANNER">Scanner — Scan tickets at events only</option>
                  <option value="SUB_ADMIN">Sub Admin — Manage events & analytics</option>
                  <option value="FULL_ACCESS">Full Access — Scanner + Sub Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding || !addForm.email} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                {adding ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
