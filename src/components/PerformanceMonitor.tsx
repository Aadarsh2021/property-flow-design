import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, Database, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  renderTimes: number[];
  apiCallTimes: number[];
  memoryUsage: number;
  lastUpdate: Date;
  slowOperations: Array<{
    operation: string;
    duration: number;
    timestamp: Date;
  }>;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTimes: [],
    apiCallTimes: [],
    memoryUsage: 0,
    lastUpdate: new Date(),
    slowOperations: []
  });
  const [isVisible, setIsVisible] = useState(false);

  // Monitor performance metrics
  const updateMetrics = useCallback(() => {
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage,
        lastUpdate: new Date()
      }));
    }
  }, []);

  // Track slow operations
  const trackSlowOperation = useCallback((operation: string, duration: number) => {
    if (duration > 1000) { // Operations slower than 1 second
      setMetrics(prev => ({
        ...prev,
        slowOperations: [
          ...prev.slowOperations.slice(-9), // Keep last 10
          {
            operation,
            duration,
            timestamp: new Date()
          }
        ]
      }));
    }
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateMetrics]);

  // Expose tracking function globally for debugging
  useEffect(() => {
    (window as any).trackSlowOperation = trackSlowOperation;
    return () => {
      delete (window as any).trackSlowOperation;
    };
  }, [trackSlowOperation]);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700"
        size="sm"
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  const averageRenderTime = metrics.renderTimes.length > 0 
    ? metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length 
    : 0;

  const averageApiTime = metrics.apiCallTimes.length > 0
    ? metrics.apiCallTimes.reduce((a, b) => a + b, 0) / metrics.apiCallTimes.length
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2 text-blue-600" />
              Performance Monitor
            </CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm text-gray-600">Memory</span>
            </div>
            <Badge variant={metrics.memoryUsage > 50 ? "destructive" : "secondary"}>
              {metrics.memoryUsage.toFixed(1)} MB
            </Badge>
          </div>

          {/* Average Render Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-600" />
              <span className="text-sm text-gray-600">Avg Render</span>
            </div>
            <Badge variant={averageRenderTime > 16 ? "destructive" : "secondary"}>
              {averageRenderTime.toFixed(1)}ms
            </Badge>
          </div>

          {/* Average API Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-sm text-gray-600">Avg API</span>
            </div>
            <Badge variant={averageApiTime > 1000 ? "destructive" : "secondary"}>
              {averageApiTime.toFixed(0)}ms
            </Badge>
          </div>

          {/* Slow Operations */}
          {metrics.slowOperations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Slow Operations</span>
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {metrics.slowOperations.slice(-3).map((op, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span className="truncate">{op.operation}</span>
                    <span className="text-red-600 font-medium">{op.duration.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-gray-400 text-center">
            Last update: {metrics.lastUpdate.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
