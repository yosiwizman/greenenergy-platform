import React from 'react';
import { clsx } from 'clsx';
import { JobStatus, QCStatus, RiskLevel } from '@greenenergy/shared-types';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: JobStatus | QCStatus | RiskLevel | string;
  type?: 'job' | 'qc' | 'risk';
}

export function StatusPill({ status, type = 'job', className, ...props }: StatusPillProps) {
  const getStatusStyles = () => {
    if (type === 'risk') {
      const riskStyles: Record<string, string> = {
        NONE: 'bg-gray-100 text-gray-800',
        LOW: 'bg-green-100 text-green-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        HIGH: 'bg-orange-100 text-orange-800',
        CRITICAL: 'bg-red-100 text-red-800',
      };
      return riskStyles[status] || riskStyles.NONE;
    }

    if (type === 'qc') {
      const qcStyles: Record<string, string> = {
        PENDING: 'bg-gray-100 text-gray-800',
        IN_REVIEW: 'bg-blue-100 text-blue-800',
        PASSED: 'bg-green-100 text-green-800',
        FAILED: 'bg-red-100 text-red-800',
        REQUIRES_ATTENTION: 'bg-orange-100 text-orange-800',
      };
      return qcStyles[status] || qcStyles.PENDING;
    }

    // Default job status styles
    const jobStyles: Record<string, string> = {
      LEAD: 'bg-gray-100 text-gray-800',
      QUALIFIED: 'bg-blue-100 text-blue-800',
      SITE_SURVEY: 'bg-indigo-100 text-indigo-800',
      DESIGN: 'bg-purple-100 text-purple-800',
      PERMITTING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      SCHEDULED: 'bg-cyan-100 text-cyan-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      INSPECTION: 'bg-orange-100 text-orange-800',
      COMPLETE: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return jobStyles[status] || jobStyles.LEAD;
  };

  const formatStatus = (s: string) => {
    return s
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        getStatusStyles(),
        className
      )}
      {...props}
    >
      {formatStatus(status)}
    </span>
  );
}
