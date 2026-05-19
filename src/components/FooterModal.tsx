import { useEffect } from 'react';

type FooterModalType = 'license' | 'security' | 'pgp';

interface FooterModalProps {
  type: FooterModalType;
  onClose: () => void;
}

export const FooterModal = ({ type, onClose }: FooterModalProps) => {
  // Prevent body scroll when modal is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'license':
        return 'mit license';
      case 'security':
        return 'security policy';
      case 'pgp':
        return 'pgp public key';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'license':
        return `MIT License

Copyright (c) 2026 sandrotonal (gucluyumhe)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

      case 'security':
        return `securify vulnerability disclosure policy

1. reporting a vulnerability
we take the security of securify and our users seriously. if you find a security vulnerability, please report it immediately to omeriletisimportfolyo@gmail.com.

2. scope
this policy applies to the securify core engine, rules engine, secrets generator, custom tester and all related client-side deployments.

3. assessment & resolution
upon receipt of a valid report, our team will:
- acknowledge receipt within 24 hours.
- evaluate the severity and execute patching.
- deploy updates and notify the reporter.

4. safe harbor
we will not pursue legal action against researchers who disclose bugs in good faith under this policy.`;

      case 'pgp':
        return `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v2.2.20 (GNU/Linux)
Comment: securify secure relay encryption key

mQINBGB23sYBEADL9s7/X2Gq3h0Vv+4Zq4Z2Zkx9oLP8eNyC7nFjK5+dYl9m1c7n
Kq1M3wQk3l1lZ2uL8n1rLqL1nFhL8u1N5w7sLq1N5wLq1N5wQzMzMzMzMzMzMzM
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMz
=Secu
-----END PGP PUBLIC KEY BLOCK-----`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    alert(`${getTitle()} copied to clipboard.`);
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-neutral-950 border border-white/5 rounded-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono text-white lowercase">{getTitle()}</span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors text-xs font-mono lowercase"
          >
            [close]
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto select-text font-mono text-[10px] md:text-xs text-neutral-400 leading-relaxed bg-black/40 whitespace-pre-wrap">
          {getContent()}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <button
            onClick={handleCopy}
            className="text-neutral-400 hover:text-white transition-colors text-xs font-mono lowercase"
          >
            [copy payload]
          </button>
          <button
            onClick={onClose}
            className="bg-white hover:bg-neutral-200 text-black px-4 py-1.5 rounded-xl text-xs font-mono font-medium lowercase transition-all"
          >
            ok
          </button>
        </div>

      </div>
    </div>
  );
};
