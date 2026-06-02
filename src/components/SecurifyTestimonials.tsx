import { useRef, useState } from 'react';
import { GlowCard } from './GlowCard';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  rating: number;
  avatar: string; // initials fallback
  highlight: string; // key word to emphasize
}

const testimonials: Testimonial[] = [
  {
    quote: "we pushed an aws key to github last year and lost $4,200 in compute charges overnight. securify's pre-commit hook would have caught it in milliseconds.",
    author: "marcus t.",
    role: "senior engineer",
    company: "fintech startup · series b",
    rating: 5,
    avatar: "MT",
    highlight: "$4,200"
  },
  {
    quote: "migrated from gitguardian to securify. the zero-upload sandbox was the deciding factor — our clients' data never leaves their machines. zero trust by design.",
    author: "priya k.",
    role: "head of platform security",
    company: "healthcare saas · hipaa compliant",
    rating: 5,
    avatar: "PK",
    highlight: "zero-upload sandbox"
  },
  {
    quote: "the custom rules engine lets us write compliance-specific patterns for our banking regulators. no other tool gives us this level of control.",
    author: "j. hoffmann",
    role: "devsecops architect",
    company: "tier-1 bank · gdpr zone",
    rating: 5,
    avatar: "JH",
    highlight: "custom rules engine"
  },
  {
    quote: "runs in ci in under 200ms. we added it to every pull request workflow and our secret leak incidents dropped to zero across 12 active repositories.",
    author: "tariq al-f.",
    role: "lead platform engineer",
    company: "e-commerce scale-up",
    rating: 5,
    avatar: "TA",
    highlight: "200ms"
  },
  {
    quote: "our junior devs were committing .env files accidentally every few weeks. two lines in our package.json later, zero incidents in 8 months.",
    author: "sofia m.",
    role: "engineering manager",
    company: "b2b saas · 40-dev team",
    rating: 5,
    avatar: "SM",
    highlight: "zero incidents"
  },
  {
    quote: "tested snyk, trufflehog, gitleaks. securify was the only one that caught our custom internal token format with zero configuration. entropy detection is impressive.",
    author: "kenji w.",
    role: "security researcher",
    company: "independent · bug bounty",
    rating: 5,
    avatar: "KW",
    highlight: "entropy detection"
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < rating ? 'text-white' : 'text-neutral-700'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  // Highlight the key phrase in the quote
  const parts = t.quote.split(t.highlight);
  return (
    <GlowCard className="h-full">
      <div className="flex flex-col h-full justify-between space-y-5">
        <div className="space-y-4">
          <StarRating rating={t.rating} />
          <blockquote className="text-xs text-neutral-400 font-light leading-relaxed lowercase">
            "
            {parts.map((part, idx) => (
              <span key={idx}>
                {part}
                {idx < parts.length - 1 && (
                  <span className="text-white font-medium">{t.highlight}</span>
                )}
              </span>
            ))}
            "
          </blockquote>
        </div>

        <div className="flex items-center gap-3 border-t border-white/5 pt-4">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center font-mono text-[9px] font-bold text-white select-none uppercase flex-shrink-0"
            aria-hidden="true"
          >
            {t.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium lowercase leading-none">{t.author}</p>
            <p className="text-[10px] text-neutral-500 font-mono lowercase mt-0.5 truncate">{t.role} · {t.company}</p>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

export function SecurifyTestimonials() {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    const index = Math.round(scrollRef.current.scrollLeft / width);
    if (index !== activeIdx && index >= 0 && index < testimonials.length) {
      setActiveIdx(index);
    }
  };

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: 'smooth' });
    setActiveIdx(index);
  };

  return (
    <section
      className="relative py-24 px-4 md:px-10 bg-black overflow-hidden select-none border-t border-white/5"
      aria-label="Customer testimonials"
    >
      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 text-xs lowercase">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>trusted by 1,200+ developers</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white lowercase">
              engineers ship faster<br />
              <span className="font-medium text-neutral-400">when security is invisible</span>
            </h2>
          </div>
          <p className="text-sm text-neutral-500 font-light leading-relaxed lowercase max-w-sm md:text-right">
            real feedback from security engineers, devsecops teams, and developers who run securify in production.
          </p>
        </div>

        {/* Desktop Grid — 3 columns */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          {testimonials.map((t, idx) => (
            <TestimonialCard key={idx} t={t} />
          ))}
        </div>

        {/* Mobile Swipeable Slider */}
        <div className="block md:hidden space-y-5">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((t, idx) => {
              const isActive = idx === activeIdx;
              return (
                <div
                  key={idx}
                  className="w-full shrink-0 snap-center transition-all duration-500"
                  style={{ opacity: isActive ? 1 : 0.4, transform: isActive ? 'scale(1)' : 'scale(0.97)' }}
                >
                  <div className="mx-1">
                    <TestimonialCard t={t} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot navigation */}
          <div className="flex items-center justify-center gap-2.5">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                className={`h-1.5 transition-all duration-300 rounded-full ${activeIdx === idx ? 'w-6 bg-white' : 'w-1.5 bg-neutral-800'}`}
              />
            ))}
          </div>
        </div>

        {/* Social proof numbers strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
          {[
            { value: '1,200+', label: 'developers trust securify' },
            { value: '4.9 / 5', label: 'average satisfaction score' },
            { value: '0 leaks', label: 'production incidents after deploy' },
            { value: '< 200ms', label: 'average scan completion time' },
          ].map((stat, idx) => (
            <div key={idx} className="space-y-1 text-center md:text-left">
              <p className="text-xl md:text-2xl font-semibold text-white lowercase font-mono">{stat.value}</p>
              <p className="text-[10px] text-neutral-500 font-light lowercase">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
