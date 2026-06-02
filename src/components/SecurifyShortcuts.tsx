import { useEffect } from 'react';

interface SecurifyShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurifyShortcuts = ({ isOpen, onClose }: SecurifyShortcutsProps) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: '1', description: 'switch to home page' },
    { key: '2', description: 'switch to rules database' },
    { key: '3', description: 'switch to compliance dashboard' },
    { key: '4', description: 'switch to developer sandbox' },
    { key: '5', description: 'switch to cli installation' },
    { key: '6', description: 'switch to contact support' },
    { key: '7', description: 'switch to dependency auditor' },
    { key: '8', description: 'switch to pricing plans' },
    { key: 'T', description: 'open global interactive terminal' },
    { key: '?', description: 'toggle keyboard shortcuts overlay' },
    { key: 'Esc', description: 'close active modal / overlay' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      {/* Backdrop click close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Panel */}
      <div className="bg-neutral-950 border border-white/5 rounded-2xl w-full max-w-lg p-6 md:p-8 relative z-10 shadow-2xl animate-page-entrance">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
          <div className="space-y-1">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
              accessibility helper
            </span>
            <h3 className="text-lg font-medium text-white lowercase">
              keyboard shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors text-xs font-mono lowercase"
          >
            [close]
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-4 font-mono text-xs md:text-sm">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-1 border-b border-white/[0.02]"
            >
              <span className="text-neutral-400 lowercase">{shortcut.description}</span>
              <kbd className="bg-neutral-900 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white font-bold min-w-[24px] text-center shadow-md">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-500 lowercase leading-relaxed">
            press <kbd className="bg-neutral-900 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white">?</kbd> at any time to toggle this quick navigation assistant.
          </p>
        </div>
      </div>
    </div>
  );
};
