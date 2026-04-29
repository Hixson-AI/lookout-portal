/**
 * Secret Management Page
 * Manage app secrets (encrypted at rest)
 */

import { useState } from 'react';

interface Secret {
  id: string;
  key: string;
  createdAt: string;
  updatedAt: string;
}

export default function SecretManagement() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});

  const handleAddSecret = async () => {
    if (!newSecretKey || !newSecretValue) return;

    // TODO: Call API to set secret
    const newSecret: Secret = {
      id: `secret_${Date.now()}`,
      key: newSecretKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSecrets([...secrets, newSecret]);
    setNewSecretKey('');
    setNewSecretValue('');
  };

  const handleDeleteSecret = (secretId: string) => {
    // TODO: Call API to delete secret
    setSecrets(secrets.filter(s => s.id !== secretId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Secret Management</h1>

        {/* Add Secret Form */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Secret</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
              <input
                type="text"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="API_KEY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Value</label>
              <input
                type="password"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddSecret}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Secret
              </button>
            </div>
          </div>
        </div>

        {/* Secrets List */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Secrets</h2>
          {secrets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No secrets configured</div>
          ) : (
            <div className="space-y-3">
              {secrets.map((secret) => (
                <div key={secret.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{secret.key}</div>
                    <div className="text-sm text-gray-500">
                      Updated: {new Date(secret.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowValue({ ...showValue, [secret.id]: !showValue[secret.id] })}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      {showValue[secret.id] ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> Secrets are encrypted at rest using AES-256-GCM. Values are never displayed in plain text after they are saved.
          </div>
        </div>
      </div>
    </div>
  );
}
