'use client';

import { useMemo, useState } from 'react';
import { Card } from '@greenenergy/ui';
import type {
  AiJobSummaryDTO,
  AiJobRecommendationDTO,
  AiOpsLlmCustomerMessageDTO,
  AiOpsLlmJobSummaryDTO,
  AiOpsLlmMessageContext,
  AiOpsLlmMessageTone,
  AiRecommendationCategory,
  AiRecommendationPriority,
} from '@greenenergy/shared-types';
import {
  fetchLlmJobSummary,
  generateLlmCustomerMessage,
  type GenerateLlmCustomerMessageInput,
} from '../../lib/api/aiOpsLlmClient';

export default function AiOpsPage() {
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AiJobSummaryDTO | null>(null);
  const [recommendations, setRecommendations] = useState<AiJobRecommendationDTO[]>([]);

  // AI Summary (LLM) state
  const [aiSummary, setAiSummary] = useState<AiOpsLlmJobSummaryDTO | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummaryGeneratedAt, setAiSummaryGeneratedAt] = useState<Date | null>(null);

  // AI Customer message draft (LLM) state
  const [aiMessageChannel, setAiMessageChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [aiMessageTone, setAiMessageTone] = useState<AiOpsLlmMessageTone>('friendly');
  const [aiMessageContext, setAiMessageContext] = useState<AiOpsLlmMessageContext>('general_update');
  const [aiMessageExtraContext, setAiMessageExtraContext] = useState('');
  const [aiCustomerMessage, setAiCustomerMessage] = useState<AiOpsLlmCustomerMessageDTO | null>(null);
  const [aiCustomerMessageLoading, setAiCustomerMessageLoading] = useState(false);
  const [aiCustomerMessageError, setAiCustomerMessageError] = useState<string | null>(null);
  const [aiCustomerMessageGeneratedAt, setAiCustomerMessageGeneratedAt] = useState<Date | null>(null);

  const parsedAiCustomerMessage = useMemo(() => {
    if (!aiCustomerMessage?.message) {
      return { subject: null as string | null, body: '' };
    }

    const lines = aiCustomerMessage.message.split(/\r?\n/);
    const subjectLine = lines.find((l) => l.trim().toLowerCase().startsWith('subject:'));

    if (!subjectLine) {
      return { subject: null, body: aiCustomerMessage.message };
    }

    const subject = subjectLine.split(':').slice(1).join(':').trim();
    const bodyLines = lines.filter((l) => l !== subjectLine);
    const body = bodyLines.join('\n').trimStart();

    return { subject: subject || null, body };
  }, [aiCustomerMessage]);

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

    // Reset AI panels when selecting a new job
    setAiSummary(null);
    setAiSummaryError(null);
    setAiSummaryGeneratedAt(null);
    setAiCustomerMessage(null);
    setAiCustomerMessageError(null);
    setAiCustomerMessageGeneratedAt(null);

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

  const handleGenerateAiSummary = async () => {
    if (!summary) return;

    setAiSummaryLoading(true);
    setAiSummaryError(null);

    try {
      const data = await fetchLlmJobSummary(summary.jobId);
      setAiSummary(data);
      setAiSummaryGeneratedAt(new Date());
    } catch (err) {
      setAiSummaryError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleGenerateAiCustomerMessage = async () => {
    if (!summary) return;

    setAiCustomerMessageLoading(true);
    setAiCustomerMessageError(null);

    try {
      const input: GenerateLlmCustomerMessageInput = {
        tone: aiMessageTone,
        context: aiMessageContext,
        channel: aiMessageChannel,
        extraContext: aiMessageExtraContext,
      };

      const data = await generateLlmCustomerMessage(summary.jobId, input);
      setAiCustomerMessage(data);
      setAiCustomerMessageGeneratedAt(new Date());
    } catch (err) {
      setAiCustomerMessageError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAiCustomerMessageLoading(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      alert('Failed to copy to clipboard');
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

      {/* AI Summary (LLM) Section */}
      {summary && (
        <Card className="mb-6">
          <Card.Header>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
              <button
                onClick={handleGenerateAiSummary}
                disabled={aiSummaryLoading}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {aiSummaryLoading ? 'Generating...' : 'Generate AI Summary'}
              </button>
            </div>
          </Card.Header>
          <Card.Content className="p-6">
            {aiSummaryError && (
              <div className="mb-4 rounded bg-red-50 p-4 text-red-700">
                <strong>Error:</strong> {aiSummaryError}
              </div>
            )}

            {aiSummary ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {aiSummary.isFallback ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                      Fallback summary (LLM disabled/unavailable)
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                      LLM
                    </span>
                  )}
                  <span>
                    <strong>Model:</strong> {aiSummary.model}
                  </span>
                  {aiSummaryGeneratedAt && (
                    <span>
                      <strong>Generated:</strong> {aiSummaryGeneratedAt.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <div className="whitespace-pre-wrap text-sm text-gray-800">
                    {aiSummary.summary}
                  </div>
                </div>

                {aiSummary.recommendations && aiSummary.recommendations.trim() && (
                  <div className="rounded border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-medium text-gray-900">Recommendations</div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {aiSummary.recommendations}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Generate an AI summary for this job. If the AI model is disabled, a deterministic
                fallback will be shown.
              </p>
            )}
          </Card.Content>
        </Card>
      )}

      {/* AI Customer Message Draft (LLM) */}
      {summary && (
        <Card className="mb-6">
          <Card.Header>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Customer Message Draft</h3>
              <button
                onClick={handleGenerateAiCustomerMessage}
                disabled={aiCustomerMessageLoading}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
              >
                {aiCustomerMessageLoading ? 'Generating...' : 'Generate AI Message Draft'}
              </button>
            </div>
          </Card.Header>
          <Card.Content className="p-6">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Channel</label>
                <select
                  value={aiMessageChannel}
                  onChange={(e) => setAiMessageChannel(e.target.value as 'EMAIL' | 'SMS')}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tone</label>
                <select
                  value={aiMessageTone}
                  onChange={(e) => setAiMessageTone(e.target.value as AiOpsLlmMessageTone)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Context</label>
                <select
                  value={aiMessageContext}
                  onChange={(e) => setAiMessageContext(e.target.value as AiOpsLlmMessageContext)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="general_update">General update</option>
                  <option value="payment_reminder">Payment reminder</option>
                  <option value="scheduling">Scheduling</option>
                  <option value="post_install">Post-install</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Extra context (optional)
              </label>
              <textarea
                value={aiMessageExtraContext}
                onChange={(e) => setAiMessageExtraContext(e.target.value)}
                rows={3}
                placeholder="e.g., mention crew arrival window, pending permit, next steps..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {aiCustomerMessageError && (
              <div className="mb-4 rounded bg-red-50 p-4 text-red-700">
                <strong>Error:</strong> {aiCustomerMessageError}
              </div>
            )}

            {aiCustomerMessage && (
              <div className="space-y-3 rounded border border-gray-300 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {aiCustomerMessage.isFallback ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                      Fallback draft (LLM disabled/unavailable)
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                      LLM
                    </span>
                  )}
                  <span>
                    <strong>Model:</strong> {aiCustomerMessage.model}
                  </span>
                  {aiCustomerMessageGeneratedAt && (
                    <span>
                      <strong>Generated:</strong> {aiCustomerMessageGeneratedAt.toLocaleString()}
                    </span>
                  )}
                </div>

                {parsedAiCustomerMessage.subject && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">Subject</div>
                      <button
                        onClick={() => handleCopyToClipboard(parsedAiCustomerMessage.subject!)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                        type="button"
                      >
                        Copy subject
                      </button>
                    </div>
                    <input
                      value={parsedAiCustomerMessage.subject}
                      readOnly
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Body</div>
                    <button
                      onClick={() => handleCopyToClipboard(parsedAiCustomerMessage.body)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                      type="button"
                    >
                      Copy body
                    </button>
                  </div>
                  <textarea
                    value={parsedAiCustomerMessage.body}
                    readOnly
                    rows={8}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Draft-only: review and edit before sending to the customer.
                  </div>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
