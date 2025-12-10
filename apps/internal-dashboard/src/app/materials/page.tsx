'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  MaterialOrderDTO,
  MaterialSummaryDTO,
  MaterialOrderStatus,
  MaterialEtaStatus,
} from '@greenenergy/shared-types';

export default function MaterialsPage() {
  const [summary, setSummary] = useState<MaterialSummaryDTO | null>(null);
  const [orders, setOrders] = useState<MaterialOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MaterialOrderStatus | 'ALL'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [summaryRes, ordersRes] = await Promise.all([
        fetch('/api/v1/material-orders/summary'),
        fetch('/api/v1/material-orders'),
      ]);

      if (!summaryRes.ok || !ordersRes.ok) {
        throw new Error('Failed to fetch materials data');
      }

      const summaryData = await summaryRes.json();
      const ordersData = await ordersRes.json();

      setSummary(summaryData);
      setOrders(ordersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: MaterialOrderStatus) => {
    const colors: Record<MaterialOrderStatus, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      ORDERED: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      DELAYED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>
        {status}
      </span>
    );
  };

  const getEtaStatusBadge = (etaStatus: MaterialEtaStatus) => {
    switch (etaStatus) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            ON TRACK
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            AT RISK
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            LATE
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter orders
  let filteredOrders = orders;
  if (statusFilter !== 'ALL') {
    filteredOrders = filteredOrders.filter((o) => o.status === statusFilter);
  }
  if (supplierFilter) {
    filteredOrders = filteredOrders.filter((o) =>
      o.supplierName.toLowerCase().includes(supplierFilter.toLowerCase()),
    );
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading materials...</div>;
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Materials & ETA</h2>
          <p className="text-sm text-gray-600">
            Track material orders and delivery risk across all jobs.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Orders</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{summary.totalOrders}</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Open Orders</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">{summary.openOrders}</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Delayed Orders</div>
              <div className="mt-2 text-3xl font-semibold text-red-600">{summary.delayedOrders}</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Delivered</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">{summary.deliveredOrders}</div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaterialOrderStatus | 'ALL')}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="ORDERED">Ordered</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELAYED">Delayed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
          <input
            type="text"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            placeholder="Filter by supplier..."
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <Card.Content className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No material orders found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Material
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ETA Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Expected Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actual Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {order.jobId.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.supplierName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{order.materialName}</div>
                        {order.quantity && order.unit && (
                          <div className="text-xs text-gray-500">
                            {order.quantity} {order.unit}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getEtaStatusBadge(order.etaStatus)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(order.expectedDeliveryDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(order.actualDeliveryDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/risk/${order.jobId}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Job Risk
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
