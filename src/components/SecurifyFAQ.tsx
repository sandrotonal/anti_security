import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "does securify upload my source code to any server?",
    answer: "no. securify's scanner runs 100% inside your browser using a zero-knowledge sandbox. your source files, secrets, and configurations never leave your machine. there is no server processing, no telemetry on file content — nothing. it is private by architectural design."
  },
  {
    question: "how does securify detect api keys and secret credentials?",
    answer: "securify combines two detection techniques. first, it applies 200+ curated regex patterns that match known token formats from aws, stripe, github, openai, sendgrid, twilio, and dozens more providers. second, it runs shannon entropy analysis to flag high-entropy strings that are statistically likely to be passwords or private keys, even if they don't match a known format."
  },
  {
    question: "can i install securify as a git pre-commit hook?",
    answer: "yes. the securify cli integrates with git hooks in one command: `npx securify-cli install`. from that point, every `git commit` will be automatically scanned. if a secret pattern is detected, the commit is blocked before it touches your repository history."
  },
  {
    question: "what is the difference between securify free and pro?",
    answer: "the free plan provides 5 scans per day, local file scanning, and basic vulnerability detection — enough for individual developers and side projects. the pro plan ($9/month) unlocks unlimited scans, pdf compliance reports, github private repository integration, rest api access, and custom security rules. agency plan ($39/month) adds white-label features and unlimited team seats."
  },
  {
    question: "which programming languages and file types are supported?",
    answer: "securify supports all text-based formats: .env, .js, .ts, .jsx, .tsx, .py, .rb, .go, .rs, .java, .php, .sh, .bash, .json, .yaml, .yml, .toml, .ini, .cfg, .conf, .xml, .gradle, .properties, and more. over 40 file types are detected automatically."
  },
  {
    question: "is securify compliant with gdpr and hipaa?",
    answer: "yes. because securify processes all data client-side with zero server transmission, it is inherently gdpr and hipaa compatible for code scanning use cases. no personal data or source code is stored, transmitted, or logged. our soc 2 type ii compliance certification covers the platform infrastructure."
  },
  {
    question: "how does securify compare to gitguardian, trufflehog, or gitleaks?",
    answer: "the key difference is the privacy model. gitguardian requires uploading your repository to their servers. securify runs entirely in your browser or locally on your machine via cli. for performance: securify's optimised wasm engine scans a 50k-line codebase in under 200ms. for detection: securify's entropy engine catches custom internal token formats that pattern-only tools miss."
  },
  {
    question: "can i write custom detection rules for my team's internal tokens?",
    answer: "yes. securify's rules engine lets you define custom regex patterns, entropy thresholds, and file-path exclusions. rules are stored locally in a .securify.json config file and can be shared across your team via version control. the pro and agency plans allow unlimited custom rules."
  },
];

export function SecurifyFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(prev => prev === idx ? null : idx);
  };

  return (
    <section
      className="relative py-24 px-4 md:px-10 bg-black overflow-hidden select-none border-t border-white/5"
      aria-label="Frequently asked questions"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      {/* Subtle top line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">

        {/* Header */}
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 text-xs lowercase">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>frequently asked questions</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white lowercase">
            everything you need<br />
            <span className="font-medium text-neutral-400">to know about securify</span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2" role="list">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? 'border-white/15 bg-white/[0.03]'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                }`}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
                role="listitem"
              >
                {/* Question row */}
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-start justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left group"
                  aria-expanded={isOpen}
                  id={`faq-q-${idx}`}
                  aria-controls={`faq-a-${idx}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-[9px] font-mono text-neutral-600 mt-1 flex-shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-sm font-light leading-snug lowercase transition-colors ${
                        isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                      }`}
                      itemProp="name"
                    >
                      {faq.question}
                    </span>
                  </div>

                  {/* Chevron */}
                  <div className={`flex-shrink-0 mt-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Answer — animated expand */}
                <div
                  id={`faq-a-${idx}`}
                  role="region"
                  aria-labelledby={`faq-q-${idx}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <div className="px-5 md:px-6 pb-5 pl-12">
                    <p
                      className="text-xs text-neutral-500 font-light leading-relaxed lowercase"
                      itemProp="text"
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-neutral-500 font-light lowercase">
            still have questions?
          </p>
          <a
            href="mailto:support@securify.gucluyumhe.dev"
            className="inline-flex items-center gap-2 text-xs font-mono lowercase text-white border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl px-5 py-2.5 transition-all duration-200"
            aria-label="Contact Securify support"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            contact support
          </a>
        </div>
      </div>
    </section>
  );
}
