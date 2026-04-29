/**
 * CatalogGroupBrowser — left-sidebar tree for browsing the action catalog
 * by capability (hierarchical) or provider.
 *
 * Used in ActionCatalogDialog and PlatformAdmin.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import type { AgentAction } from '../../lib/api/actions';
import {
  type GroupSelection,
  type CapGroupCount,
  type ProviderCount,
  getCapabilityGroupCounts,
  getProviderCounts,
  getProviderIcon,
} from '../../lib/catalog-taxonomy';

interface CatalogGroupBrowserProps {
  actions: AgentAction[];
  selection: GroupSelection;
  onSelect: (s: GroupSelection) => void;
  className?: string;
}

export function CatalogGroupBrowser({
  actions,
  selection,
  onSelect,
  className = '',
}: CatalogGroupBrowserProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const capGroups: CapGroupCount[] = getCapabilityGroupCounts(actions);
  const providers: ProviderCount[] = getProviderCounts(actions);

  const toggle = (label: string) =>
    setExpandedGroups(prev => {
      const n = new Set(prev);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });

  const isActive = (sel: GroupSelection): boolean => {
    if (selection.mode !== sel.mode) return false;
    if (sel.mode === 'all') return true;
    if (sel.mode === 'cap-group' && selection.mode === 'cap-group') return selection.group === sel.group;
    if (sel.mode === 'cap-sub' && selection.mode === 'cap-sub') return selection.sub === sel.sub;
    if (sel.mode === 'provider' && selection.mode === 'provider') return selection.provider === sel.provider;
    return false;
  };

  return (
    <div className={`flex flex-col overflow-y-auto py-2 ${className}`}>
      {/* All */}
      <BrowserRow
        label="All Actions"
        count={actions.length}
        active={isActive({ mode: 'all' })}
        onClick={() => onSelect({ mode: 'all' })}
      />

      {/* Capabilities */}
      <SectionHeader label="Capabilities" />
      {capGroups.map(({ group, count, subCounts }) => {
        const expanded = expandedGroups.has(group.label);
        const groupSel: GroupSelection = { mode: 'cap-group', group: group.label };
        return (
          <div key={group.label}>
            <BrowserRow
              label={group.label}
              Icon={group.Icon}
              count={count}
              active={isActive(groupSel)}
              expandable
              expanded={expanded}
              onToggle={() => toggle(group.label)}
              onClick={() => {
                onSelect(groupSel);
                if (!expanded) toggle(group.label);
              }}
            />
            {expanded &&
              subCounts.map(({ tag, count: sc }) => (
                <BrowserRow
                  key={tag}
                  label={tag}
                  count={sc}
                  indent
                  active={isActive({ mode: 'cap-sub', group: group.label, sub: tag })}
                  onClick={() => onSelect({ mode: 'cap-sub', group: group.label, sub: tag })}
                />
              ))}
          </div>
        );
      })}

      {/* Providers */}
      {providers.length > 0 && (
        <>
          <SectionHeader label="Providers" />
          {providers.map(({ provider, count }) => (
            <BrowserRow
              key={provider}
              label={provider}
              Icon={getProviderIcon(provider)}
              count={count}
              active={isActive({ mode: 'provider', provider })}
              onClick={() => onSelect({ mode: 'provider', provider })}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-3 mb-0.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
      {label}
    </div>
  );
}

interface BrowserRowProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  Icon?: LucideIcon;
  indent?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function BrowserRow({
  label,
  count,
  active,
  onClick,
  Icon,
  indent = false,
  expandable = false,
  expanded = false,
  onToggle,
}: BrowserRowProps) {
  return (
    <div className={`flex items-center ${indent ? 'pl-5' : 'pl-1'}`}>
      {expandable ? (
        <button
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0"
          tabIndex={-1}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      ) : (
        <div className="w-4 shrink-0" />
      )}
      <button
        onClick={onClick}
        className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-left min-w-0 ${
          active
            ? 'bg-indigo-100 text-indigo-800 font-medium'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        {Icon && <Icon className={`shrink-0 w-3.5 h-3.5 ${active ? 'text-indigo-700' : 'text-gray-500'}`} />}
        <span className="flex-1 truncate text-xs capitalize">{label}</span>
        <span
          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            active ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {count}
        </span>
      </button>
    </div>
  );
}
