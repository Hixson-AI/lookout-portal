/**
 * FlowCanvas — React Flow v12 node-based workflow canvas.
 *
 * Features:
 *  - Drop steps from catalog onto canvas (drag-and-drop via HTML5 DnD)
 *  - Auto-connects nodes sequentially via animated edges
 *  - Click a node to open its config panel
 *  - Delete nodes via keyboard or ✕ button
 *  - Branching support: condition nodes fan out true/false edges
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useRef } from 'react';
import { Zap } from 'lucide-react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeTypes,
  type ReactFlowInstance,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowStep } from '../../lib/types';

// ── Category styling ──────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, { border: string; bg: string; badge: string }> = {
  integration: { border: '#3b82f6', bg: '#eff6ff', badge: 'bg-blue-100 text-blue-800' },
  ai:          { border: '#8b5cf6', bg: '#f5f3ff', badge: 'bg-purple-100 text-purple-800' },
  data:        { border: '#10b981', bg: '#ecfdf5', badge: 'bg-green-100 text-green-800' },
  logic:       { border: '#f59e0b', bg: '#fffbeb', badge: 'bg-yellow-100 text-yellow-800' },
  communication: { border: '#ec4899', bg: '#fdf2f8', badge: 'bg-pink-100 text-pink-800' },
  trigger:     { border: '#6366f1', bg: '#eef2ff', badge: 'bg-indigo-100 text-indigo-800' },
};
const DEFAULT_STYLE = { border: '#6b7280', bg: '#f9fafb', badge: 'bg-gray-100 text-gray-700' };

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLE[cat] ?? DEFAULT_STYLE;
}

// ── Step summary line shown on the node card ──────────────────────────

function stepSummary(data: WorkflowNodeData): string {
  const cfg = data.config as any;
  switch (data.stepId) {
    case 'step:http-request': {
      const method = cfg?.method || 'GET';
      const url = cfg?.url ? cfg.url.replace(/^https?:\/\//, '').slice(0, 30) : '—';
      return `${method} ${url}`;
    }
    case 'step:ai-processing':
      return cfg?.model ? cfg.model.split('/')[1] || cfg.model : 'No model selected';
    case 'step:delay':
      return cfg?.duration ? `${cfg.duration}${cfg.unit || 'ms'}` : '—';
    case 'step:condition':
      return cfg?.expression ? cfg.expression.slice(0, 28) : 'No condition';
    case 'step:email-send':
      return cfg?.to ? `To: ${cfg.to}` : '—';
    case 'step:twilio-sms':
      return cfg?.to ? `SMS → ${cfg.to}` : '—';
    default:
      return '';
  }
}

// ── WorkflowNode ──────────────────────────────────────────────────────

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  stepId: string;
  category: string;
  config: Record<string, unknown>;
  isSelected: boolean;
  isTrigger?: boolean;
  webhookUrl?: string;
  hasValidationError?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function WorkflowNode({ id, data }: { id: string; data: WorkflowNodeData }) {
  const style = getCategoryStyle(data.category);
  const summary = data.isTrigger ? '' : stepSummary(data);
  const hasError = !data.isTrigger && !data.config;

  return (
    <div
      onClick={() => data.onSelect(id)}
      className="rounded-xl shadow-sm cursor-pointer select-none transition-all duration-150 relative"
      style={{
        minWidth: 200,
        border: `2px solid ${data.hasValidationError ? '#ef4444' : data.isSelected ? '#1d4ed8' : style.border}`,
        background: data.hasValidationError ? '#fef2f2' : data.isSelected ? '#dbeafe' : style.bg,
        boxShadow: data.hasValidationError
          ? '0 0 0 3px rgba(239,68,68,0.25)'
          : data.isSelected
          ? '0 0 0 3px rgba(59,130,246,0.3)'
          : '0 1px 3px rgba(0,0,0,0.07)',
      }}
    >
      {/* Top handle */}
      {!data.isTrigger && (
        <Handle type="target" position={Position.Top} style={{ background: style.border }} />
      )}

      <div className="px-3 py-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-800 truncate leading-tight">{data.label}</span>
            <span className={`inline-block text-[9px] font-medium px-1.5 py-0 rounded mt-0.5 ${style.badge}`}>
              {data.isTrigger ? 'Trigger' : (data.category.charAt(0).toUpperCase() + data.category.slice(1))}
            </span>
          </div>
          {!data.isTrigger && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
              className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Validation error indicator */}
        {data.hasValidationError && (
          <div className="absolute top-2 right-2">
            <div className="animate-pulse rounded-full bg-red-500 h-2 w-2 dot"></div>
          </div>
        )}

        {/* Summary line */}
        {summary && (
          <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">{summary}</p>
        )}

        {/* Error indicator */}
        {(hasError || data.hasValidationError) && (
          <p className="text-[9px] text-red-500 mt-0.5">⚠ {data.hasValidationError ? 'Validation error' : 'Configure'}</p>
        )}
      </div>

      {/* Bottom handle — condition gets two */}
      {data.stepId === 'step:condition' ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: '30%', background: '#10b981' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: '70%', background: '#ef4444' }}
          />
          <div className="flex justify-between px-6 pb-1">
            <span className="text-[9px] text-green-600 font-semibold">TRUE</span>
            <span className="text-[9px] text-red-500 font-semibold">FALSE</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} style={{ background: style.border }} />
      )}
    </div>
  );
}

// ── TriggerNode ───────────────────────────────────────────────────────

function TriggerNode({ data }: { data: WorkflowNodeData }) {
  const style = getCategoryStyle('trigger');
  return (
    <div
      onClick={() => data.onSelect('__trigger__')}
      className="rounded-xl shadow cursor-pointer select-none transition-all"
      style={{
        minWidth: 200,
        border: `2px solid ${data.isSelected ? '#1d4ed8' : style.border}`,
        background: data.isSelected ? '#dbeafe' : style.bg,
      }}
    >
      <div className="px-3 py-2">
        <div>
           <span className="block text-sm font-semibold text-gray-800 leading-tight"><Zap className='h-3 w-3 inline mr-1' />{data.label}</span>
          <span className={`inline-block text-[9px] font-medium px-1.5 py-0 rounded mt-0.5 ${style.badge}`}>
            Trigger
          </span>
        </div>
        {data.webhookUrl && data.webhookUrl !== '' ? (
          <div className="mt-1.5 flex items-center gap-1">
            <code className="text-[9px] text-gray-500 font-mono truncate flex-1" style={{ maxWidth: 150 }}>
              {data.webhookUrl.replace(/^https?:\/\/[^/]+/, '')}
            </code>
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(data.webhookUrl as string); }}
              className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Copy webhook URL"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        ) : (
           <p className="text-[9px] text-amber-500 mt-1">/webhooks/{'{id}'} — save to activate</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: style.border }} />
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  workflow: WorkflowNode as any,
  trigger: TriggerNode as any,
};

// ── Helpers ───────────────────────────────────────────────────────────

function stepsToNodes(
  steps: WorkflowStep[],
  triggerType: string,
  selectedId: string | null,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
  categories: Record<string, string>,
  webhookUrl?: string | null,
  errorStepIds?: Set<string>,
): Node[] {
  const nodes: Node[] = [
    {
      id: '__trigger__',
      type: 'trigger',
      position: { x: 220, y: 20 },
      data: {
        label: triggerType.charAt(0).toUpperCase() + triggerType.slice(1),
        stepId: '__trigger__',
        category: 'trigger',
        config: { type: triggerType },
        isSelected: selectedId === '__trigger__',
        isTrigger: true,
        webhookUrl: webhookUrl ?? undefined,
        onSelect,
        onDelete,
      } satisfies WorkflowNodeData,
    },
  ];

  steps.forEach((step, i) => {
    nodes.push({
      id: step.id,
      type: 'workflow',
      position: { x: 220, y: 100 + i * 95 },
      data: {
        label: step.name,
        stepId: step.stepId,
        category: categories[step.stepId] ?? 'integration',
        config: step.config,
        isSelected: selectedId === step.id,
        isTrigger: false,
        hasValidationError: errorStepIds?.has(step.id) ?? false,
        onSelect,
        onDelete,
      } satisfies WorkflowNodeData,
    });
  });

  return nodes;
}

function stepsToEdges(steps: WorkflowStep[]): Edge[] {
  const edges: Edge[] = [];
  const allIds = ['__trigger__', ...steps.map(s => s.id)];

  for (let i = 0; i < allIds.length - 1; i++) {
    const src = allIds[i];
    const tgt = allIds[i + 1];
    const srcStep = src === '__trigger__' ? null : steps.find(s => s.id === src);
    const isCondition = srcStep?.stepId === 'step:condition';

    if (isCondition) {
      edges.push({
        id: `${src}-true-${tgt}`,
        source: src,
        sourceHandle: 'true',
        target: tgt,
        label: 'true',
        animated: false,
        type: 'smoothstep',
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981', width: 16, height: 16 },
      });
    } else {
      edges.push({
        id: `${src}->${tgt}`,
        source: src,
        target: tgt,
        animated: false,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 16, height: 16 },
      });
    }
  }

  return edges;
}

// ── FlowCanvas (main export) ──────────────────────────────────────────

export interface FlowCanvasProps {
  steps: WorkflowStep[];
  triggerType: string;
  selectedStepId: string | null;
  catalogCategories: Record<string, string>;
  webhookUrl?: string | null;
  errorStepIds?: Set<string>;
  onSelectStep: (id: string | null) => void;
  onDeleteStep: (id: string) => void;
  onDropStep: (stepId: string, stepName: string, category: string) => void;
  onReorderSteps: (steps: WorkflowStep[]) => void;
}

function FlowCanvasInner({
  steps,
  triggerType,
  selectedStepId,
  catalogCategories,
  webhookUrl,
  errorStepIds,
  onSelectStep,
  onDeleteStep,
  onDropStep,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = React.useState<ReactFlowInstance | null>(null);

  const handleSelect = useCallback((id: string) => {
    onSelectStep(id === '__trigger__' ? '__trigger__' : id);
  }, [onSelectStep]);

  const handleDelete = useCallback((id: string) => {
    onDeleteStep(id);
  }, [onDeleteStep]);

  const nodes = stepsToNodes(
    steps, triggerType, selectedStepId, handleSelect, handleDelete, catalogCategories, webhookUrl, errorStepIds
  );
  const edges = stepsToEdges(steps);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(Array.isArray(nodes) ? nodes : []);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(Array.isArray(edges) ? edges : []);

  // Keep RF nodes AND edges in sync when steps change externally
  React.useEffect(() => {
    setRfNodes(prev => {
      const nextNodes = stepsToNodes(steps, triggerType, selectedStepId, handleSelect, handleDelete, catalogCategories, webhookUrl, errorStepIds);
      if (!Array.isArray(nextNodes)) {
        return prev;
      }
      const nodeMap = new Map(prev.map(node => [node.id, node]));
      const mergedNodes = nextNodes.map(nextNode => {
        const prevNode = nodeMap.get(nextNode.id);
        if (prevNode) {
          return { ...nextNode, position: prevNode.position };
        }
        return nextNode;
      });
      return mergedNodes;
    });
    
    const nextEdges = stepsToEdges(steps);
    setRfEdges(Array.isArray(nextEdges) ? nextEdges : []);
    // Re-fit after a tick so new nodes are measured before fitView
    setTimeout(() => rfInstance?.fitView({ padding: 0.25 }), 50);
  }, [steps, triggerType, selectedStepId, webhookUrl, errorStepIds, handleSelect, handleDelete]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setRfEdges((eds) => addEdge(connection, eds));
    },
    [setRfEdges]
  );

  // ── HTML5 DnD drop ──────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!rfInstance || !reactFlowWrapper.current) return;

      const stepId = e.dataTransfer.getData('application/workflow-step-id');
      const stepName = e.dataTransfer.getData('application/workflow-step-name');
      const category = e.dataTransfer.getData('application/workflow-step-category');
      if (!stepId) return;

      onDropStep(stepId, stepName, category);
    },
    [rfInstance, onDropStep]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', minHeight: 480 }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        deleteKeyCode={null}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 16, height: 16 } }}

        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
