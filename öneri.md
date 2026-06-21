You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
dynamic-island-toc.tsx
import { useState, useEffect, ReactNode, useMemo } from "react";
import { motion, AnimatePresence, Transition } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type HeadingData = {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
};

// --- Shared Animation Configs ---

const islandTransition: Transition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.5,
};

// --- Progress Circle Component ---

function CircleProgress({ percentage }: { percentage: number }) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  );
}

// --- Main Component ---

type DynamicIslandTOCProps = {
  children?: ReactNode;
  /**
   * CSS selector to find headings.
   * Defaults to common blog content wrappers and explicit [data-toc] elements.
   */
  selector?: string;
};

export function DynamicIslandTOC({
  children,
  selector = "article h1, article h2, article h3, article h4, .prose h1, .prose h2, .prose h3, .prose h4, [data-toc]",
}: DynamicIslandTOCProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1. DOM Scanning Strategy
  useEffect(() => {
    const getHeadings = () => {
      const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

      const validHeadings = elements
        .filter((el) => !el.hasAttribute("data-toc-ignore")) // Allow explicit skipping
        .map((el, index) => {
          // Auto-generate ID if missing (common in generic Markdown/CMS output)
          if (!el.id) {
            const generatedId =
              el.textContent
                ?.toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^\w-]/g, "") || `toc-heading-${index}`;
            el.id = generatedId;
          }

          // 1. Check data-toc-depth attribute
          // 2. Fallback to standard HTML tag levels (H1 = 1, H2 = 2)
          // 3. Default to level 2 if not a heading tag
          const depthAttr = el.getAttribute("data-toc-depth");
          let level = 2;

          if (depthAttr) {
            level = parseInt(depthAttr, 10);
          } else {
            const tagName = el.tagName.toUpperCase();
            if (tagName.startsWith("H") && tagName.length === 2) {
              level = parseInt(tagName[1], 10);
            }
          }

          // Allow title overrides via data-toc-title
          const text = el.getAttribute("data-toc-title") || el.textContent || "Section";

          return { id: el.id, text, level, element: el };
        });

      // Sort by DOM order mathematically
      validHeadings.sort((a, b) =>
        a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );

      setHeadings(validHeadings);
    };

    // Slight delay ensures CMS/Markdown hydration is complete
    const timer = setTimeout(getHeadings, 100);
    return () => clearTimeout(timer);
  }, [selector]);

  // 2. Scroll Spy & Progress
  useEffect(() => {
    const handleScroll = () => {
      let currentActiveId: string | null = null;
      for (const heading of headings) {
        const top = heading.element.getBoundingClientRect().top;
        // 120px offset to trigger active state just as heading reaches the top
        if (top <= 120) {
          currentActiveId = heading.id;
        } else {
          break;
        }
      }

      if (!currentActiveId && headings.length > 0) {
        currentActiveId = headings[0].id;
      }

      setActiveId(currentActiveId);

      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  const activeHeading = headings.find((h) => h.id === activeId);

  // Normalize depths so the highest-level heading in the doc touches the left edge
  const minLevel = useMemo(() => {
    if (headings.length === 0) return 1;
    return Math.min(...headings.map((h) => h.level));
  }, [headings]);

  return (
    <>
      {children}

      {/* Backdrop Blur Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[4px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Island Wrapper */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-[30px] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center"
      >
        <motion.div
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
          initial={false}
          animate={{
            width: isExpanded ? 340 : 280,
            height: isExpanded ? 400 : 52,
            borderRadius: isExpanded ? 24 : 26,
          }}
          transition={islandTransition}
          style={{ cursor: isExpanded ? "default" : "pointer" }}
          className="relative overflow-hidden border border-foreground/10 bg-background text-foreground shadow-2xl"
        >
          {/* CLOSED PILL CONTENT */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 0 : 1,
              scale: isExpanded ? 0.95 : 1,
              filter: isExpanded ? "blur(4px)" : "blur(0px)",
            }}
            transition={{ ...islandTransition, delay: isExpanded ? 0 : 0.1 }}
            className={cn("absolute inset-0 flex items-center gap-4 px-4 sm:px-5", isExpanded && "pointer-events-none")}
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-foreground" />

            <div className="relative flex h-full flex-1 items-center overflow-hidden text-left">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={activeId || "empty"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-foreground"
                >
                  {activeHeading?.text || "Contents"}
                </motion.span>
              </AnimatePresence>
            </div>

            <CircleProgress percentage={progress} />
          </motion.div>

          {/* EXPANDED MENU CONTENT */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              scale: isExpanded ? 1 : 1.05,
            }}
            transition={{ ...islandTransition, delay: isExpanded ? 0.1 : 0 }}
            className={cn("absolute inset-0 flex flex-col", !isExpanded && "pointer-events-none")}
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
                TABLE OF CONTENTS
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4" data-lenis-prevent="true">
              <div className="flex flex-col gap-0.5">
                {headings.map((h) => {
                  const isActive = activeId === h.id;
                  const isHovered = hoveredId === h.id;

                  // Dynamically calculate padding based on nesting depth!
                  const indentLevel = Math.max(0, h.level - minLevel);
                  const paddingLeft = indentLevel * 14 + 12; // 12px base + 14px per depth

                  return (
                    <button
                      key={h.id}
                      onMouseEnter={() => setHoveredId(h.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Adjust scroll to give fixed headers breathing room
                        const yOffset = -80;
                        const y = h.element.getBoundingClientRect().top + window.scrollY + yOffset;
                        window.scrollTo({ top: y, behavior: "smooth" });
                        setIsExpanded(false);
                      }}
                      style={{ paddingLeft: `${paddingLeft}px` }}
                      className={cn(
                        "group flex w-full shrink-0 cursor-pointer items-center rounded-lg border-none py-2 pr-3 text-left text-sm transition-all duration-300 ease-out",
                        isActive && "bg-foreground/10 font-medium text-foreground",
                        !isActive && isHovered && "bg-foreground/5 text-foreground/85",
                        !isActive && !isHovered && "bg-transparent text-foreground/45",
                      )}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-transform duration-300 group-hover:translate-x-1">
                        {h.text}
                      </span>

                      <motion.div
                        initial={false}
                        animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}


demo.tsx
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc"; // Adjust path as needed

export default function BlogPostPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 
        TOC Component 
        Using default selectors: "article h1, article h2, article h3, article h4, .prose h1, .prose h2, .prose h3, .prose h4, [data-toc]"
      */}
      <DynamicIslandTOC />

      <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
        <article className="prose prose-zinc dark:prose-invert lg:prose-lg mx-auto flex flex-col gap-8">
          
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
              The Evolution of Web Architecture
            </h1>
            <p className="text-lg text-muted-foreground">
              From static HTML pages to Edge Computing and Dynamic Islands.
            </p>
          </div>

          <p>
            The web has evolved at a breakneck pace. What started as simple
            hyperlinked text documents has transformed into rich, immersive
            applications that rival desktop software. Let's take a journey
            through the history of web architecture, exploring the paradigms
            that shaped the modern internet.
          </p>

          {/* STANDARD HEADING TESTS */}
          <h2>The Early Days: Static HTML (Web 1.0)</h2>
          <p>
            In the beginning, the web was read-only. Servers simply hosted flat
            HTML files and served them to browsers upon request. There was no
            interactivity, no user accounts, and no dynamic content.
          </p>
          <div className="h-40 bg-muted/30 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground">
            [Decorative Image Placeholder]
          </div>
          <p>
            Webmasters manually edited HTML files. If you wanted to change the
            footer on 100 pages, you had to edit 100 files. This era was defined
            by simplicity, but it lacked the flexibility needed for the web to
            grow.
          </p>

          <h3>The Role of Webmasters</h3>
          <p>
            The "Webmaster" was a legendary figure—part designer, part sysadmin,
            part content creator. They uploaded files via FTP and prayed nothing
            broke. If a link rotted, it stayed rotted until manually fixed.
          </p>

          <br className="my-10" />

          <h2>The Rise of Dynamic Content</h2>
          <p>
            As the web grew, the need for dynamic, user-specific content became
            apparent. This birthed Server-Side Rendering (SSR). Languages like
            PHP, Perl, and Java allowed servers to stitch HTML together on the
            fly, pulling data from relational databases.
          </p>

          <h3>Server-Side Rendering (SSR) in the 2000s</h3>
          <p>
            With SSR, every click resulted in a full page reload. The server did
            all the heavy lifting. This era gave us forums, early e-commerce,
            and CMS platforms like WordPress.
          </p>

          <h4>The Database Bottleneck</h4>
          <p>
            As traffic scaled, databases became the primary bottleneck. Querying
            a MySQL database for every page load was incredibly expensive. Caching
            layers like Memcached were introduced to alleviate the pain.
          </p>
          <p>
            Developers spent countless hours optimizing SQL queries and tuning
            Apache servers. It was a time of monolithic codebases, where a single
            repository held the frontend, backend, and database schemas.
          </p>

          <br className="my-10" />

          {/* OVERRIDE TEST: LONG TEXT BUT SHORT TOC TITLE */}
          <h2 data-toc-title="The SPA Revolution">
            The Paradigm Shift to Client-Side Rendering and the Era of Single Page Applications
          </h2>
          <p>
            Notice how long that heading is? Thanks to the `data-toc-title`
            attribute, it shows up cleanly as "The SPA Revolution" in your Table
            of Contents.
          </p>
          <p>
            With the advent of powerful JavaScript engines in browsers (like V8),
            developers realized they could offload UI rendering to the user's
            device. This led to the birth of the Single Page Application (SPA).
          </p>

          <h3>AJAX Changes Everything</h3>
          <p>
            Asynchronous JavaScript and XML (AJAX) allowed web pages to fetch
            data in the background without refreshing the page. This made web
            applications feel fast and native.
          </p>
          <div className="h-64 bg-muted/30 rounded-xl border border-border/50 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <p>Scroll down further to test the TOC scroll spy tracking!</p>
            <p className="mt-4 text-sm">Keep scrolling...</p>
          </div>

          <p>
            Frameworks like AngularJS, Backbone, and eventually React and Vue,
            standardized this approach. Browsers were no longer just document
            viewers; they were full-fledged application runtimes.
          </p>

          <br className="my-10" />

          {/* CUSTOM ELEMENT TEST: DIV BEHAVING AS A TOC HEADING */}
          <div 
            data-toc 
            data-toc-depth="2" 
            data-toc-title="The Modern Era: Edge Computing"
            className="p-8 rounded-2xl bg-foreground/5 border border-foreground/10 my-8"
          >
            <h3 className="text-2xl font-bold mt-0">
              Wait, this is a DIV, not a Heading!
            </h3>
            <p className="mb-0 mt-4 text-muted-foreground">
              This entire highlighted box is registered in the TOC as a Level 2 
              heading using the <code>data-toc</code> and <code>data-toc-depth="2"</code> attributes.
              This is incredibly useful when you have complex UI components (like 
              interactive widgets or callouts) that you want users to be able to navigate to!
            </p>
          </div>

          <p>
            Today, we are moving compute closer to the user. Edge computing,
            Serverless functions, and distributed databases are the new norm.
            Frameworks like Next.js blur the lines between frontend and backend,
            allowing us to seamlessly mix Server Components and Client Components.
          </p>

          <h4>Hydration and Resumability</h4>
          <p>
            We realized that sending massive Javascript bundles to the client
            was hurting performance. Now, we use techniques like hydration,
            partial hydration (Islands architecture), and resumability to send
            only the JS that is absolutely necessary.
          </p>
          <p>
            It feels like we've come full circle, back to generating HTML on the
            server, but with infinitely more power and interactivity baked in.
          </p>

          <br className="my-20" />

          {/* IGNORE TEST: SHOULD NOT SHOW UP IN TOC */}
          <hr className="my-12 border-border" />
          
          <h2 data-toc-ignore className="text-center">
            Join My Newsletter
          </h2>
          <p className="text-center text-muted-foreground">
            This section uses <code>data-toc-ignore</code>. Open the Table of Contents, 
            and you'll notice "Join My Newsletter" is completely hidden from the list!
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <input 
              type="email" 
              placeholder="hello@example.com" 
              className="px-4 py-2 rounded-lg border border-border bg-background"
            />
            <button className="px-4 py-2 bg-foreground text-background font-medium rounded-lg">
              Subscribe
            </button>
          </div>

        </article>
      </main>
    </div>
  );
}
```

Install NPM dependencies:
```bash
motion, lucide-react
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
