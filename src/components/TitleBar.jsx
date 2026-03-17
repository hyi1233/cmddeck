import React, { useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { localizeSessionTitle, useI18n } from '../i18n';

export default function TitleBar({ title }) {
  const [hovered, setHovered] = useState(null);
  const { tx } = useI18n();

  return (
    <div className="titlebar-drag h-11 bg-claude-sidebar-light dark:bg-claude-sidebar-dark flex items-center justify-between px-4 shadow-sm select-none shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full bg-claude-orange" />
        <span className="text-sm font-medium text-claude-text-light dark:text-claude-text-dark">
          {localizeSessionTitle(title, tx) || 'CmdDeck'}
        </span>
      </div>
      <div className="flex items-center gap-2 titlebar-no-drag">
        <button
          onClick={() => window.electron?.minimize?.()}
          onMouseEnter={() => setHovered('min')}
          onMouseLeave={() => setHovered(null)}
          aria-label={tx('Minimize window', '最小化窗口')}
          title={tx('Minimize', '最小化')}
          className="w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-500 active:scale-95 flex items-center justify-center transition-all shadow-sm ring-1 ring-black/5"
        >
          <Minus
            size={12}
            className={`text-yellow-900 transition-opacity ${hovered === 'min' ? 'opacity-100' : 'opacity-75'}`}
          />
        </button>
        <button
          onClick={() => window.electron?.maximize?.()}
          onMouseEnter={() => setHovered('max')}
          onMouseLeave={() => setHovered(null)}
          aria-label={tx('Maximize window', '最大化窗口')}
          title={tx('Maximize', '最大化')}
          className="w-7 h-7 rounded-full bg-green-400 hover:bg-green-500 active:scale-95 flex items-center justify-center transition-all shadow-sm ring-1 ring-black/5"
        >
          <Square
            size={10}
            className={`text-green-900 transition-opacity ${hovered === 'max' ? 'opacity-100' : 'opacity-75'}`}
          />
        </button>
        <button
          onClick={() => window.electron?.close?.()}
          onMouseEnter={() => setHovered('close')}
          onMouseLeave={() => setHovered(null)}
          aria-label={tx('Close window', '关闭窗口')}
          title={tx('Close', '关闭')}
          className="w-7 h-7 rounded-full bg-red-400 hover:bg-red-500 active:scale-95 flex items-center justify-center transition-all shadow-sm ring-1 ring-black/5"
        >
          <X
            size={12}
            className={`text-red-900 transition-opacity ${hovered === 'close' ? 'opacity-100' : 'opacity-75'}`}
          />
        </button>
      </div>
    </div>
  );
}
