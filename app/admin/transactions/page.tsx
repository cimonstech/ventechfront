'use client';

import { ADMIN_DATA_DENIED, isAccessDeniedStatus } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { useAccess } from '@/context/AccessContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  order_number: string;
  order_id?: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  payment_method: string;
  date: string;
  created_at: string;
}

export default function TransactionsPage() {
  const { canEdit } = useAccess();
  const canEditFinance = canEdit('finance');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | 'bulk' | null>(null);

  // Fetch real data from Supabase
  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setDenied(false);
      
      // Try backend API first (bypasses RLS)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        let apiUrl = `${API_URL}/api/transactions`;
        if (statusFilter !== 'all') {
          const dbStatus = statusFilter === 'completed' ? 'paid' : 
                          statusFilter === 'pending' ? 'pending' : 
                          statusFilter === 'failed' ? 'failed' : 
                          statusFilter === 'refunded' ? 'refunded' : statusFilter;
          apiUrl += `?status=${dbStatus}`;
        }

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
        });

        if (isAccessDeniedStatus(response.status)) {
          throw new Error(ADMIN_DATA_DENIED);
        }

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const formattedTransactions: Transaction[] = (result.data || []).map((tx: any) => ({
              id: tx.id,
              order_number: tx.order?.order_number || tx.metadata?.order_number || 'N/A',
              order_id: tx.order_id || tx.order?.id,
              customer_name: tx.customer_name || tx.user 
                ? `${tx.user?.first_name || ''} ${tx.user?.last_name || ''}`.trim() || tx.customer_email || 'Unknown'
                : tx.customer_email || 'Guest',
              customer_email: tx.customer_email || tx.user?.email || 'No email',
              amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) || 0 : (tx.amount || 0),
              status: tx.payment_status === 'paid' ? 'completed' : tx.payment_status === 'pending' ? 'pending' : tx.payment_status === 'failed' ? 'failed' : 'refunded',
              payment_method: tx.payment_method || 'paystack',
              date: new Date(tx.paid_at || tx.created_at).toLocaleDateString(),
              created_at: tx.created_at,
            }));
            setTransactions(formattedTransactions);
            return;
          }
        }
      } catch (apiError) {
        if (apiError instanceof Error && apiError.message === ADMIN_DATA_DENIED) throw apiError;
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback: Fetch transactions from Supabase
      let query = supabase
        .from('transactions')
        .select(`
          *,
          order:orders!transactions_order_id_fkey(id, order_number),
          user:users!transactions_user_id_fkey(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        // Map frontend status to database payment_status
        const dbStatus = statusFilter === 'completed' ? 'paid' : 
                        statusFilter === 'pending' ? 'pending' : 
                        statusFilter === 'failed' ? 'failed' : 
                        statusFilter === 'refunded' ? 'refunded' : statusFilter;
        query = query.eq('payment_status', dbStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        // Check if table doesn't exist
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.error('Transactions table does not exist or RLS is blocking access');
          toast.error('Transactions table not accessible. Please check database setup.');
        }
        throw error;
      }

      // Format transactions for display
      const formattedTransactions: Transaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        order_number: tx.order?.order_number || tx.metadata?.order_number || 'N/A',
        order_id: tx.order_id || tx.order?.id,
        customer_name: tx.metadata?.customer_name || tx.user 
          ? `${tx.user.first_name || ''} ${tx.user.last_name || ''}`.trim() || tx.customer_email || 'Unknown'
          : tx.customer_email || 'Guest',
        customer_email: tx.customer_email || tx.user?.email || 'No email',
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) || 0 : (tx.amount || 0),
        status: tx.payment_status === 'paid' ? 'completed' : tx.payment_status === 'pending' ? 'pending' : tx.payment_status === 'failed' ? 'failed' : 'refunded',
        payment_method: tx.payment_method || 'paystack',
        date: new Date(tx.paid_at || tx.created_at).toLocaleDateString(),
        created_at: tx.created_at,
      }));

      setTransactions(formattedTransactions);
      setLoaded(true);
      setFailed(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      const kind = noteQueryFail(error);
      if (kind === 'forbidden' || (error instanceof Error && error.message === ADMIN_DATA_DENIED)) {
        setDenied(true);
      } else if (kind !== 'unauthorized') {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'failed':
        return <XCircle size={16} className="text-red-600" />;
      case 'refunded':
        return <CheckCircle size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      {statusLabel(status)}
    </span>
  );

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.order_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const refundableSelected = filteredTransactions.filter(
    (transaction) => selectedTransactions.has(transaction.id) && transaction.status === 'completed'
  );

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const refundTransactions = async (items: Transaction[]) => {
    if (items.length === 0) {
      toast.error('Only completed transactions can be refunded');
      return;
    }

    setIsRefunding(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const refundPromises = items.map(async (transaction) => {
        const response = await fetch(`${API_URL}/api/transactions/${transaction.id}/refund`, {
          method: 'POST',
          headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Refund failed');
        }

        return response.json();
      });

      await Promise.all(refundPromises);

      toast.success(items.length === 1 ? 'Transaction refunded successfully' : `Successfully refunded ${items.length} transaction(s)`);
      setSelectedTransactions(new Set());
      setRefundTarget(null);
      fetchTransactions();
    } catch (error: any) {
      console.error('Error refunding transactions:', error);
      toast.error(error.message || 'Failed to refund transactions');
    } finally {
      setIsRefunding(false);
    }
  };

  const requestBulkRefund = () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction to refund');
      return;
    }
    if (refundableSelected.length === 0) {
      toast.error('Only completed transactions can be refunded');
      return;
    }
    setRefundTarget('bulk');
  };

  const requestSingleRefund = (transaction: Transaction) => {
    if (transaction.status !== 'completed') {
      toast.error('Only completed transactions can be refunded');
      return;
    }
    setRefundTarget(transaction);
  };

  const ready = loaded || (!loading && !failed && !denied);
  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + (t.status === 'completed' ? t.amount : 0),
    0
  );

  const refundActions = (transaction: Transaction) =>
    canEditFinance && transaction.status === 'completed'
      ? [{ label: 'Refund', destructive: true, onClick: () => requestSingleRefund(transaction) }]
      : [];

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Transactions"
        subtitle={`${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? '' : 's'}`}
        secondary={[
          {
            label: 'Export csv',
            icon: <Download size={16} />,
          },
        ]}
        extra={
          canEditFinance && selectedTransactions.size > 0 ? (
            <button
              type="button"
              onClick={requestBulkRefund}
              disabled={isRefunding}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
            >
              <RotateCcw size={16} />
              Refund selected ({selectedTransactions.size})
            </button>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total transactions</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {filteredTransactions.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {filteredTransactions.filter((t) => t.status === 'completed').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">
            {filteredTransactions.filter((t) => t.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total amount</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            GHS {totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by customer, email, or order"
        activeCount={statusFilter !== 'all' ? 1 : 0}
        onClear={() => setStatusFilter('all')}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClassName()}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </FilterBar>

      <LoadGate
        loaded={ready}
        loading={loading}
        updating={loading && ready}
        error={failed}
        forbidden={denied}
        isEmpty={filteredTransactions.length === 0}
        filtered={Boolean(searchQuery || statusFilter !== 'all')}
        onRetry={() => void fetchTransactions()}
        onClearFilters={() => {
          setSearchQuery('');
          setStatusFilter('all');
        }}
        skeleton={<TableSkeleton rows={8} />}
        emptyTitle="No transactions yet"
        emptyDescription="Completed payments will show up here."
        denyHome="/admin"
      >
        <ResponsiveTable
          headers={
            <tr>
              {canEditFinance ? (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                    aria-label="Select all transactions"
                  />
                </th>
              ) : null}
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredTransactions.map((transaction) => (
            <AdminRowCard
              key={transaction.id}
              name={transaction.order_number}
              status={statusBadge(transaction.status)}
              facts={[
                { label: 'Customer', value: transaction.customer_name },
                { label: 'Amount', value: `GHS ${transaction.amount.toFixed(2)}` },
                { label: 'Method', value: transaction.payment_method },
                { label: 'Date', value: new Date(transaction.created_at).toLocaleDateString() },
              ]}
              actions={
                <RowActions
                  name={transaction.order_number}
                  actions={refundActions(transaction)}
                />
              }
            />
          ))}
        >
          {filteredTransactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              {canEditFinance ? (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                    aria-label={`Select ${transaction.order_number}`}
                  />
                </td>
              ) : null}
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                  {transaction.order_number}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-[#1A1A1A]">
                  {transaction.customer_name}
                </p>
                <p className="text-sm text-[#3A3A3A]">
                  {transaction.customer_email}
                </p>
              </td>
              <td className="px-4 py-3">
                <span className="font-bold text-[#1A1A1A]">
                  GHS {transaction.amount.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {transaction.payment_method}
              </td>
              <td className="px-4 py-3">{statusBadge(transaction.status)}</td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {new Date(transaction.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions
                  name={transaction.order_number}
                  actions={refundActions(transaction)}
                />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </LoadGate>

      {refundTarget ? (
        <ConfirmDialog
          title={refundTarget === 'bulk' ? 'Refund these transactions?' : 'Refund this transaction?'}
          confirmLabel="Refund"
          busy={isRefunding}
          onClose={() => setRefundTarget(null)}
          onConfirm={() =>
            void refundTransactions(
              refundTarget === 'bulk' ? refundableSelected : [refundTarget]
            )
          }
        >
          {refundTarget === 'bulk'
            ? `${refundableSelected.length} completed transaction${refundableSelected.length === 1 ? '' : 's'} will be refunded.`
            : `${refundTarget.order_number} will be refunded.`}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
