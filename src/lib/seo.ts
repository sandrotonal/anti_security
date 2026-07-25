// SEO & Meta Tags Manager
// Dynamic meta tags, Open Graph, Twitter Cards, JSON-LD
// Production-ready SEO optimization

import { useEffect } from 'react';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

// SEO Hook
export function useSEO(config: SEOConfig) {
  useEffect(() => {
    // Update title
    document.title = config.title;

    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[data-seo]');
    existingMetas.forEach(meta => meta.remove());

    // Basic meta tags
    setMetaTag('description', config.description);
    if (config.keywords) {
      setMetaTag('keywords', config.keywords.join(', '));
    }
    if (config.author) {
      setMetaTag('author', config.author);
    }

    // Open Graph tags
    setMetaTag('og:title', config.title, 'property');
    setMetaTag('og:description', config.description, 'property');
    setMetaTag('og:type', config.type || 'website', 'property');
    if (config.url) {
      setMetaTag('og:url', config.url, 'property');
    }
    if (config.image) {
      setMetaTag('og:image', config.image, 'property');
      setMetaTag('og:image:width', '1200', 'property');
      setMetaTag('og:image:height', '630', 'property');
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', config.title);
    setMetaTag('twitter:description', config.description);
    if (config.image) {
      setMetaTag('twitter:image', config.image);
    }

    // Article meta tags
    if (config.type === 'article') {
      if (config.publishedTime) {
        setMetaTag('article:published_time', config.publishedTime, 'property');
      }
      if (config.modifiedTime) {
        setMetaTag('article:modified_time', config.modifiedTime, 'property');
      }
    }
  }, [config]);
}

function setMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  const meta = document.createElement('meta');
  meta.setAttribute(attribute, name);
  meta.setAttribute('content', content);
  meta.setAttribute('data-seo', 'true');
  document.head.appendChild(meta);
}

// Structured Data Generator
export function generateStructuredData(type: 'Organization' | 'WebApplication' | 'SoftwareApplication') {
  const baseUrl = window.location.origin;

  if (type === 'Organization') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Securify',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: 'Professional security scanning platform for detecting secrets and vulnerabilities in code',
      sameAs: [
        'https://github.com/securify',
        'https://twitter.com/securify',
      ],
    };
  }

  if (type === 'WebApplication') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Securify Security Scanner',
      url: baseUrl,
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web Browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: 'Free, open-source security scanner with 40+ secret detection patterns, CI/CD integration, and real-time scanning',
      featureList: [
        'Secret Detection',
        'Dependency Vulnerability Scanning',
        'CI/CD Integration',
        'GitHub Actions',
        'Real-time Alerts',
        'Export to SARIF',
      ],
      screenshot: `${baseUrl}/screenshot.png`,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Securify CLI',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Command-line security scanner for detecting secrets in source code',
  };
}

// Inject structured data
export function injectStructuredData(data: any) {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"][data-seo]');
  if (existing) existing.remove();

  // Inject new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Sitemap generator (client-side)
export function generateSitemap(): string {
  const baseUrl = window.location.origin;
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/?view=rules', priority: '0.8', changefreq: 'weekly' },
    { url: '/?view=dashboard', priority: '0.9', changefreq: 'daily' },
    { url: '/?view=sandbox', priority: '0.8', changefreq: 'weekly' },
    { url: '/?view=auditor', priority: '0.8', changefreq: 'weekly' },
    { url: '/?view=pricing', priority: '0.7', changefreq: 'monthly' },
    { url: '/?view=install', priority: '0.6', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

// Robots.txt generator
export function generateRobotsTxt(): string {
  const baseUrl = window.location.origin;
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml

# Security scanners welcome
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /`;
}

// Performance metrics tracking
export function trackPerformanceMetrics() {
  if ('performance' in window && 'PerformanceObserver' in window) {
    // Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
        }
        if (entry.entryType === 'first-input') {
          console.log('FID:', (entry as any).processingStart - entry.startTime);
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });

    // CLS tracking
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('CLS:', clsValue);
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
}

// Preload critical resources
export function preloadCriticalResources() {
  const criticalResources = [
    { href: '/fonts/mono.woff2', as: 'font', type: 'font/woff2' },
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) link.type = resource.type;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// SEO-friendly URLs
export function generateSEOUrl(view: string, params?: Record<string, string>): string {
  const base = `/?view=${view}`;
  if (!params) return base;
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  return `${base}&${queryString}`;
}
