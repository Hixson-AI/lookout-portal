/**
 * Action Library Page
 * Browse and discover available workflow actions
 */

import { useState } from 'react';

interface Action {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
  secretSchema: Array<{ key: string; type: string; required: boolean }>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export default function ActionCatalog() {
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', 'integration', 'ai', 'data', 'logic', 'communication'];

  // TODO: Fetch actions from API
  useState(() => {
    setActions([
      {
        id: 'action:http-request',
        name: 'HTTP Request',
        description: 'Make HTTP requests to external APIs',
        category: 'integration',
        isSystem: true,
        secretSchema: [],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:ai-processing',
        name: 'AI Processing',
        description: 'Call AI providers for text generation',
        category: 'ai',
        isSystem: true,
        secretSchema: [
          { key: 'OPENROUTER_API_KEY', type: 'string', required: true },
          { key: 'ANTHROPIC_API_KEY', type: 'string', required: false },
        ],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:data-transform',
        name: 'Data Transform',
        description: 'Map and transform data between actions',
        category: 'data',
        isSystem: true,
        secretSchema: [],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:condition',
        name: 'Condition/Branch',
        description: 'Route execution based on conditions',
        category: 'logic',
        isSystem: true,
        secretSchema: [],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:delay',
        name: 'Delay',
        description: 'Pause execution for a duration',
        category: 'logic',
        isSystem: true,
        secretSchema: [],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:email-send',
        name: 'Email Send',
        description: 'Send emails via SendGrid',
        category: 'communication',
        isSystem: true,
        secretSchema: [
          { key: 'SENDGRID_API_KEY', type: 'string', required: true },
          { key: 'EMAIL_FROM', type: 'string', required: true },
        ],
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'action:twilio-sms',
        name: 'Twilio SMS',
        description: 'Send SMS messages via Twilio',
        category: 'communication',
        isSystem: true,
        secretSchema: [
          { key: 'TWILIO_ACCOUNT_SID', type: 'string', required: true },
          { key: 'TWILIO_AUTH_TOKEN', type: 'string', required: true },
          { key: 'TWILIO_PHONE_NUMBER', type: 'string', required: true },
        ],
        inputSchema: {},
        outputSchema: {},
      },
    ]);
  });

  const filteredSteps = actions.filter((step) => {
    const matchesCategory = selectedCategory === 'all' || step.category === selectedCategory;
    const matchesSearch = step.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         step.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      integration: 'bg-blue-100 text-blue-800',
      ai: 'bg-purple-100 text-purple-800',
      data: 'bg-green-100 text-green-800',
      logic: 'bg-yellow-100 text-yellow-800',
      communication: 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Action Library</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Search actions..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSteps.map((step) => (
            <div key={step.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold">{step.name}</h3>
                {step.isSystem && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">System</span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">{step.description}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(step.category)}`}>
                  {step.category}
                </span>
                {step.secretSchema.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {step.secretSchema.length} secret{step.secretSchema.length > 1 ? 's' : ''} required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSteps.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No actions match your search criteria
          </div>
        )}
      </div>
    </div>
  );
}
