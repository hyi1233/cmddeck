import React, { createContext, useContext } from 'react';

const DEFAULT_LANGUAGE = 'en';

const I18nContext = createContext(createI18n(DEFAULT_LANGUAGE));

export function createI18n(language = DEFAULT_LANGUAGE) {
  const locale = language === 'zh' ? 'zh' : 'en';
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US';

  return {
    language: locale,
    localeTag,
    isZh: locale === 'zh',
    tx(en, zh, variables) {
      const template = locale === 'zh' ? (zh ?? en) : en;
      return interpolate(template, variables);
    },
  };
}

export function I18nProvider({ value, children }) {
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function localizeSessionTitle(title, tx) {
  const normalized = typeof title === 'string' ? title.trim() : '';

  if (!normalized || normalized === 'New Chat' || normalized === '新建聊天') {
    return tx('New Chat', '新建聊天');
  }

  if (normalized === 'Untitled' || normalized === '未命名') {
    return tx('Untitled', '未命名');
  }

  const continuedMatch = normalized.match(/^(?:Continued|继续)\s+(Claude Code|Codex)$/);
  if (continuedMatch) {
    return tx('Continued {provider}', '继续 {provider}', { provider: continuedMatch[1] });
  }

  const attachmentMatch = normalized.match(/^(\d+)\s+(?:attachments|个附件)$/);
  if (attachmentMatch) {
    return tx('{count} attachments', '{count} 个附件', { count: attachmentMatch[1] });
  }

  return title;
}

function interpolate(template, variables) {
  if (!variables || typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in variables)) {
      return `{${key}}`;
    }

    return String(variables[key]);
  });
}
