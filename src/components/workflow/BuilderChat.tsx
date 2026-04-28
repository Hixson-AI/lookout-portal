/**
 * BuilderChat — conversational AI panel for the App Builder.
 *
 * Behavior:
 * - Shown full-screen in the canvas area when the canvas is empty.
 * - Collapses to a floating Sparkles icon (bottom-right) once steps exist.
 * - AI may return text or a UI tool_call; tool calls render as interactive widgets.
 * - When AI calls confirm_add_steps and user confirms, onApplySteps() fires and the
 *   chat collapses.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Loader2, X, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import {
  StepPickerWidget,
  FieldInputWidget,
  ChoiceSelectWidget,
  ConfirmAddStepsWidget,
  RequiredSecretsWidget,
  TestStepWidget,
} from './ChatWidgets';
import { chat as apiChat } from '../../lib/api/agents';
import type { ChatApiMessage, RawToolCall, ToolCallProps } from '../../lib/api/agents';

// ── Types ──────────────────────────────────────────────────────────────────

interface ToolCallState {
  id: string;
  tool: string;
  props: ToolCallProps;
  status: 'pending' | 'complete';
  result?: string;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  toolCall?: ToolCallState;
  rawToolCalls?: RawToolCall[];
}

interface ConfirmStep {
  stepId: string;
  name: string;
  config?: Record<string, unknown>;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface BuilderChatProps {
  tenantId: string;
  workflow: unknown;
  collapsed: boolean;
  appId?: string;
  onApplySteps: (
    steps: ConfirmStep[],
    trigger: { type: string; schedule?: string },
    workflowName: string,
  ) => void;
  onToggle: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function msgId() {
  return Math.random().toString(36).slice(2);
}

const GREETING: DisplayMessage = {
  id: 'greeting',
  role: 'assistant',
  text: "Hi! I'm your Lookout workflow builder. Tell me what you'd like to automate and I'll help you design it. For example: \"Send a weekly SMS report to our team\" or \"Alert me by email when a webhook fires\".",
};

// ── Component ──────────────────────────────────────────────────────────────

export function BuilderChat({ tenantId, workflow, collapsed, appId, onApplySteps, onToggle }: BuilderChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [apiHistory, setApiHistory] = useState<ChatApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send a user message ──────────────────────────────────────────────────

  const send = useCallback(async (userText: string, toolResults?: ChatApiMessage[]) => {
    const userMsg: DisplayMessage = { id: msgId(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);

    // Build the message history correctly: tool responses must immediately follow assistant messages with tool_calls
    let newHistory = [...apiHistory];

    // If toolResults are provided (from widget submission), insert them immediately after the last assistant message with tool_calls
    if (toolResults && toolResults.length > 0) {
      const lastAssistantMsg = [...newHistory].reverse().find(m => m.role === 'assistant' && m.toolCalls?.length);
      if (lastAssistantMsg) {
        const lastAssistantIndex = newHistory.findIndex(m => m === lastAssistantMsg);
        // Insert tool results immediately after the assistant message
        newHistory = [
          ...newHistory.slice(0, lastAssistantIndex + 1),
          ...toolResults,
          ...newHistory.slice(lastAssistantIndex + 1),
        ];
      } else {
        // No assistant message with tool_calls, just append
        newHistory = [...newHistory, ...toolResults];
      }
    }

    // Add the user message at the end (only if we're not submitting a widget result)
    if (userText || !toolResults) {
      newHistory = [...newHistory, { role: 'user', content: userText }];
    }
    setApiHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const result = await apiChat(tenantId, newHistory, workflow);

      if (!result) {
        throw new Error('API returned null/undefined result');
      }

      console.log('API result received:', result);
      console.log('Has toolCall:', !!result.toolCall, 'Tool name:', result.toolCall?.tool);

      const assistantDisplay: DisplayMessage = {
        id: msgId(),
        role: 'assistant',
        text: result.text ?? undefined,
        toolCall: result.toolCall
          ? { id: result.toolCall.id, tool: result.toolCall.tool, props: result.toolCall.props, status: 'pending' }
          : undefined,
        rawToolCalls: result.rawToolCalls ?? undefined,
      };

      console.log('Assistant display message:', assistantDisplay);
      setMessages(prev => {
        const newMessages = [...prev, assistantDisplay];
        console.log('Messages after adding:', newMessages);
        return newMessages;
      });

      const assistantApiMsg: ChatApiMessage = {
        role: 'assistant',
        content: result.text ?? null,
        toolCalls: result.rawToolCalls ?? undefined,
      };
      setApiHistory(prev => [...prev, assistantApiMsg]);
    } catch (err: any) {
      console.error('Chat API error:', err);
      setMessages(prev => [
        ...prev,
        { id: msgId(), role: 'assistant', text: `Sorry, something went wrong: ${err?.message ?? 'Unknown error'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [apiHistory, tenantId, workflow]);

  // ── Widget submit handler ────────────────────────────────────────────────

  const handleWidgetSubmit = useCallback((msgId_: string, toolCallId: string, result: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId_ && m.toolCall
          ? { ...m, toolCall: { ...m.toolCall, status: 'complete', result } }
          : m,
      ),
    );

    const toolResultMsg: ChatApiMessage = {
      role: 'tool',
      content: result,
      toolCallId,
    };

    // Don't add a user message when submitting widget results — the tool message IS the response to the LLM
    send('', [toolResultMsg]);
  }, [send]);

  // ── confirm_add_steps handler ────────────────────────────────────────────

  const handleConfirm = useCallback((
    msgId_: string,
    toolCallId: string,
    steps: ConfirmStep[],
    trigger: { type: string; schedule?: string },
  ) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId_ && m.toolCall
          ? { ...m, toolCall: { ...m.toolCall, status: 'complete', result: 'confirmed' } }
          : m,
      ),
    );

    const name = `Workflow — ${new Date().toLocaleDateString()}`;
    onApplySteps(steps, trigger, name);

    const toolResultMsg: ChatApiMessage = { role: 'tool', content: 'User confirmed. Steps added to canvas.', toolCallId };
    setApiHistory(prev => [...prev, toolResultMsg]);
  }, [onApplySteps]);

  const handleReject = useCallback((msgId_: string, toolCallId: string) => {
    handleWidgetSubmit(msgId_, toolCallId, 'Not quite right — please revise the proposal.');
  }, [handleWidgetSubmit]);

  // ── Keyboard submit ──────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) send(input.trim());
    }
  };

  // ── Render widget for a tool call ────────────────────────────────────────

  const renderWidget = (msg: DisplayMessage) => {
    if (!msg.toolCall) return null;
    const { id: tcId, tool, props, status } = msg.toolCall;
    const done = status === 'complete';

    const commonProps = { props, disabled: done || loading };

    if (tool === 'step_picker') {
      return (
        <StepPickerWidget
          {...commonProps}
          onSubmit={result => handleWidgetSubmit(msg.id, tcId, result)}
        />
      );
    }

    if (tool === 'field_input') {
      return (
        <FieldInputWidget
          {...commonProps}
          onSubmit={result => handleWidgetSubmit(msg.id, tcId, result)}
        />
      );
    }

    if (tool === 'choice_select') {
      return (
        <ChoiceSelectWidget
          {...commonProps}
          onSubmit={result => handleWidgetSubmit(msg.id, tcId, result)}
        />
      );
    }

    if (tool === 'confirm_add_steps') {
      return (
        <ConfirmAddStepsWidget
          {...commonProps}
          onConfirm={(steps, trigger) => handleConfirm(msg.id, tcId, steps, trigger)}
          onReject={() => handleReject(msg.id, tcId)}
        />
      );
    }

    if (tool === 'manage_required_secrets') {
      if (!appId) {
        return <div className="text-red-500 text-sm">App ID required to manage secrets</div>;
      }
      return (
        <RequiredSecretsWidget
          {...commonProps}
          props={{ ...props, tenantId, appId }}
          onSubmit={result => handleWidgetSubmit(msg.id, tcId, result)}
        />
      );
    }

    if (tool === 'test_step') {
      return (
        <TestStepWidget
          {...commonProps}
          onSubmit={result => handleWidgetSubmit(msg.id, tcId, result)}
        />
      );
    }

    return null;
  };

  // ── Collapsed floating button ─────────────────────────────────────────────

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        title="Open AI Builder"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  // ── Full chat panel ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">AI Builder</p>
            <p className="text-xs text-gray-400">Describe your workflow</p>
          </div>
        </div>
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm'
                  : 'text-gray-800 w-full'
              }`}
            >
              {msg.text && (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'text-gray-700' : ''}`}>
                  {msg.text}
                </p>
              )}
              {msg.role === 'assistant' && renderWidget(msg)}
              {msg.toolCall?.status === 'complete' && msg.toolCall.result && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  {msg.toolCall.result === 'confirmed' ? '✓ Added to canvas' : `✓ ${msg.toolCall.result}`}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
            placeholder="Describe what you want to build…"
            className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 max-h-28"
            style={{ minHeight: '38px' }}
          />
          <Button
            size="sm"
            onClick={() => input.trim() && !loading && send(input.trim())}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 h-9 w-9 p-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">⏎ send · ⇧⏎ newline</p>
      </div>
    </div>
  );
}
