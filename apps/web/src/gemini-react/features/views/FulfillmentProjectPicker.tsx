import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import {
  fulfillmentStatusMeta,
  loadFulfillmentOverview,
  type FulfillmentOverviewStatus,
  type FulfillmentProjectOption
} from './fulfillment-overview-data';

interface FulfillmentProjectPickerProps {
  currentProject: {
    id: string;
    code: string;
    name: string;
    status: string;
    fulfillmentStatus: FulfillmentOverviewStatus;
    externalTradeFlag: boolean;
    supplierName: string;
  };
}

const recentStorageKey = 'eprocurement:fulfillment-recent-projects:v1';

function readRecentProjectIds() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(recentStorageKey) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 5) : [];
  } catch {
    return [] as string[];
  }
}

export function FulfillmentProjectPicker({ currentProject }: FulfillmentProjectPickerProps) {
  const { currentUser, navigateToPath } = useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [options, setOptions] = useState<FulfillmentProjectOption[]>([]);
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>(readRecentProjectIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextIds = [currentProject.id, ...recentProjectIds.filter((id) => id !== currentProject.id)].slice(0, 5);
    setRecentProjectIds(nextIds);
    window.localStorage.setItem(recentStorageKey, JSON.stringify(nextIds));
    // Only the active project should promote itself; recent changes are handled when selecting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open || !currentUser) return;
    let active = true;
    const userId = currentUser.id;

    async function loadOptions() {
      setLoading(true);
      setError('');
      try {
        const result = await loadFulfillmentOverview(userId, { keyword: debouncedQuery, page: 1, pageSize: 20 });
        if (active) setOptions(result.projectOptions);
      } catch (loadError) {
        if (!active) return;
        setOptions([]);
        setError(loadError instanceof Error ? loadError.message : '履约项目搜索失败。');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, [currentUser?.id, debouncedQuery, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const availableOptions = useMemo(() => {
    const currentOption: FulfillmentProjectOption = { ...currentProject };
    const merged = options.some((option) => option.id === currentProject.id) ? options : [currentOption, ...options];
    return [...merged].sort((left, right) => {
      const leftRecent = recentProjectIds.indexOf(left.id);
      const rightRecent = recentProjectIds.indexOf(right.id);
      if (leftRecent >= 0 || rightRecent >= 0) {
        if (leftRecent < 0) return 1;
        if (rightRecent < 0) return -1;
        return leftRecent - rightRecent;
      }
      if (left.externalTradeFlag !== right.externalTradeFlag) return left.externalTradeFlag ? 1 : -1;
      return String(right.lastUpdatedAt ?? '').localeCompare(String(left.lastUpdatedAt ?? ''));
    });
  }, [currentProject, options, recentProjectIds]);

  const recentOptions = availableOptions.filter((option) => recentProjectIds.includes(option.id)).slice(0, 5);
  const regularOptions = availableOptions.filter((option) => !recentProjectIds.includes(option.id) && !option.externalTradeFlag);
  const externalOptions = availableOptions.filter((option) => !recentProjectIds.includes(option.id) && option.externalTradeFlag);

  const selectProject = (projectId: string) => {
    const nextIds = [projectId, ...recentProjectIds.filter((id) => id !== projectId)].slice(0, 5);
    setRecentProjectIds(nextIds);
    window.localStorage.setItem(recentStorageKey, JSON.stringify(nextIds));
    setOpen(false);
    setQuery('');
    navigateToPath(`/order-fulfillment?projectId=${encodeURIComponent(projectId)}`);
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-[360px]">
      <span className="mb-1 block text-xs font-medium text-slate-500">切换履约项目</span>
      <button
        type="button"
        data-ui-check="fulfillment-project-picker"
        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 truncate">{currentProject.code} / {currentProject.name}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl" data-ui-check="fulfillment-project-picker-panel">
          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                autoFocus
                data-ui-check="fulfillment-project-picker-search"
                className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-10 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索项目、合同、订单或供应商"
              />
              {query ? (
                <button type="button" title="清空搜索" className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700" onClick={() => setQuery('')}>
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2" role="listbox" aria-label="履约项目搜索结果">
            {loading ? <div className="px-3 py-6 text-center text-sm text-slate-500">项目搜索中...</div> : null}
            {error ? <div className="px-3 py-4 text-sm text-rose-600">{error}</div> : null}
            {!loading && !error ? (
              <>
                <ProjectOptionGroup label="最近访问" options={recentOptions} currentProjectId={currentProject.id} onSelect={selectProject} />
                <ProjectOptionGroup label={debouncedQuery ? '搜索结果' : '履约项目'} options={regularOptions} currentProjectId={currentProject.id} onSelect={selectProject} />
                <ProjectOptionGroup label="外部交易备案" options={externalOptions} currentProjectId={currentProject.id} onSelect={selectProject} />
                {!availableOptions.length ? <div className="px-3 py-8 text-center text-sm text-slate-500">没有匹配的履约项目。</div> : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProjectOptionGroup({
  label,
  options,
  currentProjectId,
  onSelect
}: {
  label: string;
  options: FulfillmentProjectOption[];
  currentProjectId: string;
  onSelect: (projectId: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="mb-2 last:mb-0">
      <div className="px-3 py-2 text-xs font-medium text-slate-400">{label}</div>
      {options.map((option) => {
        const statusMeta = fulfillmentStatusMeta[option.fulfillmentStatus];
        const selected = option.id === currentProjectId;
        return (
          <button
            type="button"
            role="option"
            aria-selected={selected}
            data-project-id={option.id}
            key={option.id}
            className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50"
            onClick={() => onSelect(option.id)}
          >
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-[#006666]' : 'text-transparent'}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{option.code} / {option.name}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{option.supplierName}</span>
            </span>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </button>
        );
      })}
    </div>
  );
}
