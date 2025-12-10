'use client';

import { useState } from 'react';
import { Card } from '@greenenergy/ui';
import type {
  AiJobSummaryDTO,
  AiJobRecommendationDTO,
  AiCustomerMessageDTO,
  AiCustomerMessageRequestDTO,
  AiRecommendationCategory,
  AiRecommendationPriority,
  AiCustomerMessageType,
} from '@greenenergy/shared-types';

export default function AiOpsPage() {
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AiJobSummaryDTO | null>(null);
  const [recommendations, setRecommendations] = useState<AiJobRecommendationDTO[]>([]);
  const [customerMessage, setCustomerMessage] = useState<AiCustomerMessageDTO | null>(null);

  // Customer message form state
  const [messageType, setMessageType] = useState<AiCustomerMessageType>('STATUS_UPDATE');
  const [tone, setTone] = useState<'FRIENDLY' | 'FORMAL'>('FRIENDLY');
  const [customQuestion, setCustomQuestion] = useState('');
  const [generatingMessage, setGeneratingMessage] = useState(false);

  // Section expand/collapse
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleLoadInsights = async () => {
    if (!jobId.trim()) {
      setError('Please enter a Job ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setRecommendations([]);
    setCustomerMessage(null);

    try {
      const res = await fetch(`/api/v1/ai-ops/jobs/${encodeURIComponent(jobId.trim())}/insights`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Job not found. Please check the Job ID.');
        }
        throw new Error(`Failed to load insights: ${res.statusText}`);
      }

      const data: { summary: AiJobSummaryDTO; recommendations: AiJobRecommendationDTO[] } =
        await res.json();

      setSummary(data.summary);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!jobId.trim()) {
      setError('Please load job insights first');
      return;
    }

    setGeneratingMessage(true);

    try {
      const input: AiCustomerMessageRequestDTO = {
        type: messageType,
        tone,
        customQuestion: messageType === 'GENERIC' && customQuestion ? customQuestion : undefined,
      };

      const res = await fetch(
        `/api/v1/ai-ops/jobs/${encodeURIComponent(jobId.trim())}/customer-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      );

      if (!res.ok) {
        throw new Error('Failed to generate message');
      }

      const data: AiCustomerMessageDTO = await res.json();
      setCustomerMessage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating message');
    } finally {
      setGeneratingMessage(false);
    }
  };

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const getCategoryBadge = (category: AiRecommendationCategory) => {
    const colors: Record<AiRecommendationCategory, string> = {
      QC: 'bg-blue-100 text-blue-800',
      RISK: 'bg-red-100 text-red-800',
      SAFETY: 'bg-orange-100 text-orange-800',
      MATERIALS: 'bg-purple-100 text-purple-800',
      SCHEDULING: 'bg-cyan-100 text-cyan-800',
      WARRANTY: 'bg-green-100 text-green-800',
      CUSTOMER: 'bg-pink-100 text-pink-800',
      GENERAL: 'bg-gray-100 text-gray-800',
    };
    const colorClass = colors[category];
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>
        {category}
      </span>
    );
  };

  const getPriorityBadge = (priority: AiRecommendationPriority) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            LOW
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI Operations Assistant</h2>
        <p className="text-sm text-gray-600">
          Get AI-powered insights, recommendations, and customer message drafts for any job.
        </p>
      </div>

      {/* Job ID Lookup */}
      <Card className="mb-6">
        <Card.Content className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Job ID or Job Number
              </label>
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLoadInsights();
                }}
                placeholder="Enter job ID..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadInsights}
                disabled={loading}
                className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Load Insights'}
              </button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded bg-red-50 p-4 text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Job Summary Section */}
      {summary && (
        <Card className="mb-6">
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">Job Summary</h3>
          </Card.Header>
          <Card.Content className="p-6">
            <div className="mb-4 rounded bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  <strong>Job ID:</strong> {summary.jobId}
                </div>
                {summary.jobNumber && (
                  <div className="text-sm text-gray-600">
                    <strong>Job Number:</strong> {summary.jobNumber}
                  </div>
                )}
                {summary.customerName && (
                  <div className="text-sm text-gray-600">
                    <strong>Customer:</strong> {summary.customerName}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <strong>Status:</strong>{' '}
                  <span className="font-semibold text-blue-600">{summary.status}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="mb-2 font-medium text-gray-900">Overall Summary</h4>
              <p className="text-sm text-gray-700">{summary.overallSummary}</p>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-gray-900">Detailed Sections</h4>
              <div className="space-y-2">
                {summary.sections.map((section) => {
                  const isExpanded = expandedSections.has(section.title);
                  return (
                    <div key={section.title} className="rounded border border-gray-200">
                      <button
                        onClick={() => toggleSection(section.title)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <span className="text-sm font-medium text-gray-900">{section.title}</span>
                        <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-sm text-gray-700">{section.body}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <Card className="mb-6">
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">
              Recommendations ({recommendations.length})
            </h3>
          </Card.Header>
          <Card.Content className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Priority</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Category</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Label</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recommendations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{getPriorityBadge(rec.priority)}</td>
                      <td className="px-4 py-3">{getCategoryBadge(rec.category)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{rec.label}</td>
                      <td className="px-4 py-3 text-gray-700">{rec.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Customer Message Section */}
      {summary && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">Draft Customer Message</h3>
          </Card.Header>
          <Card.Content className="p-6">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as AiCustomerMessageType)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="STATUS_UPDATE">Status Update</option>
                  <option value="ETA_UPDATE">ETA Update</option>
                  <option value="GENERIC">Generic</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as 'FRIENDLY' | 'FORMAL')}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="FRIENDLY">Friendly</option>
                  <option value="FORMAL">Formal</option>
                </select>
              </div>

              {messageType === 'GENERIC' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Custom Question (Optional)
                  </label>
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="e.g., your question about pricing"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateMessage}
              disabled={generatingMessage}
              className="mb-4 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
            >
              {generatingMessage ? 'Generating...' : 'Generate Message'}
            </button>

            {customerMessage && (
              <div className="rounded border border-gray-300 bg-gray-50 p-4">
                <div className="mb-2 text-xs font-medium uppercase text-gray-500">
                  {customerMessage.type.replace('_', ' ')}
                </div>
                <textarea
                  value={customerMessage.message}
                  readOnly
                  rows={8}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-2 text-xs text-gray-500">
                  Review and edit before sending to customer.
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
