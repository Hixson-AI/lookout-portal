/**
 * App Dashboard Page
 * Execution history, monitoring, and app status
 */

import { useState, useEffect } from 'react';

interface Execution {
  id: string;
  appId: string;
  triggerType: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface App {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  triggerConfig: {
    type: string;
    schedule?: string;
  };
}

export default function AppDashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // TODO: Fetch apps from API
    setApps([
      { id: '1', name: 'Patient Reminder', status: 'active', triggerConfig: { type: 'cron', schedule: '0 * * * *' } },
      { id: '2', name: 'Data Sync', status: 'active', triggerConfig: { type: 'webhook' } },
    ]);
  }, []);

  useEffect(() => {
    if (selectedApp) {
      // TODO: Fetch executions for selected app
      setExecutions([
        { id: '1', appId: selectedApp.id, triggerType: 'cron', status: 'completed', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3550000).toISOString(), error: null },
        { id: '2', appId: selectedApp.id, triggerType: 'cron', status: 'failed', startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7150000).toISOString(), error: 'API timeout' },
      ]);
    }
  }, [selectedApp]);

  const filteredExecutions = statusFilter === 'all'
    ? executions
    : executions.filter(e => e.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'archived':
      case 'draft':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">App Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: App List */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Apps</h2>
            <div className="space-y-2">
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedApp?.id === app.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{app.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-gray-500">{app.triggerConfig.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Execution History */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">
                {selectedApp ? `Executions: ${selectedApp.name}` : 'Select an app to view executions'}
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {selectedApp ? (
              <div className="space-y-3">
                {filteredExecutions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No executions found</div>
                ) : (
                  filteredExecutions.map((execution) => (
                    <div key={execution.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(execution.status)}`}>
                              {execution.status}
                            </span>
                            <span className="text-sm text-gray-500">{execution.triggerType}</span>
                          </div>
                          <div className="mt-2 text-sm">
                            <div>Started: {new Date(execution.startedAt).toLocaleString()}</div>
                            {execution.completedAt && (
                              <div>Completed: {new Date(execution.completedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        {execution.error && (
                          <div className="text-red-600 text-sm">
                            {execution.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select an app from the left panel to view its execution history
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {selectedApp && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="text-sm text-gray-500">Total Executions</div>
              <div className="text-2xl font-bold">{executions.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {executions.length > 0
                  ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)
                  : 0}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="text-sm text-gray-500">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {executions.filter(e => e.status === 'failed').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="text-sm text-gray-500">Running</div>
              <div className="text-2xl font-bold text-blue-600">
                {executions.filter(e => e.status === 'running').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
