/**
 * Custom error class for JobNimbus API errors
 */
export class JobNimbusError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'JobNimbusError';
    Object.setPrototypeOf(this, JobNimbusError.prototype);
  }

  /**
   * Create error from axios error
   */
  static fromAxiosError(error: any): JobNimbusError {
    if (error.response) {
      // Server responded with error status
      const statusCode = error.response.status;
      const message = error.response.data?.message || error.message;
      const code = `HTTP_${statusCode}`;

      return new JobNimbusError(message, code, statusCode, error.response.data);
    } else if (error.request) {
      // Request was made but no response
      return new JobNimbusError(
        'No response from JobNimbus API',
        'NO_RESPONSE',
        undefined,
        error.request
      );
    } else {
      // Error setting up the request
      return new JobNimbusError(error.message, 'REQUEST_SETUP_ERROR', undefined, error);
    }
  }

  /**
   * Check if error is related to authentication
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return this.code === 'NO_RESPONSE' || this.code === 'REQUEST_SETUP_ERROR';
  }
}
