'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isRefunding, setIsRefunding] = useState(false);

  // Fetch real data from Supabase
  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
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
            'Content-Type': 'application/json',
          },
        });

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
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      toast.error('Failed to load transactions. Please check console for details.');
    } finally {
      setLoading(false);
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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.order_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

  const handleBulkRefund = async () => {
    if (selectedTransactions.size === 0) {
      toast.error('Please select at least one transaction to refund');
      return;
    }

    const selected = Array.from(selectedTransactions);
    const transactionsToRefund = filteredTransactions.filter(t => selected.includes(t.id));
    
    // Only allow refunding completed transactions
    const refundableTransactions = transactionsToRefund.filter(t => t.status === 'completed');
    
    if (refundableTransactions.length === 0) {
      toast.error('Only completed transactions can be refunded');
      return;
    }

    if (!confirm(`Are you sure you want to refund ${refundableTransactions.length} transaction(s)?`)) {
      return;
    }

    setIsRefunding(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const refundPromises = refundableTransactions.map(async (transaction) => {
        const response = await fetch(`${API_URL}/api/transactions/${transaction.id}/refund`, {
          method: 'POST',
          headers: {
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
      
      toast.success(`Successfully refunded ${refundableTransactions.length} transaction(s)`);
      setSelectedTransactions(new Set());
      fetchTransactions();
    } catch (error: any) {
      console.error('Error refunding transactions:', error);
      toast.error(error.message || 'Failed to refund transactions');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleSingleRefund = async (transaction: Transaction) => {
    if (transaction.status !== 'completed') {
      toast.error('Only completed transactions can be refunded');
      return;
    }

    if (!confirm(`Are you sure you want to refund transaction ${transaction.order_number}?`)) {
      return;
    }

    setIsRefunding(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/transactions/${transaction.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Refund failed');
      }

      toast.success('Transaction refunded successfully');
      fetchTransactions();
    } catch (error: any) {
      console.error('Error refunding transaction:', error);
      toast.error(error.message || 'Failed to refund transaction');
    } finally {
      setIsRefunding(false);
    }
  };

  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + (t.status === 'completed' ? t.amount : 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {filteredTransactions.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {filteredTransactions.filter((t) => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">
            {filteredTransactions.filter((t) => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            GHS {totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by customer, email, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Bulk Actions */}
          {selectedTransactions.size > 0 && (
            <Button 
              variant="outline" 
              icon={<RotateCcw size={18} />}
              onClick={handleBulkRefund}
              disabled={isRefunding}
            >
              Refund Selected ({selectedTransactions.size})
            </Button>
          )}

          {/* Export */}
          <Button variant="outline" icon={<Download size={18} />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#3A3A3A]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        {transaction.order_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">
                          {transaction.customer_name}
                        </p>
                        <p className="text-sm text-[#3A3A3A]">
                          {transaction.customer_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#1A1A1A]">
                        GHS {transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#3A3A3A]">
                        {transaction.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#3A3A3A]">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {transaction.status === 'completed' ? (
                        <button
                          onClick={() => handleSingleRefund(transaction)}
                          disabled={isRefunding}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 disabled:opacity-50"
                          title="Refund transaction"
                        >
                          <RotateCcw size={18} />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



