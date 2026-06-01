import { useState } from 'react';

type BillingPeriod = 'monthly' | 'yearly';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  description: string;
  features: PlanFeature[];
  cta: string;
  featured: boolean;
  accentColor: string;
  badgeColor: string;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Essential security scanning for individual developers and open-source projects.',
    features: [
      { text: '5 scans per day', included: true },
      { text: 'Local file scanning', included: true },
      { text: 'Basic vulnerability detection', included: true },
      { text: 'Security rules engine', included: true },
      { text: 'CLI tool access', included: true },
      { text: 'PDF security reports', included: false },
      { text: 'GitHub private repos', included: false },
      { text: 'API access', included: false },
      { text: 'Team accounts', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start for free',
    featured: false,
    accentColor: 'border-white/10',
    badgeColor: 'bg-white/5 text-neutral-400',
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most popular',
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: 'Advanced scanning capabilities for professional developers and small teams.',
    features: [
      { text: 'Unlimited scans', included: true },
      { text: 'Local file scanning', included: true },
      { text: 'Full vulnerability detection', included: true },
      { text: 'Custom security rules', included: true },
      { text: 'CLI tool access', included: true },
      { text: 'PDF security reports', included: true },
      { text: 'GitHub private repos', included: true },
      { text: 'REST API access', included: true },
      { text: 'Team accounts (up to 3)', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Pro trial',
    featured: true,
    accentColor: 'border-white/25',
    badgeColor: 'bg-white text-black',
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'White-label security platform for agencies managing multiple client projects.',
    features: [
      { text: 'Unlimited scans', included: true },
      { text: 'Local file scanning', included: true },
      { text: 'Full vulnerability detection', included: true },
      { text: 'Custom security rules', included: true },
      { text: 'CLI tool access', included: true },
      { text: 'White-label PDF reports', included: true },
      { text: 'GitHub private repos (unlimited)', included: true },
      { text: 'REST API access', included: true },
      { text: 'Team accounts (up to 10)', included: true },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Agency trial',
    featured: false,
    accentColor: 'border-white/10',
    badgeColor: 'bg-white/5 text-neutral-400',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'Custom security infrastructure for large organizations with compliance requirements.',
    features: [
      { text: 'Unlimited scans & repos', included: true },
      { text: 'On-premise deployment', included: true },
      { text: 'SOC2 / ISO 27001 reports', included: true },
      { text: 'Custom security rules & policies', included: true },
      { text: 'Full CLI + SDK access', included: true },
      { text: 'White-label + custom branding', included: true },
      { text: 'SSO / SAML authentication', included: true },
      { text: 'Dedicated REST API', included: true },
      { text: 'Unlimited team accounts', included: true },
      { text: 'Dedicated security engineer', included: true },
    ],
    cta: 'Contact sales',
    featured: false,
    accentColor: 'border-white/10',
    badgeColor: 'bg-white/5 text-neutral-400',
  },
];

const faqs = [
  {
    q: 'Is the free plan really free forever?',
    a: 'Yes. The Free plan is free forever with no credit card required. You get 5 scans per day and access to all core scanning features permanently.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Absolutely. There are no lock-in contracts. You can cancel your subscription at any time and continue using the platform until the end of your billing period.',
  },
  {
    q: 'How does the yearly billing work?',
    a: 'Yearly billing is charged as a single upfront payment and saves you approximately 17% compared to monthly billing. You can switch between billing periods at any time.',
  },
  {
    q: 'What counts as a "scan"?',
    a: 'A scan is defined as one complete analysis of a repository, folder, or file set. Scanning the same project multiple times counts as multiple scans.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a 14-day money-back guarantee on all paid plans. If you are not satisfied for any reason within 14 days of your purchase, contact us for a full refund.',
  },
  {
    q: 'What is white-label reporting?',
    a: 'Agency and Enterprise plan users can generate PDF security reports branded with their own logo and company name, which they can deliver directly to clients.',
  },
];

const CheckIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-400' : 'text-neutral-700'}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    {active ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    )}
  </svg>
);

interface PricingProps {
  onPurchase: (planId: string, planName: string, billing: BillingPeriod) => void;
}

export const SecurifyPricing = ({ onPurchase }: PricingProps) => {
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getPrice = (plan: PricingPlan) => {
    if (plan.monthlyPrice === null) return 'Custom';
    if (plan.monthlyPrice === 0) return '$0';
    const price = billing === 'monthly' ? plan.monthlyPrice : Math.round(plan.yearlyPrice! / 12);
    return `$${price}`;
  };

  const handlePurchaseClick = (plan: PricingPlan) => {
    if (plan.id === 'free') {
      const navItem = document.getElementById('nav-dashboard') || document.querySelector('[data-view="dashboard"]');
      if (navItem) {
        (navItem as HTMLButtonElement).click();
      } else {
        window.location.reload();
      }
      return;
    }
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:sales@gucluyumhe.dev?subject=Securify Enterprise Plan Interest';
      return;
    }
    onPurchase(plan.id, plan.name, billing);
  };

  return (
    <section className="min-h-screen bg-black text-white font-mono py-20 px-6 md:px-12 relative" id="pricing">
      <div className="max-w-7xl mx-auto space-y-20">

        {/* Header */}
        <div className="text-center space-y-6 animate-page-entrance">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[10px] text-neutral-400 lowercase select-none">
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            transparent pricing · no hidden fees
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight lowercase leading-tight">
            security infrastructure<br />
            <span className="text-neutral-500">for every scale</span>
          </h1>
          <p className="text-sm text-neutral-500 font-light max-w-xl mx-auto leading-relaxed lowercase">
            from independent developers to enterprise security teams — securify scales with your codebase. start free, upgrade when ready.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-neutral-950 border border-white/10 rounded-2xl p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 text-xs rounded-xl transition-all lowercase ${
                billing === 'monthly'
                  ? 'bg-white text-black font-medium'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-2 text-xs rounded-xl transition-all lowercase flex items-center gap-2 ${
                billing === 'yearly'
                  ? 'bg-white text-black font-medium'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              yearly
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-page-entrance">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-neutral-950/60 border ${plan.accentColor} rounded-3xl p-6 transition-all duration-300 hover:border-white/20 ${
                plan.featured ? 'ring-1 ring-white/20 shadow-2xl shadow-white/5' : ''
              }`}
            >
              {/* Featured glow */}
              {plan.featured && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent rounded-3xl pointer-events-none" />
              )}

              {/* Plan header */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${plan.featured ? 'bg-white text-black border-transparent' : 'bg-white/5 text-neutral-400 border-white/10'}`}>
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded-full lowercase">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-light text-white">{getPrice(plan)}</span>
                    {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                      <span className="text-xs text-neutral-600">/mo</span>
                    )}
                    {plan.monthlyPrice === null && (
                      <span className="text-xs text-neutral-600">pricing</span>
                    )}
                  </div>
                  {billing === 'yearly' && plan.yearlyPrice !== null && plan.yearlyPrice > 0 && (
                    <p className="text-[9px] text-neutral-600">billed as ${plan.yearlyPrice}/year</p>
                  )}
                </div>

                <p className="text-[10px] text-neutral-500 leading-relaxed lowercase font-light">
                  {plan.description}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5 mb-5" />

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <CheckIcon active={feature.included} />
                    <span className={`text-[10px] lowercase ${feature.included ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handlePurchaseClick(plan)}
                className={`w-full py-3 rounded-xl text-xs font-mono lowercase transition-all ${
                  plan.featured
                    ? 'bg-white hover:bg-neutral-200 text-black font-medium'
                    : plan.id === 'enterprise'
                    ? 'bg-transparent border border-white/15 hover:border-white/30 text-white'
                    : 'bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/20 text-white'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="border-t border-b border-white/5 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'open-source core', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
              { label: 'no data retention', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { label: '14-day money-back', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
              { label: 'cancel anytime', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 select-none">
                <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <span className="text-[9px] text-neutral-500 lowercase">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table (desktop) */}
        <div className="space-y-6 hidden md:block">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-light text-white lowercase">compare all features</h2>
            <p className="text-xs text-neutral-600 lowercase">full breakdown of what's included in each plan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-3 pr-6 text-[10px] font-mono text-neutral-600 uppercase w-1/3">feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-3 px-4 text-[10px] font-mono text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] ${p.featured ? 'bg-white text-black border-transparent' : 'bg-white/5 text-neutral-400 border-white/10'}`}>
                        {p.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans[0].features.map((_, featureIdx) => (
                  <tr key={featureIdx} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 pr-6 text-[10px] text-neutral-400 lowercase">{plans[0].features[featureIdx].text}</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <CheckIcon active={plan.features[featureIdx].included} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-lg font-light text-white lowercase">frequently asked questions</h2>
            <p className="text-xs text-neutral-600 lowercase">everything you need to know before subscribing</p>
          </div>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left select-none"
              >
                <span className="text-xs text-white lowercase font-light">{faq.q}</span>
                <svg
                  className={`w-4 h-4 text-neutral-500 shrink-0 ml-4 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-[11px] text-neutral-500 leading-relaxed font-light lowercase border-t border-white/5 pt-3 animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center bg-neutral-950/40 border border-white/5 rounded-3xl p-12 space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-light text-white lowercase">still not sure?</h2>
            <p className="text-xs text-neutral-500 font-light lowercase max-w-md mx-auto leading-relaxed">
              start with the free plan — no credit card required. upgrade only when securify proves its value to your team.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3 lowercase transition-all">
              get started free
            </button>
            <button className="bg-transparent border border-white/15 hover:border-white/30 text-white text-xs font-mono rounded-xl px-6 py-3 lowercase transition-all">
              talk to sales
            </button>
          </div>
          <p className="text-[9px] text-neutral-700 lowercase">
            no credit card · instant access · cancel anytime
          </p>
        </div>

      </div>
    </section>
  );
};
