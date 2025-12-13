import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  LlmFeature,
  LlmUsageBreakdownItemDTO,
  LlmUsageListItemDTO,
  LlmUsageSummaryDTO,
} from '@greenenergy/shared-types';

type LlmUsageStats = Omit<LlmUsageBreakdownItemDTO, 'key' | 'estimatedCostUsd'> & {
  key: string;
};

export interface LogLlmCallInput {
  feature: LlmFeature;

  jobId?: string | null;
  customerId?: string | null;
  internalUserId?: string | null;

  provider?: string | null;
  model?: string | null;

  tokensIn?: number | null;
  tokensOut?: number | null;
  durationMs?: number | null;

  isFallback: boolean;
  success: boolean;
  errorCode?: string | null;
  environment?: string | null;

  meta?: Record<string, unknown> | null;
}

@Injectable()
export class LlmUsageService {
  private readonly logger = new Logger(LlmUsageService.name);

  /**
   * Best-effort logging. This must never throw.
   */
  async logCall(input: LogLlmCallInput): Promise<void> {
    try {
      await prisma.llmCallLog.create({
        data: {
          feature: input.feature,
          jobId: input.jobId ?? null,
          customerId: input.customerId ?? null,
          internalUserId: input.internalUserId ?? null,
          provider: input.provider ?? null,
          model: input.model ?? null,
          tokensIn: input.tokensIn ?? null,
          tokensOut: input.tokensOut ?? null,
          durationMs: input.durationMs ?? null,
          isFallback: input.isFallback,
          success: input.success,
          errorCode: input.errorCode ?? null,
          environment: input.environment ?? null,
          meta: (input.meta as any) ?? null,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write LlmCallLog (ignored): ${msg}`);
    }
  }

  async getRecent(limit: number): Promise<LlmUsageListItemDTO[]> {
    const safeLimit = clampInt(limit, { min: 1, max: 200, defaultValue: 50 });

    const rows = await prisma.llmCallLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      feature: r.feature as LlmFeature,
      jobId: r.jobId,
      customerId: r.customerId,
      internalUserId: r.internalUserId,
      provider: r.provider,
      model: r.model,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      durationMs: r.durationMs,
      isFallback: r.isFallback,
      success: r.success,
      errorCode: r.errorCode,
      environment: r.environment,
      meta: (r.meta as any) ?? null,
    }));
  }

  async getSummary(days: number): Promise<LlmUsageSummaryDTO> {
    const safeDays = clampInt(days, { min: 1, max: 365, defaultValue: 7 });
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const logs = await prisma.llmCallLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      select: {
        feature: true,
        model: true,
        tokensIn: true,
        tokensOut: true,
        isFallback: true,
        success: true,
      },
    });

    const totalCalls = logs.length;
    const successCalls = logs.filter((l) => l.success && !l.isFallback).length;
    const fallbackCalls = logs.filter((l) => l.success && l.isFallback).length;
    const errorCalls = logs.filter((l) => !l.success).length;

    const tokensInTotal = sumNullableInts(logs.map((l) => l.tokensIn));
    const tokensOutTotal = sumNullableInts(logs.map((l) => l.tokensOut));
    const estimatedCostUsd = estimateCostUsd(tokensInTotal, tokensOutTotal);

    const byFeatureMap = new Map<string, LlmUsageStats>();
    const byModelMap = new Map<string, LlmUsageStats>();

    for (const l of logs) {
      const featureKey = l.feature;
      const modelKey = (l.model && l.model.trim()) ? l.model : 'unknown';

      accumulateStats(byFeatureMap, featureKey, l);
      accumulateStats(byModelMap, modelKey, l);
    }

    const byFeature = Array.from(byFeatureMap.values())
      .map((s) => ({
        key: s.key,
        feature: s.key as LlmFeature,
        calls: s.calls,
        successCalls: s.successCalls,
        fallbackCalls: s.fallbackCalls,
        errorCalls: s.errorCalls,
        tokensInTotal: s.tokensInTotal,
        tokensOutTotal: s.tokensOutTotal,
        estimatedCostUsd: estimateCostUsd(s.tokensInTotal, s.tokensOutTotal),
      }))
      .sort((a, b) => b.calls - a.calls);

    const byModel = Array.from(byModelMap.values())
      .map((s) => ({
        key: s.key,
        model: s.key,
        calls: s.calls,
        successCalls: s.successCalls,
        fallbackCalls: s.fallbackCalls,
        errorCalls: s.errorCalls,
        tokensInTotal: s.tokensInTotal,
        tokensOutTotal: s.tokensOutTotal,
        estimatedCostUsd: estimateCostUsd(s.tokensInTotal, s.tokensOutTotal),
      }))
      .sort((a, b) => b.calls - a.calls);

    return {
      generatedAt: new Date().toISOString(),
      days: safeDays,
      totalCalls,
      successCalls,
      fallbackCalls,
      errorCalls,
      tokensInTotal,
      tokensOutTotal,
      estimatedCostUsd,
      byFeature,
      byModel,
    };
  }
}

function clampInt(
  value: unknown,
  opts: { min: number; max: number; defaultValue: number }
): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return opts.defaultValue;
  const rounded = Math.floor(parsed);
  return Math.min(opts.max, Math.max(opts.min, rounded));
}

function sumNullableInts(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      total += v;
    }
  }
  return total;
}

function initStats(key: string): LlmUsageStats {
  return {
    key,
    calls: 0,
    successCalls: 0,
    fallbackCalls: 0,
    errorCalls: 0,
    tokensInTotal: 0,
    tokensOutTotal: 0,
  };
}

function accumulateStats(
  map: Map<string, LlmUsageStats>,
  key: string,
  log: {
    isFallback: boolean;
    success: boolean;
    tokensIn: number | null;
    tokensOut: number | null;
  }
) {
  const s = map.get(key) ?? initStats(key);

  s.calls += 1;

  if (!log.success) {
    s.errorCalls += 1;
  } else if (log.isFallback) {
    s.fallbackCalls += 1;
  } else {
    s.successCalls += 1;
  }

  s.tokensInTotal += log.tokensIn ?? 0;
  s.tokensOutTotal += log.tokensOut ?? 0;

  map.set(key, s);
}

function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  // Rough GPT-4o-mini-like estimate (USD per 1M tokens)
  const inputPer1M = 0.15;
  const outputPer1M = 0.6;

  const cost = (tokensIn / 1_000_000) * inputPer1M + (tokensOut / 1_000_000) * outputPer1M;

  // Round to 4 decimals
  return Math.round(cost * 10_000) / 10_000;
}
