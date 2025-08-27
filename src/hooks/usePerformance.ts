import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
}

export const usePerformance = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const updateCount = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    const endTime = Date.now();
    mountTime.current = endTime - startTime.current;
    
    if (import.meta.env.DEV) {
      // Component mounted successfully
    }
  }, []);

  useEffect(() => {
    updateCount.current += 1;
    
    if (import.meta.env.DEV && updateCount.current > 5) {
      console.warn(`⚠️ ${componentName} has re-rendered ${updateCount.current} times. Consider optimizing.`);
    }
  });

  const logRenderTime = (renderTime: number) => {
    if (import.meta.env.DEV && renderTime > 16) {
      console.warn(`🐌 ${componentName} render took ${renderTime}ms (target: <16ms)`);
    }
  };

  return { logRenderTime };
};
