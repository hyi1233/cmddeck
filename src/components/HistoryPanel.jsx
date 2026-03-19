import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  MessageSquare,
  Clock,
  Calendar,
  Trash2,
  FolderOpen,
  Terminal,
  Cpu,
  Loader,
  ChevronRight,
} from 'lucide-react';
import { localizeSessionTitle, useI18n } from '../i18n';

const PROVIDERS = {
  claude: {
    label: 'Claude Code',
    icon: Terminal,
    color: 'text-green-400',
    border: 'hover:border-green-400/40',
    pill: 'bg-green-500/10 text-green-400',
  },
  codex: {
    label: 'Codex',
    icon: Cpu,
    color: 'text-sky-400',
    border: 'hover:border-sky-400/40',
    pill: 'bg-sky-500/10 text-sky-400',
  },
};

function getGroupLabel(key, tx) {
  const labels = {
    today: tx('Today', '今天'),
    yesterday: tx('Yesterday', '昨天'),
    thisWeek: tx('This Week', '本周'),
    thisMonth: tx('This Month', '本月'),
    older: tx('Older', '更早'),
  };

  return labels[key] || key;
}

function formatDate(timestamp, tx, localeTag) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return tx('Just now', '刚刚');
  if (diffMins < 60) return tx('{count}m ago', '{count} 分钟前', { count: diffMins });
  if (diffHours < 24) return tx('{count}h ago', '{count} 小时前', { count: diffHours });
  if (diffDays < 7) return tx('{count}d ago', '{count} 天前', { count: diffDays });

  return date.toLocaleDateString(localeTag, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function groupByDate(items, getTimestamp) {
  const groups = { today: [], yesterday: [], thisWeek: [], thisMonth: [], older: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  for (const item of items) {
    const date = new Date(getTimestamp(item));
    if (date >= today) groups.today.push(item);
    else if (date >= yesterday) groups.yesterday.push(item);
    else if (date >= weekAgo) groups.thisWeek.push(item);
    else if (date >= monthAgo) groups.thisMonth.push(item);
    else groups.older.push(item);
  }

  return groups;
}

function renderGrouped(groups, renderCard, emptyText, tx) {
  const hasAny = Object.values(groups).some((items) => items.length > 0);
  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <MessageSquare size={32} className="mb-3 opacity-30" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([key, items]) => {
        if (items.length === 0) {
          return null;
        }

        return (
          <div key={key}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Calendar size={11} className="text-gray-400" />
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {getGroupLabel(key, tx)}
              </h3>
              <span className="text-[10px] text-gray-500">({items.length})</span>
              <div className="h-px flex-1 bg-claude-border-light dark:bg-claude-border-dark" />
            </div>
            <div className="space-y-1.5">{items.map(renderCard)}</div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryConversationCard({ item, onOpen, onDelete }) {
  const { tx, localeTag } = useI18n();
  const provider = PROVIDERS[item.provider] || PROVIDERS.claude;
  const ProviderIcon = provider.icon;
  const locationLabel = item.project
    ? item.project.split(/[/\\]/).filter(Boolean).pop() || item.project
    : null;
  const actionLabel = item.appSessionId ? tx('Open', '打开') : tx('Continue', '继续');

  return (
    <div
      onClick={onOpen}
      className={`group cursor-pointer rounded-xl p-3 transition-all hover:shadow-md ${
        item.isActive
          ? 'border border-claude-orange/30 bg-claude-orange/10 shadow-sm'
          : `border border-claude-border-light bg-claude-surface-light dark:border-claude-border-dark dark:bg-claude-surface-dark ${provider.border}`
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <ProviderIcon size={12} className={`${provider.color} shrink-0`} />
          <h4 className="truncate text-sm font-medium text-claude-text-light dark:text-claude-text-dark">
            {item.displayTitle}
          </h4>
          {item.hasUnread && !item.isActive && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]"
              title={tx('New reply', '有新回复')}
            />
          )}
          <span className={`rounded px-1.5 py-0.5 text-[9px] ${provider.pill}`}>
            {provider.label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-gray-400">
            {formatDate(item.timestamp, tx, localeTag)}
          </span>
          {item.canDelete && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item.appSessionId);
              }}
              className="rounded p-1 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              title={tx('Remove from desktop list', '从桌面历史中移除')}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <p className="mb-1.5 line-clamp-2 pl-[18px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {item.preview || tx('No messages', '暂无消息')}
      </p>

      <div className="flex items-center gap-3 pl-[18px] text-[10px] text-gray-400">
        {item.count > 0 && (
          <span>{item.count} {item.countLabel}</span>
        )}
        {locationLabel && (
          <span className="flex max-w-[150px] items-center gap-1 truncate">
            <FolderOpen size={9} />
            {locationLabel}
          </span>
        )}
        {item.isDraft && (
          <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-gray-400 dark:bg-white/5">
            {tx('Draft', '草稿')}
          </span>
        )}
        {item.isActive ? (
          <span className="ml-auto text-claude-orange">{tx('Active', '当前')}</span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {actionLabel}
            <ChevronRight size={10} />
          </span>
        )}
      </div>
    </div>
  );
}

export default function HistoryPanel({
  sessions: appSessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onContinueProviderSession,
  onClose,
}) {
  const { tx } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('claude');
  const [providerHistory, setProviderHistory] = useState({ claude: [], codex: [] });
  const [loading, setLoading] = useState({ claude: true, codex: true });

  useEffect(() => {
    async function loadHistory(provider) {
      try {
        const result = await window.agent?.loadHistory(provider);
        if (result?.success) {
          setProviderHistory((prev) => ({ ...prev, [provider]: result.sessions || [] }));
        }
      } catch (error) {
        console.error(`Failed to load ${provider} history:`, error);
      } finally {
        setLoading((prev) => ({ ...prev, [provider]: false }));
      }
    }

    loadHistory('claude');
    loadHistory('codex');
  }, []);

  const unifiedHistory = useMemo(() => ({
    claude: buildUnifiedProviderHistory(appSessions, providerHistory.claude || [], 'claude', activeSessionId, tx),
    codex: buildUnifiedProviderHistory(appSessions, providerHistory.codex || [], 'codex', activeSessionId, tx),
  }), [activeSessionId, appSessions, providerHistory, tx]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const items = unifiedHistory[activeTab] || [];

    if (!query) {
      return items;
    }

    return items.filter((item) => (
      item.title.toLowerCase().includes(query) ||
      item.displayTitle.toLowerCase().includes(query) ||
      (item.preview || '').toLowerCase().includes(query) ||
      (item.project || '').toLowerCase().includes(query) ||
      (item.searchPrompts || []).some((prompt) => prompt.toLowerCase().includes(query))
    ));
  }, [activeTab, searchQuery, unifiedHistory]);

  const groupedHistory = useMemo(() => {
    const sorted = [...filteredHistory].sort((a, b) => b.timestamp - a.timestamp);
    return groupByDate(sorted, (item) => item.timestamp);
  }, [filteredHistory]);

  const openHistoryItem = (item) => {
    if (item.appSessionId) {
      onSelectSession(item.appSessionId);
      onClose();
      return;
    }

    if (item.providerSessionId) {
      onContinueProviderSession({
        provider: item.provider,
        sessionId: item.providerSessionId,
        title: item.title,
        project: item.project || '',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative ml-auto flex h-full w-[560px] flex-col border-l border-claude-border-light bg-claude-bg-light shadow-2xl dark:border-claude-border-dark dark:bg-claude-bg-dark">
        <div className="flex shrink-0 items-center justify-between border-b border-claude-border-light px-5 py-4 dark:border-claude-border-dark">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-claude-orange" />
            <h2 className="text-lg font-semibold text-claude-text-light dark:text-claude-text-dark">
              {tx('Chat History', '聊天记录')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X size={18} className="text-claude-text-light dark:text-claude-text-dark" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-claude-border-light px-4 pt-3 dark:border-claude-border-dark">
          {Object.entries(PROVIDERS).map(([provider, meta]) => {
            const Icon = meta.icon;
            const count = unifiedHistory[provider]?.length || 0;

            return (
              <button
                key={provider}
                onClick={() => setActiveTab(provider)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  activeTab === provider
                    ? `${meta.color} font-medium`
                    : 'text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={13} />
                {meta.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${meta.pill}`}>
                  {count}
                </span>
                {activeTab === provider && (
                  <div
                    className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                      provider === 'claude' ? 'bg-green-400' : 'bg-sky-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={tx('Search {provider} conversations...', '搜索 {provider} 会话...', { provider: PROVIDERS[activeTab].label })}
              className="w-full rounded-lg border border-claude-border-light bg-claude-surface-light py-2 pl-9 pr-8 text-sm text-claude-text-light placeholder:text-gray-400 focus:border-claude-orange focus:outline-none dark:border-claude-border-dark dark:bg-claude-surface-dark dark:text-claude-text-dark"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={12} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading[activeTab] && filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={20} className={`animate-spin ${PROVIDERS[activeTab].color}`} />
              <span className="ml-2 text-sm text-gray-400">
                {tx('Loading {provider} history...', '正在加载 {provider} 历史记录...', { provider: PROVIDERS[activeTab].label })}
              </span>
            </div>
          ) : (
            <>
              {loading[activeTab] && (
                <div className="mb-3 flex items-center gap-2 px-1 text-[11px] text-gray-400">
                  <Loader size={12} className={`animate-spin ${PROVIDERS[activeTab].color}`} />
                  <span>{tx('Syncing latest CLI history...', '正在同步最新 CLI 历史记录...')}</span>
                </div>
              )}

              {renderGrouped(
                groupedHistory,
                (item) => (
                  <HistoryConversationCard
                    key={item.key}
                    item={item}
                    onOpen={() => openHistoryItem(item)}
                    onDelete={onDeleteSession}
                  />
                ),
                searchQuery ? tx('No matching conversations', '没有匹配的会话') : tx('No conversations', '暂无会话'),
                tx
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildUnifiedProviderHistory(appSessions, providerHistory, provider, activeSessionId, tx) {
  const filteredAppSessions = appSessions.filter((session) => session.provider === provider);
  const providerHistoryMap = new Map(providerHistory.map((session) => [session.sessionId, session]));
  const dedupedAppSessions = dedupeAppSessions(filteredAppSessions);
  const linkedHistoryIds = new Set();
  const items = [];

  for (const session of dedupedAppSessions) {
    const historySession = session.providerSessionId
      ? providerHistoryMap.get(session.providerSessionId)
      : null;

    if (historySession) {
      linkedHistoryIds.add(historySession.sessionId);
    }

    const messageCount = typeof session.messageCount === 'number'
      ? session.messageCount
      : (session.messages?.length || 0);
    const title = session.title || historySession?.title || 'New Chat';
    const preview = session.lastMessagePreview
      || getHistoryPreview(historySession)
      || getSessionPreviewFromMessages(session.messages || []);

    items.push({
      key: `app:${session.id}`,
      provider,
      appSessionId: session.id,
      providerSessionId: session.providerSessionId || null,
      title,
      displayTitle: localizeSessionTitle(title, tx),
      preview,
      timestamp: Math.max(
        session.updatedAt || 0,
        session.createdAt || 0,
        historySession?.lastTimestamp || 0
      ),
      project: session.providerSessionCwd || session.cwd || historySession?.project || '',
      count: messageCount || (historySession?.promptCount || 0),
      countLabel: messageCount > 0
        ? tx('messages', '条消息')
        : (historySession?.promptCount ? tx('turns', '轮次') : tx('messages', '条消息')),
      hasUnread: Boolean(session.hasUnread),
      isActive: session.id === activeSessionId,
      canDelete: true,
      isDraft: !session.providerSessionId,
      searchPrompts: historySession?.prompts || [],
    });
  }

  for (const historySession of providerHistory) {
    if (linkedHistoryIds.has(historySession.sessionId)) {
      continue;
    }

    const title = historySession.title || 'Untitled';

    items.push({
      key: `cli:${provider}:${historySession.sessionId}`,
      provider,
      appSessionId: null,
      providerSessionId: historySession.sessionId,
      title,
      displayTitle: localizeSessionTitle(title, tx),
      preview: getHistoryPreview(historySession),
      timestamp: historySession.lastTimestamp || historySession.firstTimestamp || 0,
      project: historySession.project || '',
      count: historySession.promptCount || 0,
      countLabel: tx('turns', '轮次'),
      hasUnread: false,
      isActive: false,
      canDelete: false,
      isDraft: false,
      searchPrompts: historySession.prompts || [],
    });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

function dedupeAppSessions(appSessions) {
  const drafts = [];
  const linkedByProviderSessionId = new Map();

  for (const session of appSessions) {
    if (!session.providerSessionId) {
      drafts.push(session);
      continue;
    }

    const existing = linkedByProviderSessionId.get(session.providerSessionId);
    if (!existing || (session.updatedAt || 0) > (existing.updatedAt || 0)) {
      linkedByProviderSessionId.set(session.providerSessionId, session);
    }
  }

  return [...drafts, ...linkedByProviderSessionId.values()];
}

function getHistoryPreview(historySession) {
  if (!historySession) {
    return '';
  }

  const prompts = historySession.prompts || [];
  return prompts.length > 0 ? prompts[prompts.length - 1] : '';
}

function getSessionPreviewFromMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].content) {
      return messages[index].content.slice(0, 120).replace(/\n/g, ' ');
    }
  }

  return '';
}
