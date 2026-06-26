'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api-client';
import { validateName, validatePhone, validateGST, sanitizeName, sanitizePhone } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Mail, Camera, Upload, FileText, Shield, KeyRound, Eye, X } from 'lucide-react';

export function ProfileContent() {
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
    gstNumber: (user as any)?.gstNumber || '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [aadharPreview, setAadharPreview] = useState<string | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  const [aadharSignedUrl, setAadharSignedUrl] = useState<string | null>(null);
  const [panSignedUrl, setPanSignedUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const isOrganiser = user?.role === 'ORGANISER';
  const userAny = user as any;

  useEffect(() => {
    if (!isOrganiser) return;
    const fetchSignedUrls = async () => {
      if (userAny?.aadharDocumentUrl) {
        try {
          const res = await apiClient.get('/upload/document-url', { params: { path: userAny.aadharDocumentUrl } });
          setAadharSignedUrl(res.data.data.url);
        } catch {}
      }
      if (userAny?.panDocumentUrl) {
        try {
          const res = await apiClient.get('/upload/document-url', { params: { path: userAny.panDocumentUrl } });
          setPanSignedUrl(res.data.data.url);
        } catch {}
      }
    };
    fetchSignedUrls();
  }, [isOrganiser, userAny?.aadharDocumentUrl, userAny?.panDocumentUrl]);

  const handleSaveProfile = async () => {
    const errors: Record<string, string | null> = {};
    errors.firstName = validateName(form.firstName, 'First name');
    errors.lastName = validateName(form.lastName, 'Last name');
    errors.phone = validatePhone(form.phone);
    if (isOrganiser) {
      errors.gstNumber = validateGST(form.gstNumber);
    }
    const hasErrors = Object.values(errors).some((e) => e !== null);
    setFieldErrors(errors);
    if (hasErrors) return;

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
        payload.gstNumber = form.gstNumber;
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

  const handleDocFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'AADHAR' | 'PAN',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Document must be under 5MB' });
      e.target.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPG, PNG, WebP, or PDF files are accepted' });
      e.target.value = '';
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    if (type === 'AADHAR') {
      setAadharFile(file);
      setAadharPreview(previewUrl);
    } else {
      setPanFile(file);
      setPanPreview(previewUrl);
    }
    setMessage(null);
  };

  const handleDocUpload = async (type: 'AADHAR' | 'PAN') => {
    const file = type === 'AADHAR' ? aadharFile : panFile;
    if (!file) return;

    const setUploading = type === 'AADHAR' ? setUploadingAadhar : setUploadingPan;
    setUploading(true);
    setMessage(null);

    const oldPath = type === 'AADHAR' ? userAny?.aadharDocumentUrl : userAny?.panDocumentUrl;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await apiClient.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const docPath = uploadRes.data.data.path;
      const fieldName = type === 'AADHAR' ? 'aadharDocumentUrl' : 'panDocumentUrl';
      const profileRes = await apiClient.patch('/users/profile', { [fieldName]: docPath });
      setUser(profileRes.data.data);

      if (oldPath) {
        try {
          await apiClient.delete('/upload/document', { data: { path: oldPath } });
        } catch {}
      }

      const signedRes = await apiClient.get('/upload/document-url', { params: { path: docPath } });
      if (type === 'AADHAR') {
        setAadharSignedUrl(signedRes.data.data.url);
        setAadharFile(null);
        setAadharPreview(null);
      } else {
        setPanSignedUrl(signedRes.data.data.url);
        setPanFile(null);
        setPanPreview(null);
      }

      setMessage({ type: 'success', text: `${type === 'AADHAR' ? 'Aadhaar' : 'PAN'} card uploaded successfully` });
    } catch {
      setMessage({ type: 'error', text: `Failed to upload ${type === 'AADHAR' ? 'Aadhaar' : 'PAN'} card` });
    } finally {
      setUploading(false);
    }
  };

  const cancelDocPreview = (type: 'AADHAR' | 'PAN') => {
    if (type === 'AADHAR') {
      if (aadharPreview) URL.revokeObjectURL(aadharPreview);
      setAadharFile(null);
      setAadharPreview(null);
      if (aadharInputRef.current) aadharInputRef.current.value = '';
    } else {
      if (panPreview) URL.revokeObjectURL(panPreview);
      setPanFile(null);
      setPanPreview(null);
      if (panInputRef.current) panInputRef.current.value = '';
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setSendingResetEmail(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: user.email });
      setResetEmailSent(true);
      setMessage({ type: 'success', text: 'Password reset link sent to your email' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to send reset email. Try again later.' });
    } finally {
      setSendingResetEmail(false);
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

  const profileCompleted = userAny.profileCompleted;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>

      {/* Alerts */}
      {isOrganiser && !profileCompleted && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">Complete your profile</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                Verify your email, add your name &amp; organisation, and upload both Aadhaar and PAN cards to start creating events.
              </p>
            </div>
          </div>
        </div>
      )}

      {!user.emailVerified && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">Email not verified</h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {isOrganiser
                  ? 'Please verify your email to complete your profile and create events.'
                  : 'Please verify your email to receive ticket confirmations and invoice emails.'}
              </p>
              {verificationSent ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Verification link sent! Check your inbox.
                </div>
              ) : (
                <Button
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
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
        <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Grid layout — 2 columns on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          {/* Profile Photo + Personal Info combined */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Profile</CardTitle>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Avatar row */}
              <div className="mb-4 flex items-center gap-4">
                <div className="relative">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xl font-bold text-orange-600 border-2 border-gray-200 dark:border-gray-700">
                      {user.firstName[0]}
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Camera className="h-3.5 w-3.5" />
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
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{uploadingAvatar ? 'Uploading...' : 'Photo is optional. Max 5MB.'}</p>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">First Name</Label>
                      <Input value={form.firstName} maxLength={50} error={fieldErrors.firstName ?? undefined} onChange={(e) => { setForm({ ...form, firstName: sanitizeName(e.target.value) }); setFieldErrors((prev) => ({ ...prev, firstName: null })); }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Last Name</Label>
                      <Input value={form.lastName} maxLength={50} error={fieldErrors.lastName ?? undefined} onChange={(e) => { setForm({ ...form, lastName: sanitizeName(e.target.value) }); setFieldErrors((prev) => ({ ...prev, lastName: null })); }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={user.email} disabled className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone} maxLength={15} error={fieldErrors.phone ?? undefined} onChange={(e) => { setForm({ ...form, phone: sanitizePhone(e.target.value) }); setFieldErrors((prev) => ({ ...prev, phone: null })); }} placeholder="+91 9876543210" />
                  </div>
                  {isOrganiser && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Organisation Name</Label>
                        <Input value={form.orgName} maxLength={100} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Your company or brand" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Organisation Description</Label>
                        <textarea
                          value={form.orgDescription}
                          onChange={(e) => setForm({ ...form, orgDescription: e.target.value })}
                          maxLength={500}
                          placeholder="Tell us about your organisation..."
                          className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:text-gray-100"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">GST Number <span className="text-gray-400">(Optional)</span></Label>
                        <Input value={form.gstNumber} maxLength={15} error={fieldErrors.gstNumber ?? undefined} onChange={(e) => { setForm({ ...form, gstNumber: e.target.value.toUpperCase() }); setFieldErrors((prev) => ({ ...prev, gstNumber: null })); }} placeholder="e.g. 22AAAAA0000A1Z5" />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setFieldErrors({}); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                        {user.emailVerified ? (
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{user.phone || 'Not set'}</p>
                    </div>
                  </div>
                  {isOrganiser && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Organisation</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{userAny.orgName || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">GST Number</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{userAny.gstNumber || 'Not provided'}</p>
                        </div>
                      </div>
                      {userAny.orgDescription && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Description</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{userAny.orgDescription}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Role</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{user.role}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Member since</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password + Policies side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Password</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                  Reset via email link.
                </p>
                {resetEmailSent ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2.5 text-xs text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    Reset link sent!
                  </div>
                ) : (
                  <Button
                    onClick={handleForgotPassword}
                    disabled={sendingResetEmail}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <KeyRound className="mr-2 h-3.5 w-3.5" />
                    {sendingResetEmail ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {isOrganiser && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Policies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <Link href="/organiser/privacy-policy" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Privacy Policy
                    </Link>
                    <Link href="/organiser/terms-of-service" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <FileText className="h-4 w-4 text-purple-500" />
                      Terms of Service
                    </Link>
                    <Link href="/organiser/refund-policy" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <KeyRound className="h-4 w-4 text-green-500" />
                      Refund Policy
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right column — ID verification (organiser only) */}
        {isOrganiser && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Aadhaar Card</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">Max 5MB &middot; JPG, PNG, WebP, PDF</p>
              </CardHeader>
              <CardContent>
                <DocumentUploadSection
                  label="Aadhaar Card"
                  type="AADHAR"
                  uploadedUrl={userAny.aadharDocumentUrl}
                  signedUrl={aadharSignedUrl}
                  previewUrl={aadharPreview}
                  selectedFile={aadharFile}
                  uploading={uploadingAadhar}
                  inputRef={aadharInputRef}
                  onFileSelect={(e) => handleDocFileSelect(e, 'AADHAR')}
                  onUpload={() => handleDocUpload('AADHAR')}
                  onCancel={() => cancelDocPreview('AADHAR')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">PAN Card</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">Max 5MB &middot; JPG, PNG, WebP, PDF</p>
              </CardHeader>
              <CardContent>
                <DocumentUploadSection
                  label="PAN Card"
                  type="PAN"
                  uploadedUrl={userAny.panDocumentUrl}
                  signedUrl={panSignedUrl}
                  previewUrl={panPreview}
                  selectedFile={panFile}
                  uploading={uploadingPan}
                  inputRef={panInputRef}
                  onFileSelect={(e) => handleDocFileSelect(e, 'PAN')}
                  onUpload={() => handleDocUpload('PAN')}
                  onCancel={() => cancelDocPreview('PAN')}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentUploadSection({
  label,
  type,
  uploadedUrl,
  signedUrl,
  previewUrl,
  selectedFile,
  uploading,
  inputRef,
  onFileSelect,
  onUpload,
  onCancel,
}: {
  label: string;
  type: 'AADHAR' | 'PAN';
  uploadedUrl: string | null;
  signedUrl: string | null;
  previewUrl: string | null;
  selectedFile: File | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
}) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const icon = type === 'AADHAR' ? <Upload className="h-5 w-5" /> : <FileText className="h-5 w-5" />;

  const block = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (!uploadedUrl || !signedUrl) return;

    const onVisibility = () => setBlurred(document.hidden);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        setBlurred(true);
        setTimeout(() => setBlurred(false), 2000);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', onKey);
    };
  }, [uploadedUrl, signedUrl]);

  const watermark = (size: 'sm' | 'lg' = 'sm') => (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 80px, rgba(0,0,0,0.04) 80px, rgba(0,0,0,0.04) 81px)`,
      }} />
      <div className="flex h-full w-full items-center justify-center">
        <p className={`rotate-[-30deg] font-bold whitespace-nowrap tracking-widest uppercase select-none ${size === 'sm' ? 'text-base text-black/5 dark:text-white/5' : 'text-3xl text-black/4 dark:text-white/4'}`}>
          CONFIDENTIAL
        </p>
      </div>
    </div>
  );

  if (selectedFile) {
    return (
      <div>
        <div className="rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/10 p-3">
          {previewUrl ? (
            <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <img src={previewUrl} alt={`${label} preview`} className="mx-auto max-h-48 w-auto object-contain p-2" />
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-white dark:bg-gray-800 p-2.5 border border-gray-200 dark:border-gray-700">
              <FileText className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={onUpload}
              disabled={uploading}
              size="sm"
              className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm" disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (uploadedUrl && signedUrl) {
    const isPdf = uploadedUrl.toLowerCase().endsWith('.pdf');

    return (
      <div className="protected-document">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">Uploaded</span>
        </div>

        {isPdf ? (
          <div
            className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 cursor-pointer"
            onClick={() => setShowFullPreview(true)}
            onContextMenu={block}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{label} (PDF)</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">Click to preview</span>
              </div>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        ) : (
          <div
            className="relative group cursor-pointer"
            onClick={() => setShowFullPreview(true)}
            onContextMenu={block}
            onDragStart={block}
          >
            <div className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-all duration-300 ${blurred ? 'blur-xl' : ''}`}>
              {!imageLoaded && (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
                </div>
              )}
              <img
                src={signedUrl}
                alt={label}
                draggable={false}
                onContextMenu={block}
                onDragStart={block}
                className={`mx-auto max-h-48 w-auto object-contain p-2 transition-opacity select-none pointer-events-none ${imageLoaded ? 'opacity-100' : 'h-0 opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
            {watermark('sm')}
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <Eye className="h-6 w-6 text-white drop-shadow-md" />
            </div>
          </div>
        )}

        {showFullPreview && createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4 protected-document"
            onClick={() => setShowFullPreview(false)}
            onContextMenu={block}
          >
            <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowFullPreview(false)}
                className="absolute -right-3 -top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              <div className={`relative transition-all duration-300 ${blurred ? 'blur-xl' : ''}`} onContextMenu={block}>
                {isPdf ? (
                  <div className="relative">
                    <iframe
                      src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                      className="h-[85vh] w-[85vw] max-w-3xl rounded-lg bg-white"
                    />
                    <div className="pointer-events-none absolute inset-0 z-10" />
                  </div>
                ) : (
                  <>
                    <img
                      src={signedUrl}
                      alt={label}
                      draggable={false}
                      onContextMenu={block}
                      onDragStart={block}
                      className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain bg-white dark:bg-gray-900 shadow-2xl select-none pointer-events-none"
                    />
                    {watermark('lg')}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium"
        >
          Re-upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={onFileSelect}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-5 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
          {icon}
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Click to select file</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}
