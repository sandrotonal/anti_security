import { useEffect } from 'react';

type FooterModalType = 'license' | 'security' | 'pgp' | 'sales_contract' | 'return_policy' | 'privacy_policy' | 'company_info';

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
      case 'sales_contract':
        return 'distance sales agreement';
      case 'return_policy':
        return 'cancellation & refund policy';
      case 'privacy_policy':
        return 'privacy policy & gdpr';
      case 'company_info':
        return 'company & contact info';
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

      case 'sales_contract':
        return `distance sales agreement

1. parties
this agreement is entered into between ömer özbay, the operator of the securify platform (hereinafter referred to as the "seller"), and the user who purchases a subscription through the platform (hereinafter referred to as the "buyer").

2. subject of the agreement
the subject of this agreement is the determination of the rights and obligations of the parties regarding the sale and delivery of the digital/saas service purchased by the buyer through the securify website, in accordance with applicable consumer protection laws and regulations for distance contracts.

3. service and delivery
the purchased service is provided as a digital subscription on the securify platform. the service is instantly activated upon successful payment by linking a cryptographic token to the buyer's email address, granting immediate access to the premium features.

4. right of withdrawal
since the purchased service consists of digital content and services delivered instantly in an electronic environment, the buyer does not have a right of withdrawal once the service has been initiated and delivery has commenced.`;

      case 'return_policy':
        return `cancellation & refund policy

1. subscription cancellation
users can cancel their premium subscriptions at any time through their membership dashboard or by contacting support at omeriletisimportfolyo@gmail.com. canceled subscriptions will remain active until the end of the current billing cycle and will not renew.

2. refund policy
since securify services are digital products and instantly active, refunds are generally not provided. however:
- in case of duplicate charges due to system errors, the incorrectly processed transaction amount will be fully refunded to the buyer.
- if the service is interrupted for more than 72 hours due to technical issues originating from the seller, the buyer can request a pro-rated refund for the unusable period.`;

      case 'privacy_policy':
        return `privacy policy & gdpr compliance

at securify, we take the security and privacy of your personal data extremely seriously. we ensure all personal data is processed and stored in compliance with the general data protection regulation (gdpr) and local data protection regulations.

1. data controller
for the purposes of data protection regulations, your personal data is processed by ömer özbay as the data controller.

2. data processed & purpose
when you register or purchase a subscription, we collect your email address, name, phone number, and payment information to:
- complete membership registration and verify subscriptions.
- securely process payments via shopier.
- resolve technical support requests.

securify operates on a zero-knowledge architecture. your scanned code repositories and files are never uploaded to our servers; all scanning is performed locally in your browser.

3. data sharing
your personal data may only be shared with competent public authorities to fulfill legal obligations, and with our secure payment processor shopier to complete transaction processing. we do not share your data with other third parties.

4. your rights
under gdpr, you have the right to access, rectify, or erase your personal data, or restrict its processing. you may exercise these rights at any time by contacting us at omeriletisimportfolyo@gmail.com.`;

      case 'company_info':
        return `company & contact information

securify services are operated and managed as an individual enterprise by ömer özbay.

operator: ömer özbay
address: istanbul, turkey
email: omeriletisimportfolyo@gmail.com
support hotline: +90 531 480 3809
website: https://securify.gucluyumhe.dev`;
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
