/**
 * Performance Logger
 * 
 * A simple performance logging utility that works in both development and production.
 * Provides consistent logging format and easy-to-read performance metrics.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

interface PerformanceLog {
  type: 'page' | 'api' | 'data' | 'component';
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceLogger {
  private logs: PerformanceLog[] = [];
  private isEnabled: boolean = true;

  constructor() {
    // Enable logging in both development and production
    this.isEnabled = true;
  }

  start(name: string, type: 'page' | 'api' | 'data' | 'component' = 'page'): () => void {
    if (!this.isEnabled) return () => {};

    const startTime = performance.now();
    const timestamp = Date.now();
    
    console.log(`🚀 ${type.toUpperCase()}: ${name} started...`);
    
    // Create start mark for performance API
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const log: PerformanceLog = {
        type,
        name,
        duration,
        timestamp
      };
      
      this.logs.push(log);
      
      console.log(`✅ ${type.toUpperCase()}: ${name} completed in ${duration.toFixed(2)}ms`);
      
      // Log to browser performance API if available
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark(`${name}-end`);
        try {
          performance.measure(name, `${name}-start`, `${name}-end`);
        } catch (error) {
          // Ignore performance API errors
          console.debug('Performance API error:', error);
        }
      }
    };
  }

  logApiCall(apiName: string, duration: number, success: boolean = true) {
    if (!this.isEnabled) return;
    
    const status = success ? '✅' : '❌';
    console.log(`${status} API: ${apiName} - ${duration.toFixed(2)}ms`);
  }

  logPageLoad(pageName: string, duration: number) {
    if (!this.isEnabled) return;
    
    console.log(`📄 PAGE: ${pageName} loaded in ${duration.toFixed(2)}ms`);
  }

  logDataProcessing(dataType: string, duration: number, recordCount?: number) {
    if (!this.isEnabled) return;
    
    const recordInfo = recordCount ? ` (${recordCount} records)` : '';
    console.log(`📊 DATA: ${dataType} processed in ${duration.toFixed(2)}ms${recordInfo}`);
  }

  getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getSummary() {
    const summary = this.logs.reduce((acc, log) => {
      if (!acc[log.type]) {
        acc[log.type] = { count: 0, totalDuration: 0, averageDuration: 0 };
      }
      acc[log.type].count++;
      acc[log.type].totalDuration += log.duration;
      acc[log.type].averageDuration = acc[log.type].totalDuration / acc[log.type].count;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; averageDuration: number }>);

    console.log('📈 Performance Summary:', summary);
    return summary;
  }
}

// Export singleton instance
export const perfLogger = new PerformanceLogger();

// Export individual functions for convenience
export const startPerfLog = (name: string, type: 'page' | 'api' | 'data' | 'component' = 'page') => 
  perfLogger.start(name, type);

export const logApiCall = (apiName: string, duration: number, success: boolean = true) => 
  perfLogger.logApiCall(apiName, duration, success);

export const logPageLoad = (pageName: string, duration: number) => 
  perfLogger.logPageLoad(pageName, duration);

export const logDataProcessing = (dataType: string, duration: number, recordCount?: number) => 
  perfLogger.logDataProcessing(dataType, duration, recordCount);

export const getPerformanceSummary = () => perfLogger.getSummary();
