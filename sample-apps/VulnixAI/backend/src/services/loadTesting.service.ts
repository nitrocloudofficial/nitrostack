import axios from 'axios';
import https from 'https';

export interface LoadTestConfig {
  url: string;
  duration: number; // seconds
  concurrentUsers: number;
  requestsPerSecond: number;
  method: 'GET' | 'POST';
  payload?: any;
}

export interface LoadTestResult {
  url: string;
  testDate: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ status: number; count: number; message: string }>;
  recommendations: string[];
}

export class LoadTestingService {
  private static readonly MAX_CONCURRENT = 100; // Safety limit
  private static readonly MAX_DURATION = 60; // 60 seconds max
  private static readonly MAX_RPS = 50; // 50 requests per second max

  /**
   * Perform controlled load testing on verified domain
   */
  static async performLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    // Safety limits
    const duration = Math.min(config.duration, this.MAX_DURATION);
    const concurrentUsers = Math.min(config.concurrentUsers, this.MAX_CONCURRENT);
    const rps = Math.min(config.requestsPerSecond, this.MAX_RPS);

    console.log(`Starting load test: ${concurrentUsers} users, ${rps} req/s, ${duration}s`);

    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const results: Array<{
      status: number;
      responseTime: number;
      error?: string;
    }> = [];

    // Calculate delay between requests
    const delayMs = 1000 / rps;

    // Run load test
    while (Date.now() < endTime) {
      const batchPromises: Promise<void>[] = [];

      // Send concurrent requests
      for (let i = 0; i < concurrentUsers; i++) {
        batchPromises.push(this.sendRequest(config.url, config.method, config.payload, results));
      }

      await Promise.all(batchPromises);

      // Delay to control request rate
      await this.sleep(delayMs);
    }

    // Analyze results
    return this.analyzeResults(config.url, results, duration);
  }

  /**
   * Send a single request and record result
   */
  private static async sendRequest(
    url: string,
    method: 'GET' | 'POST',
    payload: any,
    results: Array<{ status: number; responseTime: number; error?: string }>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await axios({
        method,
        url,
        data: payload,
        timeout: 10000,
        validateStatus: () => true,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });

      const responseTime = Date.now() - startTime;

      results.push({
        status: response.status,
        responseTime,
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      results.push({
        status: 0,
        responseTime,
        error: error.message,
      });
    }
  }

  /**
   * Analyze test results
   */
  private static analyzeResults(
    url: string,
    results: Array<{ status: number; responseTime: number; error?: string }>,
    duration: number
  ): LoadTestResult {
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.status >= 200 && r.status < 300).length;
    const failedRequests = results.filter(r => r.status === 0 || r.status >= 500).length;
    const rateLimitedRequests = results.filter(r => r.status === 429).length;

    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    const requestsPerSecond = totalRequests / duration;

    // Count errors by status
    const errorCounts = new Map<number, number>();
    const errorMessages = new Map<number, string>();

    results.forEach(r => {
      if (r.status !== 200) {
        errorCounts.set(r.status, (errorCounts.get(r.status) || 0) + 1);
        if (r.error && !errorMessages.has(r.status)) {
          errorMessages.set(r.status, r.error);
        }
      }
    });

    const errors = Array.from(errorCounts.entries()).map(([status, count]) => ({
      status,
      count,
      message: errorMessages.get(status) || this.getStatusMessage(status),
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      successfulRequests,
      failedRequests,
      rateLimitedRequests,
      totalRequests,
      averageResponseTime,
      maxResponseTime,
    });

    return {
      url,
      testDate: new Date(),
      duration,
      totalRequests,
      successfulRequests,
      failedRequests,
      rateLimitedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime,
      maxResponseTime,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errors,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on results
   */
  private static generateRecommendations(stats: {
    successfulRequests: number;
    failedRequests: number;
    rateLimitedRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
  }): string[] {
    const recommendations: string[] = [];

    const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    const failureRate = (stats.failedRequests / stats.totalRequests) * 100;
    const rateLimitRate = (stats.rateLimitedRequests / stats.totalRequests) * 100;

    // Success rate analysis
    if (successRate < 90) {
      recommendations.push(
        `Low success rate (${successRate.toFixed(1)}%). Consider scaling infrastructure or optimizing application.`
      );
    } else if (successRate >= 99) {
      recommendations.push(
        `Excellent success rate (${successRate.toFixed(1)}%). Your site handles load well.`
      );
    }

    // Failure rate analysis
    if (failureRate > 5) {
      recommendations.push(
        `High failure rate (${failureRate.toFixed(1)}%). Investigate server errors and increase capacity.`
      );
    }

    // Rate limiting analysis
    if (rateLimitRate > 10) {
      recommendations.push(
        `Rate limiting is active (${rateLimitRate.toFixed(1)}% requests blocked). This is good for DDoS protection.`
      );
    } else if (rateLimitRate === 0) {
      recommendations.push(
        'No rate limiting detected. Consider implementing rate limiting for DDoS protection.'
      );
    }

    // Response time analysis
    if (stats.averageResponseTime > 2000) {
      recommendations.push(
        `Slow average response time (${stats.averageResponseTime}ms). Optimize database queries and caching.`
      );
    } else if (stats.averageResponseTime < 200) {
      recommendations.push(
        `Excellent response time (${stats.averageResponseTime}ms). Your site is well optimized.`
      );
    }

    if (stats.maxResponseTime > 5000) {
      recommendations.push(
        `Some requests took very long (${stats.maxResponseTime}ms). Investigate slow endpoints.`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Your site performed well under load. Continue monitoring performance.');
    }

    recommendations.push('Consider using a CDN for better global performance.');
    recommendations.push('Implement auto-scaling to handle traffic spikes.');
    recommendations.push('Monitor server resources (CPU, memory, disk) during high load.');

    return recommendations;
  }

  /**
   * Get human-readable status message
   */
  private static getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      0: 'Connection failed or timeout',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests (Rate Limited)',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return messages[status] || `HTTP ${status}`;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test site resilience with gradual load increase
   */
  static async testResilience(url: string): Promise<{
    maxConcurrentUsers: number;
    breakingPoint: number;
    recommendations: string[];
  }> {
    const results: Array<{ users: number; successRate: number }> = [];

    // Test with increasing load
    for (let users = 10; users <= 100; users += 10) {
      const testResults: Array<{ status: number }> = [];

      // Send requests
      const promises = Array(users)
        .fill(null)
        .map(() =>
          axios
            .get(url, {
              timeout: 5000,
              validateStatus: () => true,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            })
            .then(res => testResults.push({ status: res.status }))
            .catch(() => testResults.push({ status: 0 }))
        );

      await Promise.all(promises);

      const successRate =
        (testResults.filter(r => r.status >= 200 && r.status < 300).length / testResults.length) *
        100;

      results.push({ users, successRate });

      // Stop if success rate drops below 80%
      if (successRate < 80) {
        break;
      }

      await this.sleep(1000); // Pause between tests
    }

    // Find breaking point
    const lastGoodResult = results.find(r => r.successRate >= 90);
    const maxConcurrentUsers = lastGoodResult?.users || 10;
    const breakingPoint = results.find(r => r.successRate < 80)?.users || 100;

    const recommendations = [
      `Your site can handle approximately ${maxConcurrentUsers} concurrent users reliably.`,
      `Performance degrades significantly at ${breakingPoint} concurrent users.`,
      'Consider implementing auto-scaling to handle traffic spikes.',
      'Use a load balancer to distribute traffic across multiple servers.',
      'Implement caching to reduce server load.',
    ];

    return {
      maxConcurrentUsers,
      breakingPoint,
      recommendations,
    };
  }
}
