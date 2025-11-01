'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Transaction {
  id: string;
  order_id: string;
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

  // Fetch real data from Supabase
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Transactions are typically derived from paid orders
      // For now, return empty array since there are no transactions yet
      // TODO: Implement transaction fetching when payment integration is ready
      setTransactions([]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
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
      transaction.order_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
                  <td colSpan={7} className="px-6 py-12 text-center text-[#3A3A3A]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        {transaction.order_id}
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
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye size={18} className="text-[#3A3A3A]" />
                      </button>
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



