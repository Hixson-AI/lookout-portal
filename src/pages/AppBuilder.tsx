/**
 * App Builder Page
 * Visual workflow composer for creating and editing agent workflows
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface WorkflowStep {
  id: string;
  stepId: string;
  name: string;
  config: Record<string, unknown>;
}

interface Workflow {
  name: string;
  description: string;
  triggerConfig: {
    type: 'cron' | 'webhook' | 'api';
    schedule?: string;
  };
  steps: WorkflowStep[];
}

export default function AppBuilder() {
  useAuth();
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    description: '',
    triggerConfig: { type: 'webhook' },
    steps: [],
  });
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  const handleAddStep = (stepId: string, name: string) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      stepId,
      name,
      config: {},
    };
    setWorkflow({ ...workflow, steps: [...workflow.steps, newStep] });
  };

  const handleRemoveStep = (stepId: string) => {
    setWorkflow({ ...workflow, steps: workflow.steps.filter(s => s.id !== stepId) });
    if (selectedStep?.id === stepId) setSelectedStep(null);
  };

  const handleSave = async () => {
    // TODO: Call API to save workflow
    console.log('Saving workflow:', workflow);
  };

  const handleAIAssist = async () => {
    // TODO: Call Workflow Builder Agent
    console.log('AI assist for:', workflow.name);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">App Builder</h1>
          <div className="flex gap-3">
            <button
              onClick={handleAIAssist}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ✨ AI Assist
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Workflow
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Workflow Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Workflow Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={workflow.name}
                  onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="My Workflow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={workflow.description}
                  onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Describe what this workflow does"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                <select
                  value={workflow.triggerConfig.type}
                  onChange={(e) => setWorkflow({ 
                    ...workflow, 
                    triggerConfig: { ...workflow.triggerConfig, type: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="webhook">Webhook</option>
                  <option value="api">API Trigger</option>
                  <option value="cron">Cron Schedule</option>
                </select>
              </div>
              {workflow.triggerConfig.type === 'cron' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cron Schedule</label>
                  <input
                    type="text"
                    value={workflow.triggerConfig.schedule || ''}
                    onChange={(e) => setWorkflow({ 
                      ...workflow, 
                      triggerConfig: { ...workflow.triggerConfig, schedule: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0 * * * *"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Center Panel: Step Canvas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Workflow Steps</h2>
            <div className="space-y-3">
              {workflow.steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No steps added yet. Add steps from the catalog.
                </div>
              ) : (
                workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStep?.id === step.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedStep(step)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-gray-500">Step {index + 1}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStep(step.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Step Catalog */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Step Catalog</h2>
            <div className="space-y-2">
              {[
                { id: 'step:http-request', name: 'HTTP Request', category: 'Integration' },
                { id: 'step:ai-processing', name: 'AI Processing', category: 'AI' },
                { id: 'step:data-transform', name: 'Data Transform', category: 'Data' },
                { id: 'step:condition', name: 'Condition/Branch', category: 'Logic' },
                { id: 'step:delay', name: 'Delay', category: 'Logic' },
                { id: 'step:email-send', name: 'Email Send', category: 'Communication' },
                { id: 'step:twilio-sms', name: 'Twilio SMS', category: 'Communication' },
              ].map((step) => (
                <button
                  key={step.id}
                  onClick={() => handleAddStep(step.id, step.name)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{step.name}</div>
                  <div className="text-sm text-gray-500">{step.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step Configuration Panel */}
        {selectedStep && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Configure: {selectedStep.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Step Configuration (JSON)</label>
                <textarea
                  value={JSON.stringify(selectedStep.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      const updatedSteps = workflow.steps.map(s =>
                        s.id === selectedStep.id ? { ...s, config } : s
                      );
                      setWorkflow({ ...workflow, steps: updatedSteps });
                      setSelectedStep({ ...selectedStep, config });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={8}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
