'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import type { SubcontractorDTO } from '@greenenergy/shared-types';

type FilterValue = 'all' | 'compliant' | 'non-compliant';
type PerformanceFilter = 'all' | 'GREEN' | 'YELLOW' | 'RED';

export default function SubcontractorsPage() {
  const router = useRouter();
  const [subcontractors, setSubcontractors] = useState<SubcontractorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complianceFilter, setComplianceFilter] = useState<FilterValue>('all');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/subcontractors');
      if (!response.ok) {
        throw new Error(`Failed to fetch subcontractors: ${response.statusText}`);
      }
      const data = await response.json();
      setSubcontractors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (sub: SubcontractorDTO): 'compliant' | 'non-compliant' => {
    if (sub.lastComplianceStatus === 'COMPLIANT') return 'compliant';
    if (sub.lastComplianceStatus === 'NON_COMPLIANT') return 'non-compliant';
    
    // Fallback: check individual fields
    const now = new Date();
    const hasValidLicense = sub.licenseNumber && sub.licenseExpiresAt && new Date(sub.licenseExpiresAt) > now;
    const hasValidInsurance = sub.insurancePolicyNumber && sub.insuranceExpiresAt && new Date(sub.insuranceExpiresAt) > now;
    
    return (hasValidLicense && hasValidInsurance && sub.w9Received && sub.coiReceived) ? 'compliant' : 'non-compliant';
  };

  const filteredSubcontractors = subcontractors.filter((sub) => {
    // Compliance filter
    if (complianceFilter !== 'all') {
      const status = getComplianceStatus(sub);
      if (status !== complianceFilter) return false;
    }

    // Performance filter
    if (performanceFilter !== 'all') {
      if (sub.performanceStatus !== performanceFilter) return false;
    }

    return true;
  });

  const getPerformanceBadge = (status?: string) => {
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            GREEN
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
            YELLOW
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            RED
          </span>
        );
      default:
        return <span className="text-sm text-gray-500">Not Rated</span>;
    }
  };

  const getComplianceBadge = (status: 'compliant' | 'non-compliant') => {
    if (status === 'compliant') {
      return (
        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
          Compliant
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
        Non-Compliant
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Subcontractors</h2>
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">Loading subcontractors...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Subcontractors</h2>
        <Card>
          <Card.Content>
            <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Subcontractors</h2>
        <button
          onClick={fetchSubcontractors}
          className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Compliance</label>
              <select
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value as FilterValue)}
                className="mt-1 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="compliant">Compliant</option>
                <option value="non-compliant">Non-Compliant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Performance</label>
              <select
                value={performanceFilter}
                onChange={(e) => setPerformanceFilter(e.target.value as PerformanceFilter)}
                className="mt-1 block rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="GREEN">Green</option>
                <option value="YELLOW">Yellow</option>
                <option value="RED">Red</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Table */}
      <div className="mt-6">
        {filteredSubcontractors.length === 0 ? (
          <Card>
            <Card.Content>
              <div className="py-8 text-center text-gray-500">No subcontractors found.</div>
            </Card.Content>
          </Card>
        ) : (
          <Card>
            <Card.Content>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Compliance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredSubcontractors.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{sub.name}</div>
                          {sub.legalName && (
                            <div className="text-sm text-gray-500">{sub.legalName}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {sub.primaryContact || '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sub.phone || sub.email || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {getComplianceBadge(getComplianceStatus(sub))}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {getPerformanceBadge(sub.performanceStatus)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {sub.performanceScore !== null && sub.performanceScore !== undefined
                            ? `${sub.performanceScore}/100`
                            : '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <button
                            onClick={() => router.push(`/subcontractors/${sub.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
}
