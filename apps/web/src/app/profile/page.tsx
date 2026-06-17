'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Mail, Camera, Upload, FileText, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    orgName: (user as any)?.orgName || '',
    orgDescription: (user as any)?.orgDescription || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const isOrganiser = user?.role === 'ORGANISER';

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };
      if (isOrganiser) {
        payload.orgName = form.orgName;
        payload.orgDescription = form.orgDescription;
      }
      const res = await apiClient.patch('/users/profile', payload);
      setUser(res.data.data);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5MB' });
      return;
    }
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await apiClient.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = uploadRes.data.data.url;
      const profileRes = await apiClient.patch('/users/profile', { avatarUrl });
      setUser(profileRes.data.data);
      setMessage({ type: 'success', text: 'Profile photo updated' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'AADHAR' | 'PAN') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File must be under 5MB' });
      return;
    }
    setUploadingDoc(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await apiClient.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const idDocumentUrl = uploadRes.data.data.path;
      const profileRes = await apiClient.patch('/users/profile', { idDocumentUrl, idDocumentType: docType });
      setUser(profileRes.data.data);
      setMessage({ type: 'success', text: `${docType === 'AADHAR' ? 'Aadhar' : 'PAN'} card uploaded successfully` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload document' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setChangingPassword(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: user?.email });
      setVerificationSent(true);
    } catch {
      setMessage({ type: 'error', text: 'Failed to send verification email. Try again later.' });
    } finally {
      setResendingVerification(false);
    }
  };

  if (!user) return null;

  const userAny = user as any;
  const profileCompleted = userAny.profileCompleted;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile completion warning for organisers */}
      {isOrganiser && !profileCompleted && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Complete your profile</h3>
              <p className="mt-1 text-sm text-red-700">
                You must complete your profile before creating events. Upload a profile photo, verify your email, and submit an Aadhar or PAN card.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email verification warning */}
      {!user.emailVerified && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Email not verified</h3>
              <p className="mt-1 text-sm text-amber-700">
                {isOrganiser
                  ? 'Please verify your email to complete your profile and create events.'
                  : 'Please verify your email to receive ticket confirmations and invoice emails after purchase.'}
              </p>
              {verificationSent ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Verification link sent! Check your inbox.
                </div>
              ) : (
                <Button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {resendingVerification ? 'Sending...' : 'Send Verification Email'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-orange-600 border-2 border-gray-200">
                    {user.firstName[0]}
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-600 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">{uploadingAvatar ? 'Uploading...' : 'Click the camera icon to change photo'}</p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
                </div>
                {isOrganiser && (
                  <>
                    <div className="space-y-2">
                      <Label>Organisation Name</Label>
                      <Input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Your company or brand" />
                    </div>
                    <div className="space-y-2">
                      <Label>Organisation Description</Label>
                      <textarea
                        value={form.orgDescription}
                        onChange={(e) => setForm({ ...form, orgDescription: e.target.value })}
                        placeholder="Tell us about your organisation..."
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        rows={3}
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{user.email}</p>
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Not verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{user.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Role</p>
                    <p className="font-medium text-gray-900">{user.role}</p>
                  </div>
                </div>
                {isOrganiser && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500">Organisation</p>
                      <p className="font-medium text-gray-900">{userAny.orgName || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Description</p>
                      <p className="font-medium text-gray-900">{userAny.orgDescription || 'Not set'}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Member since</p>
                  <p className="font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ID Verification — organiser only */}
        {isOrganiser && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ID Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {userAny.idDocumentUrl ? (
                <div className="flex items-center gap-4 rounded-lg bg-green-50 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      {userAny.idDocumentType === 'AADHAR' ? 'Aadhar Card' : 'PAN Card'} uploaded
                    </p>
                    <p className="text-sm text-green-600">Your identity document has been submitted.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload your Aadhar Card or PAN Card for identity verification. Accepted formats: JPG, PNG, WebP, PDF (max 5MB).
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        docInputRef.current?.setAttribute('data-doc-type', 'AADHAR');
                        docInputRef.current?.click();
                      }}
                      disabled={uploadingDoc}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Aadhar Card</p>
                        <p className="text-xs text-gray-400">Image or PDF</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        docInputRef.current?.setAttribute('data-doc-type', 'PAN');
                        docInputRef.current?.click();
                      }}
                      disabled={uploadingDoc}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
                    >
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">PAN Card</p>
                        <p className="text-xs text-gray-400">Image or PDF</p>
                      </div>
                    </button>
                  </div>
                  {uploadingDoc && (
                    <p className="text-center text-sm text-orange-600">Uploading document...</p>
                  )}
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const docType = docInputRef.current?.getAttribute('data-doc-type') as 'AADHAR' | 'PAN';
                      handleDocUpload(e, docType);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
