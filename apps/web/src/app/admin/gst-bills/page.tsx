'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Pencil, Eye, X, Download, Search, Loader2, Trash2 } from 'lucide-react';

interface GstBill {
  id: string;
  billNumber: string;
  billDate: string;
  organiserId: string;
  settlementId: string | null;
  companyName: string;
  companyGst: string | null;
  companyPan: string | null;
  companyAddress: string | null;
  orgName: string;
  orgGstNumber: string | null;
  orgAddress: string | null;
  description: string;
  hsnCode: string | null;
  quantity: number;
  rate: number;
  taxableAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  totalAmount: number;
  amountInWords: string | null;
  notes: string | null;
  createdAt: string;
  organiser: {
    id: string;
    firstName: string;
    lastName: string;
    orgName: string | null;
    email: string;
  };
  settlement: {
    id: string;
    status: string;
    netPayout: number;
    transactionRef: string | null;
  } | null;
}

interface Organiser {
  id: string;
  firstName: string;
  lastName: string;
  orgName: string | null;
  email: string;
  gstNumber: string | null;
}

interface SettlementOption {
  id: string;
  netPayout: number;
  transactionRef: string | null;
  processedAt: string | null;
  event: { title: string };
}

type ViewMode = 'list' | 'create' | 'edit' | 'preview';

export default function AdminGstBillsPage() {
  const [bills, setBills] = useState<GstBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedBill, setSelectedBill] = useState<GstBill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterOrganiser, setFilterOrganiser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/gst-bills');
      const data = res.data.data;
      setBills(Array.isArray(data) ? data : []);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const uniqueOrganisers = useMemo(() => {
    const map = new Map<string, string>();
    bills.forEach((b) => {
      if (!map.has(b.organiserId)) {
        map.set(b.organiserId, b.orgName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.billNumber.toLowerCase().includes(q) ||
          b.orgName.toLowerCase().includes(q) ||
          b.organiser.email.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterOrganiser && b.organiserId !== filterOrganiser) return false;
      if (filterDateFrom) {
        const billDate = new Date(b.billDate).toISOString().split('T')[0];
        if (billDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const billDate = new Date(b.billDate).toISOString().split('T')[0];
        if (billDate > filterDateTo) return false;
      }
      return true;
    });
  }, [bills, searchQuery, filterOrganiser, filterDateFrom, filterDateTo]);

  const hasFilters = filterOrganiser || filterDateFrom || filterDateTo;

  const handleCreated = () => {
    setViewMode('list');
    fetchBills();
  };

  const handleUpdated = () => {
    setViewMode('list');
    setSelectedBill(null);
    fetchBills();
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/gst-bills/${id}`);
      setDeleteConfirm(null);
      fetchBills();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to delete GST bill');
    } finally {
      setDeleting(false);
    }
  };

  if (viewMode === 'create') {
    return <GstBillForm onCancel={() => setViewMode('list')} onSuccess={handleCreated} />;
  }

  if (viewMode === 'edit' && selectedBill) {
    return <GstBillForm bill={selectedBill} onCancel={() => { setViewMode('list'); setSelectedBill(null); }} onSuccess={handleUpdated} />;
  }

  if (viewMode === 'preview' && selectedBill) {
    return <GstBillPreview bill={selectedBill} onBack={() => { setViewMode('list'); setSelectedBill(null); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">GST Bills</h1>
        <Button onClick={() => setViewMode('create')} className="bg-gradient-to-r from-[#FF541F] to-[#ff6b3d] hover:from-[#e64a1a] hover:to-[#ff541f] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by bill number, organiser name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Organiser</label>
              <select
                value={filterOrganiser}
                onChange={(e) => setFilterOrganiser(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              >
                <option value="">All Organisers</option>
                {uniqueOrganisers.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From Date</label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To Date</label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterOrganiser(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete GST Bill</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this bill? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">No GST bills found</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              {hasFilters || searchQuery ? 'Try adjusting your filters' : 'Create your first GST bill'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Bill No.</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Organiser</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Taxable</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">{bill.billNumber}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {new Date(bill.billDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{bill.orgName}</p>
                      {bill.orgGstNumber && <p className="text-xs text-gray-500 dark:text-gray-400">{bill.orgGstNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 hidden md:table-cell max-w-[200px] truncate">
                      {bill.description}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      ₹{Number(bill.taxableAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                      ₹{Number(bill.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedBill(bill); setViewMode('preview'); }}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedBill(bill); setViewMode('edit'); }}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(bill.id)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function GstBillForm({
  bill,
  onCancel,
  onSuccess,
}: {
  bill?: GstBill;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!bill;
  const [saving, setSaving] = useState(false);
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [settlements, setSettlements] = useState<SettlementOption[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  const [form, setForm] = useState({
    organiserId: bill?.organiserId || '',
    settlementId: bill?.settlementId || '',
    billDate: bill ? new Date(bill.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    companyName: bill?.companyName || 'ThooviTickets',
    companyGst: bill?.companyGst || '',
    companyPan: bill?.companyPan || '',
    companyAddress: bill?.companyAddress || '',
    orgName: bill?.orgName || '',
    orgGstNumber: bill?.orgGstNumber || '',
    orgAddress: bill?.orgAddress || '',
    description: bill?.description || '',
    hsnCode: bill?.hsnCode || '',
    quantity: bill?.quantity || 1,
    rate: bill ? Number(bill.rate) : 0,
    cgstPercent: bill ? Number(bill.cgstPercent) : 9,
    sgstPercent: bill ? Number(bill.sgstPercent) : 9,
    igstPercent: bill ? Number(bill.igstPercent) : 0,
    notes: bill?.notes || '',
  });

  const taxableAmount = form.quantity * form.rate;
  const cgstAmount = (taxableAmount * form.cgstPercent) / 100;
  const sgstAmount = (taxableAmount * form.sgstPercent) / 100;
  const igstAmount = (taxableAmount * form.igstPercent) / 100;
  const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

  useEffect(() => {
    apiClient.get('/gst-bills/organisers').then((res) => {
      const data = res.data.data;
      setOrganisers(Array.isArray(data) ? data : []);
    }).catch(() => setOrganisers([]));
  }, []);

  useEffect(() => {
    if (!form.organiserId) {
      setSettlements([]);
      return;
    }
    setLoadingSettlements(true);
    apiClient.get(`/gst-bills/organiser/${form.organiserId}/settlements`).then((res) => {
      const data = res.data.data;
      setSettlements(Array.isArray(data) ? data : []);
    }).catch(() => setSettlements([])).finally(() => setLoadingSettlements(false));
  }, [form.organiserId]);

  const handleOrganiserChange = (organiserId: string) => {
    const org = organisers.find((o) => o.id === organiserId);
    setForm((f) => ({
      ...f,
      organiserId,
      settlementId: '',
      orgName: org?.orgName || `${org?.firstName || ''} ${org?.lastName || ''}`.trim(),
      orgGstNumber: org?.gstNumber || '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.organiserId || !form.description || !form.rate) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        billDate: form.billDate,
        companyName: form.companyName || 'ThooviTickets',
        companyGst: form.companyGst || undefined,
        companyPan: form.companyPan || undefined,
        companyAddress: form.companyAddress || undefined,
        orgName: form.orgName,
        orgGstNumber: form.orgGstNumber || undefined,
        orgAddress: form.orgAddress || undefined,
        description: form.description,
        hsnCode: form.hsnCode || undefined,
        quantity: form.quantity,
        rate: form.rate,
        cgstPercent: form.cgstPercent,
        sgstPercent: form.sgstPercent,
        igstPercent: form.igstPercent,
        notes: form.notes || undefined,
      };

      if (isEdit) {
        await apiClient.patch(`/gst-bills/${bill.id}`, payload);
      } else {
        await apiClient.post('/gst-bills', {
          ...payload,
          organiserId: form.organiserId,
          settlementId: form.settlementId || undefined,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || `Failed to ${isEdit ? 'update' : 'create'} GST bill`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
          {isEdit ? 'Edit GST Bill' : 'Create GST Bill'}
        </h1>
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Company (From) Details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">From (Your Company)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Company Name</label>
                  <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">GST Number</label>
                  <Input value={form.companyGst} onChange={(e) => setForm((f) => ({ ...f, companyGst: e.target.value }))} placeholder="e.g. 33AABCT1234F1ZP" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">PAN Number</label>
                  <Input value={form.companyPan} onChange={(e) => setForm((f) => ({ ...f, companyPan: e.target.value }))} placeholder="e.g. AABCT1234F" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Address</label>
                  <Input value={form.companyAddress} onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))} placeholder="Registered address" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organiser & Settlement */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bill To (Organiser)</h3>

              {!isEdit && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Select Organiser *</label>
                  <select
                    value={form.organiserId}
                    onChange={(e) => handleOrganiserChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  >
                    <option value="">-- Select Organiser --</option>
                    {organisers.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.orgName || `${org.firstName} ${org.lastName}`} ({org.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.organiserId && !isEdit && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Link to Settlement (Optional)</label>
                  {loadingSettlements ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                  ) : (
                    <select
                      value={form.settlementId}
                      onChange={(e) => setForm((f) => ({ ...f, settlementId: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="">-- No Settlement --</option>
                      {settlements.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.event.title} - ₹{Number(s.netPayout).toLocaleString('en-IN')} {s.transactionRef ? `(Ref: ${s.transactionRef})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Organiser / Company Name *</label>
                  <Input value={form.orgName} onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">GST Number</label>
                  <Input value={form.orgGstNumber} onChange={(e) => setForm((f) => ({ ...f, orgGstNumber: e.target.value }))} placeholder="e.g. 33AABCT1234F1ZP" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Address</label>
                <Input value={form.orgAddress} onChange={(e) => setForm((f) => ({ ...f, orgAddress: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* Bill Details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bill Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Bill Date *</label>
                  <Input type="date" value={form.billDate} onChange={(e) => setForm((f) => ({ ...f, billDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">HSN/SAC Code</label>
                  <Input value={form.hsnCode} onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))} placeholder="e.g. 998599" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Description / Service *</label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Platform commission for event ticketing services" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Quantity</label>
                  <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Rate (₹) *</label>
                  <Input type="number" min={0} step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tax Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">CGST %</label>
                  <Input type="number" min={0} step="0.01" value={form.cgstPercent} onChange={(e) => setForm((f) => ({ ...f, cgstPercent: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">SGST %</label>
                  <Input type="number" min={0} step="0.01" value={form.sgstPercent} onChange={(e) => setForm((f) => ({ ...f, sgstPercent: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">IGST %</label>
                  <Input type="number" min={0} step="0.01" value={form.igstPercent} onChange={(e) => setForm((f) => ({ ...f, igstPercent: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  placeholder="Additional notes..."
                />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-gradient-to-r from-[#FF541F] to-[#ff6b3d] hover:from-[#e64a1a] hover:to-[#ff541f] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEdit ? 'Update Bill' : 'Generate Bill'}
          </Button>
        </div>

        {/* Right: Live Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Live Preview</h3>
            <BillCard
              billNumber={isEdit ? bill.billNumber : 'TT/GST/XXXX/XXXX'}
              billDate={form.billDate}
              companyName={form.companyName}
              companyGst={form.companyGst}
              companyPan={form.companyPan}
              companyAddress={form.companyAddress}
              orgName={form.orgName}
              orgGstNumber={form.orgGstNumber}
              orgAddress={form.orgAddress}
              description={form.description}
              hsnCode={form.hsnCode}
              quantity={form.quantity}
              rate={form.rate}
              taxableAmount={taxableAmount}
              cgstPercent={form.cgstPercent}
              cgstAmount={cgstAmount}
              sgstPercent={form.sgstPercent}
              sgstAmount={sgstAmount}
              igstPercent={form.igstPercent}
              igstAmount={igstAmount}
              totalAmount={totalAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GstBillPreview({ bill, onBack }: { bill: GstBill; onBack: () => void }) {
  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateBillHtml(bill);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">GST Bill - {bill.billNumber}</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownload} className="bg-gradient-to-r from-[#FF541F] to-[#ff6b3d] hover:from-[#e64a1a] hover:to-[#ff541f] text-white">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="ghost" onClick={onBack}>
            <X className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <BillCard
          billNumber={bill.billNumber}
          billDate={new Date(bill.billDate).toISOString().split('T')[0]}
          companyName={bill.companyName}
          companyGst={bill.companyGst || ''}
          companyPan={bill.companyPan || ''}
          companyAddress={bill.companyAddress || ''}
          orgName={bill.orgName}
          orgGstNumber={bill.orgGstNumber || ''}
          orgAddress={bill.orgAddress || ''}
          description={bill.description}
          hsnCode={bill.hsnCode || ''}
          quantity={bill.quantity}
          rate={Number(bill.rate)}
          taxableAmount={Number(bill.taxableAmount)}
          cgstPercent={Number(bill.cgstPercent)}
          cgstAmount={Number(bill.cgstAmount)}
          sgstPercent={Number(bill.sgstPercent)}
          sgstAmount={Number(bill.sgstAmount)}
          igstPercent={Number(bill.igstPercent)}
          igstAmount={Number(bill.igstAmount)}
          totalAmount={Number(bill.totalAmount)}
          amountInWords={bill.amountInWords || undefined}
          notes={bill.notes || undefined}
        />
      </div>
    </div>
  );
}

function BillCard({
  billNumber,
  billDate,
  companyName,
  companyGst,
  companyPan,
  companyAddress,
  orgName,
  orgGstNumber,
  orgAddress,
  description,
  hsnCode,
  quantity,
  rate,
  taxableAmount,
  cgstPercent,
  cgstAmount,
  sgstPercent,
  sgstAmount,
  igstPercent,
  igstAmount,
  totalAmount,
  amountInWords,
  notes,
}: {
  billNumber: string;
  billDate: string;
  companyName: string;
  companyGst: string;
  companyPan: string;
  companyAddress: string;
  orgName: string;
  orgGstNumber: string;
  orgAddress: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  taxableAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  totalAmount: number;
  amountInWords?: string;
  notes?: string;
}) {
  const formattedDate = billDate ? new Date(billDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '';

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF541F] to-[#ff6b3d] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{companyName || 'ThooviTickets'}</h2>
            <p className="text-orange-100 text-xs">Event Ticketing Platform</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold text-white">TAX INVOICE</h3>
            <p className="text-orange-100 text-xs">GST Bill</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Bill Info */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Bill Number</p>
            <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">{billNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 dark:text-gray-400 text-xs">Bill Date</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{formattedDate}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* From / To */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">From</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{companyName || 'ThooviTickets'}</p>
            {companyGst && <p className="text-gray-600 dark:text-gray-400 text-xs">GST: {companyGst}</p>}
            {companyPan && <p className="text-gray-600 dark:text-gray-400 text-xs">PAN: {companyPan}</p>}
            {companyAddress && <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{companyAddress}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{orgName || '—'}</p>
            {orgGstNumber && <p className="text-gray-600 dark:text-gray-400 text-xs">GST: {orgGstNumber}</p>}
            {orgAddress && <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{orgAddress}</p>}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Items Table */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                {hsnCode && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">HSN</th>}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">1</td>
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{description || '—'}</td>
                {hsnCode && <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{hsnCode}</td>}
                <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">{quantity}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Breakdown */}
        <div className="flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Taxable Amount</span>
              <span className="text-gray-900 dark:text-gray-100">₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {cgstPercent > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">CGST ({cgstPercent}%)</span>
                <span className="text-gray-900 dark:text-gray-100">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {sgstPercent > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">SGST ({sgstPercent}%)</span>
                <span className="text-gray-900 dark:text-gray-100">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {igstPercent > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">IGST ({igstPercent}%)</span>
                <span className="text-gray-900 dark:text-gray-100">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold">
              <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
              <span className="text-[#FF541F]">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        {amountInWords && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md px-4 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Amount in Words</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{amountInWords}</p>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">This is a computer-generated invoice and does not require a signature.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{companyName || 'ThooviTickets'} - Event Ticketing Platform</p>
        </div>
      </div>
    </div>
  );
}

function generateBillHtml(bill: GstBill): string {
  const formattedDate = new Date(bill.billDate).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  const f = (n: number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const companyName = bill.companyName || 'ThooviTickets';

  return `<!DOCTYPE html>
<html>
<head>
  <title>GST Bill - ${bill.billNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; padding: 20px; }
    .bill { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; }
    .header { background: linear-gradient(135deg, #FF541F, #ff6b3d); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
    .header h2 { font-size: 22px; font-weight: 700; }
    .header .sub { color: #fed7aa; font-size: 11px; }
    .header .right { text-align: right; }
    .header h3 { font-size: 18px; font-weight: 700; }
    .content { padding: 32px; }
    .bill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .bill-info .label { color: #6b7280; font-size: 11px; }
    .bill-info .value { font-weight: 600; font-size: 14px; font-family: monospace; }
    .divider { border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .parties { display: flex; gap: 40px; margin-bottom: 16px; }
    .parties .party { flex: 1; }
    .parties .title { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
    .parties .name { font-weight: 600; font-size: 14px; }
    .parties .detail { color: #4b5563; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    thead tr { background: #f9fafb; }
    th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals-row .label { color: #6b7280; }
    .totals-total { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; font-size: 15px; border-top: 1px solid #e5e7eb; margin-top: 4px; }
    .totals-total .amount { color: #FF541F; }
    .words { background: #f9fafb; padding: 10px 16px; border-radius: 6px; margin: 16px 0; }
    .words .label { color: #6b7280; font-size: 11px; }
    .words .value { font-weight: 500; font-size: 13px; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px; }
    @media print { body { padding: 0; } .bill { border: none; } }
  </style>
</head>
<body>
  <div class="bill">
    <div class="header">
      <div>
        <h2>${companyName}</h2>
        <p class="sub">Event Ticketing Platform</p>
      </div>
      <div class="right">
        <h3>TAX INVOICE</h3>
        <p class="sub">GST Bill</p>
      </div>
    </div>
    <div class="content">
      <div class="bill-info">
        <div><p class="label">Bill Number</p><p class="value">${bill.billNumber}</p></div>
        <div style="text-align:right"><p class="label">Bill Date</p><p class="value">${formattedDate}</p></div>
      </div>
      <div class="divider"></div>
      <div class="parties">
        <div class="party">
          <p class="title">From</p>
          <p class="name">${companyName}</p>
          ${bill.companyGst ? `<p class="detail">GST: ${bill.companyGst}</p>` : ''}
          ${bill.companyPan ? `<p class="detail">PAN: ${bill.companyPan}</p>` : ''}
          ${bill.companyAddress ? `<p class="detail">${bill.companyAddress}</p>` : ''}
        </div>
        <div class="party">
          <p class="title">Bill To</p>
          <p class="name">${bill.orgName}</p>
          ${bill.orgGstNumber ? `<p class="detail">GST: ${bill.orgGstNumber}</p>` : ''}
          ${bill.orgAddress ? `<p class="detail">${bill.orgAddress}</p>` : ''}
        </div>
      </div>
      <div class="divider"></div>
      <table>
        <thead><tr><th>#</th><th>Description</th>${bill.hsnCode ? '<th>HSN</th>' : ''}<th class="text-center">Qty</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
        <tbody><tr><td>1</td><td>${bill.description}</td>${bill.hsnCode ? `<td>${bill.hsnCode}</td>` : ''}<td class="text-center">${bill.quantity}</td><td class="text-right">₹${f(Number(bill.rate))}</td><td class="text-right">₹${f(Number(bill.taxableAmount))}</td></tr></tbody>
      </table>
      <div class="totals">
        <div class="totals-table">
          <div class="totals-row"><span class="label">Taxable Amount</span><span>₹${f(Number(bill.taxableAmount))}</span></div>
          ${Number(bill.cgstPercent) > 0 ? `<div class="totals-row"><span class="label">CGST (${bill.cgstPercent}%)</span><span>₹${f(Number(bill.cgstAmount))}</span></div>` : ''}
          ${Number(bill.sgstPercent) > 0 ? `<div class="totals-row"><span class="label">SGST (${bill.sgstPercent}%)</span><span>₹${f(Number(bill.sgstAmount))}</span></div>` : ''}
          ${Number(bill.igstPercent) > 0 ? `<div class="totals-row"><span class="label">IGST (${bill.igstPercent}%)</span><span>₹${f(Number(bill.igstAmount))}</span></div>` : ''}
          <div class="totals-total"><span>Total Amount</span><span class="amount">₹${f(Number(bill.totalAmount))}</span></div>
        </div>
      </div>
      ${bill.amountInWords ? `<div class="words"><p class="label">Amount in Words</p><p class="value">${bill.amountInWords}</p></div>` : ''}
      ${bill.notes ? `<p style="font-size:12px;color:#6b7280;margin:8px 0"><strong>Notes:</strong> ${bill.notes}</p>` : ''}
      <div class="footer">
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p style="margin-top:4px">${companyName} - Event Ticketing Platform</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
