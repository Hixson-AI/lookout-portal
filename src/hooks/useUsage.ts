import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { UsageRecord, UsageSummary } from '../lib/types';

export function useUsage(tenantId: string) {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!startDate || !endDate || !tenantId) return;
    
    try {
      const data = await api.getUsage(tenantId, startDate, endDate);
      setUsage(Array.isArray(data.usage) ? data.usage : []);
      setSummary(Array.isArray(data.summary) ? data.summary : []);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setUsage([]);
      setSummary([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, startDate, endDate]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    summary,
    isLoading,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  };
}
