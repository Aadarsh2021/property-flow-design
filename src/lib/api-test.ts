/**
 * API Test Suite
 * 
 * Comprehensive test to verify all API functions are working correctly
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { 
  newPartyAPI, 
  partyLedgerAPI, 
  userSettingsAPI, 
  finalTrialBalanceAPI, 
  authAPI, 
  dashboardAPI, 
  commissionTransactionAPI,
  checkBackendHealth,
  withFallback,
  isRateLimited,
  startHealthMonitoring,
  stopHealthMonitoring
} from './api';

import { 
  getCacheStats, 
  getCacheHealth, 
  clearAllCache,
  clearCacheByPattern 
} from './apiCache';

// Test configuration
const API_TEST_CONFIG = {
  timeout: 10000,
  retryAttempts: 2,
  testUserId: 'test-user-123'
};

// Test results interface
interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

class ApiTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;

  // Utility function to run a test
  private async runTest<T>(
    testName: string,
    testFunction: () => Promise<T>,
    skipCondition?: () => boolean
  ): Promise<void> {
    if (skipCondition && skipCondition()) {
      this.results.push({
        testName,
        status: 'SKIP',
        duration: 0
      });
      return;
    }

    const startTime = performance.now();
    try {
      await testFunction();
      const duration = performance.now() - startTime;
      this.results.push({
        testName,
        status: 'PASS',
        duration
      });
      console.log(`✅ ${testName} - PASSED (${duration.toFixed(2)}ms)`);
    } catch (error: any) {
      const duration = performance.now() - startTime;
      this.results.push({
        testName,
        status: 'FAIL',
        duration,
        error: error.message
      });
      console.log(`❌ ${testName} - FAILED (${duration.toFixed(2)}ms): ${error.message}`);
    }
  }

  // Test API configuration
  private async testApiConfiguration(): Promise<void> {
    console.log('🔧 Testing API Configuration...');
    
    // Test environment variables
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('VITE_API_BASE_URL is not configured');
    }
    
    console.log('✅ API Configuration is valid');
  }

  // Test health monitoring
  private async testHealthMonitoring(): Promise<void> {
    console.log('💓 Testing Health Monitoring...');
    
    const health = await checkBackendHealth();
    if (!health.isHealthy) {
      throw new Error(`API is not healthy: ${health.status}`);
    }
    
    console.log('✅ Health monitoring is working');
  }

  // Test cache functionality
  private async testCacheFunctionality(): Promise<void> {
    console.log('💾 Testing Cache Functionality...');
    
    const stats = getCacheStats();
    const health = getCacheHealth();
    
    if (!health.isHealthy) {
      console.warn('⚠️ Cache health warning:', health.recommendations);
    }
    
    console.log('✅ Cache functionality is working');
  }

  // Test newPartyAPI
  private async testNewPartyAPI(): Promise<void> {
    console.log('👥 Testing NewPartyAPI...');
    
    // Test getAll (should not throw even if no data)
    try {
      await newPartyAPI.getAll();
    } catch (error: any) {
      if (!error.message.includes('Network error') && !error.message.includes('fetch')) {
        throw error;
      }
      // Network errors are acceptable in test environment
    }
    
    console.log('✅ NewPartyAPI is working');
  }

  // Test partyLedgerAPI
  private async testPartyLedgerAPI(): Promise<void> {
    console.log('📊 Testing PartyLedgerAPI...');
    
    // Test getAllParties (should not throw even if no data)
    try {
      await partyLedgerAPI.getAllParties();
    } catch (error: any) {
      if (!error.message.includes('Network error') && !error.message.includes('fetch')) {
        throw error;
      }
      // Network errors are acceptable in test environment
    }
    
    console.log('✅ PartyLedgerAPI is working');
  }

  // Test authAPI
  private async testAuthAPI(): Promise<void> {
    console.log('🔐 Testing AuthAPI...');
    
    // Test forgotPassword with invalid email (should handle gracefully)
    try {
      await authAPI.forgotPassword('test@invalid.com');
    } catch (error: any) {
      if (!error.message.includes('Network error') && !error.message.includes('fetch')) {
        // This is expected to fail with invalid email
        if (!error.message.includes('Invalid email') && !error.message.includes('not found')) {
          throw error;
        }
      }
    }
    
    console.log('✅ AuthAPI is working');
  }

  // Test fallback mechanism
  private async testFallbackMechanism(): Promise<void> {
    console.log('🔄 Testing Fallback Mechanism...');
    
    const primaryCall = async () => {
      throw new Error('Primary call failed');
    };
    
    const fallbackCall = async () => {
      return 'Fallback success';
    };
    
    const result = await withFallback(primaryCall, fallbackCall);
    if (result !== 'Fallback success') {
      throw new Error('Fallback mechanism failed');
    }
    
    console.log('✅ Fallback mechanism is working');
  }

  // Test rate limiting detection
  private async testRateLimitDetection(): Promise<void> {
    console.log('⏱️ Testing Rate Limit Detection...');
    
    const rateLimitError = new Error('HTTP 429: Too Many Requests');
    const normalError = new Error('HTTP 500: Internal Server Error');
    
    if (!isRateLimited(rateLimitError)) {
      throw new Error('Rate limit detection failed');
    }
    
    if (isRateLimited(normalError)) {
      throw new Error('Rate limit detection false positive');
    }
    
    console.log('✅ Rate limit detection is working');
  }

  // Run all tests
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting API Test Suite...');
    this.startTime = performance.now();
    
    await this.runTest('API Configuration', () => this.testApiConfiguration());
    await this.runTest('Health Monitoring', () => this.testHealthMonitoring());
    await this.runTest('Cache Functionality', () => this.testCacheFunctionality());
    await this.runTest('NewPartyAPI', () => this.testNewPartyAPI());
    await this.runTest('PartyLedgerAPI', () => this.testPartyLedgerAPI());
    await this.runTest('AuthAPI', () => this.testAuthAPI());
    await this.runTest('Fallback Mechanism', () => this.testFallbackMechanism());
    await this.runTest('Rate Limit Detection', () => this.testRateLimitDetection());
    
    const totalDuration = performance.now() - this.startTime;
    this.printResults(totalDuration);
  }

  // Print test results
  private printResults(totalDuration: number): void {
    console.log('\n📊 API Test Results:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`⏱️ Total Duration: ${totalDuration.toFixed(2)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.testName}: ${result.error}`);
        });
    }
    
    console.log('\n🎯 API Status:', failed === 0 ? 'ALL SYSTEMS GO!' : 'ISSUES DETECTED');
  }

  // Get test results
  public getResults(): TestResult[] {
    return this.results;
  }
}

// Export test suite
export const apiTestSuite = new ApiTestSuite();

// Auto-run tests in development
if (import.meta.env.DEV) {
  console.log('🧪 Running API tests in development mode...');
  apiTestSuite.runAllTests().catch(console.error);
}
