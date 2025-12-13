import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  CashflowForecastDTO,
  PipelineForecastDTO,
  ForecastOverviewDTO,
} from '@greenenergy/shared-types';

/**
 * Forecast API Controller (Phase 6 Sprint 1)
 * Provides executive-level forecasting endpoints
 */
@Controller('forecast')
@UseGuards(InternalApiKeyGuard)
export class ForecastController {
  private readonly logger = new Logger(ForecastController.name);

  constructor(private readonly forecastService: ForecastService) {}

  /**
   * GET /api/v1/forecast/cashflow
   * Returns cashflow forecast for the next N weeks
   */
  @Get('cashflow')
  async getCashflowForecast(@Query('weeks') weeks?: string): Promise<CashflowForecastDTO> {
    this.logger.log(`GET /api/v1/forecast/cashflow?weeks=${weeks || '12'}`);
    const horizon = weeks ? Math.max(1, Math.min(52, Number(weeks))) : 12;
    return this.forecastService.getCashflowForecast(horizon);
  }

  /**
   * GET /api/v1/forecast/pipeline
   * Returns pipeline forecast with weighted values
   */
  @Get('pipeline')
  async getPipelineForecast(): Promise<PipelineForecastDTO> {
    this.logger.log('GET /api/v1/forecast/pipeline');
    return this.forecastService.getPipelineForecast();
  }

  /**
   * GET /api/v1/forecast/overview
   * Returns complete forecast overview (cashflow + pipeline)
   */
  @Get('overview')
  async getForecastOverview(@Query('weeks') weeks?: string): Promise<ForecastOverviewDTO> {
    this.logger.log(`GET /api/v1/forecast/overview?weeks=${weeks || '12'}`);
    const horizon = weeks ? Math.max(1, Math.min(52, Number(weeks))) : 12;
    return this.forecastService.getForecastOverview(horizon);
  }
}
