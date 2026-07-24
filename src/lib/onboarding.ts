// Interactive Demo & Onboarding System
// Real-time tutorial, guided tour, sample vulnerable code
// Production-ready onboarding experience

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  action?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to Securify',
    description: 'Professional security scanner with 40+ secret detection patterns. Let\'s take a quick tour!',
    position: 'bottom',
  },
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Dashboard',
    description: 'Scan local files, GitHub repositories, or live websites for security vulnerabilities.',
    position: 'bottom',
  },
  {
    id: 'sandbox',
    target: '[data-tour="sandbox"]',
    title: 'Interactive Sandbox',
    description: 'Try our scanner with sample vulnerable code. Paste code and see results instantly!',
    position: 'bottom',
  },
  {
    id: 'results',
    target: '[data-tour="results"]',
    title: 'Real-time Results',
    description: 'Get instant feedback with severity levels, file locations, and remediation steps.',
    position: 'left',
  },
  {
    id: 'export',
    target: '[data-tour="export"]',
    title: 'Export Reports',
    description: 'Export scan results in JSON, CSV, SARIF, or Markdown formats.',
    position: 'top',
  },
];

// Sample vulnerable code for demo
export const SAMPLE_VULNERABLE_CODE = {
  aws: `// AWS Configuration
const config = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1"
};

// This will be detected as a critical finding!`,

  github: `// GitHub API Integration
const octokit = new Octokit({
  auth: "ghp_1234567890abcdefghijklmnopqrstuvwxyz1234"
});

// Personal Access Token exposed - high severity!`,

  stripe: `// Payment Processing
const stripe = require('stripe')('sk_live_51ABC123XYZ456...');

async function processPayment() {
  // Stripe secret key leaked - critical!
  const charge = await stripe.charges.create({
    amount: 2000,
    currency: 'usd',
  });
}`,

  database: `// Database Connection
const connectionString = "postgresql://admin:SuperSecret123@db.example.com:5432/production";

const pool = new Pool({
  connectionString: connectionString
});

// Database credentials exposed!`,

  mixed: `// Configuration File - .env.production
const config = {
  // AWS Credentials
  AWS_KEY: "AKIAIOSFODNN7EXAMPLE",
  AWS_SECRET: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  
  // Database
  DB_URL: "postgres://user:password123@localhost:5432/db",
  
  // API Keys
  STRIPE_KEY: "sk_live_51ABC123",
  GITHUB_TOKEN: "ghp_abcdefghijklmnopqrstuvwxyz123456",
  
  // Slack Webhook
  SLACK_WEBHOOK: "https://hooks.slack.com/services/T00/B00/XXX"
};

// Multiple critical vulnerabilities detected!`,
};

// Onboarding state manager
export class OnboardingManager {
  private static STORAGE_KEY = 'securify_onboarding_completed';

  static isCompleted(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  static markCompleted(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }

  static reset(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset onboarding state:', error);
    }
  }
}

// Quick Start Guide steps
export const QUICK_START_STEPS = [
  {
    number: 1,
    title: 'Try the Interactive Demo',
    description: 'Test our scanner with sample vulnerable code in the Sandbox',
    action: 'sandbox',
    icon: '🎮',
  },
  {
    number: 2,
    title: 'Scan Your Repository',
    description: 'Connect your GitHub account and scan a real repository',
    action: 'github',
    icon: '🔍',
  },
  {
    number: 3,
    title: 'Install CLI Tool',
    description: 'Add security scanning to your local development workflow',
    action: 'cli',
    icon: '⚡',
  },
  {
    number: 4,
    title: 'Set Up CI/CD',
    description: 'Automate security scanning with GitHub Actions',
    action: 'cicd',
    icon: '🚀',
  },
];

// Achievement system for gamification
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-scan',
    title: 'First Scan',
    description: 'Complete your first security scan',
    icon: '🎯',
    unlocked: false,
  },
  {
    id: 'vulnerability-hunter',
    title: 'Vulnerability Hunter',
    description: 'Detect 10 security vulnerabilities',
    icon: '🏹',
    unlocked: false,
  },
  {
    id: 'security-expert',
    title: 'Security Expert',
    description: 'Scan 50 repositories',
    icon: '🛡️',
    unlocked: false,
  },
  {
    id: 'clean-coder',
    title: 'Clean Coder',
    description: 'Scan a repository with zero findings',
    icon: '✨',
    unlocked: false,
  },
  {
    id: 'ci-cd-master',
    title: 'CI/CD Master',
    description: 'Set up automated scanning with GitHub Actions',
    icon: '⚙️',
    unlocked: false,
  },
];

// Load achievements from storage
export function loadAchievements(): Achievement[] {
  try {
    const stored = localStorage.getItem('securify_achievements');
    if (stored) {
      const unlocked = JSON.parse(stored) as Record<string, number>;
      return ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        unlocked: !!unlocked[achievement.id],
        unlockedAt: unlocked[achievement.id],
      }));
    }
  } catch (error) {
    console.error('Failed to load achievements:', error);
  }
  return ACHIEVEMENTS;
}

// Unlock achievement
export function unlockAchievement(id: string): boolean {
  try {
    const stored = localStorage.getItem('securify_achievements');
    const unlocked = stored ? JSON.parse(stored) : {};
    
    if (unlocked[id]) return false; // Already unlocked
    
    unlocked[id] = Date.now();
    localStorage.setItem('securify_achievements', JSON.stringify(unlocked));
    return true;
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
    return false;
  }
}

// Track user progress
export function trackProgress(action: string): void {
  try {
    const stored = localStorage.getItem('securify_progress');
    const progress = stored ? JSON.parse(stored) : {};
    
    progress[action] = (progress[action] || 0) + 1;
    localStorage.setItem('securify_progress', JSON.stringify(progress));
    
    // Check for achievement unlocks
    if (action === 'scan_completed' && progress[action] === 1) {
      unlockAchievement('first-scan');
    }
    if (action === 'vulnerabilities_found' && progress[action] >= 10) {
      unlockAchievement('vulnerability-hunter');
    }
    if (action === 'scan_completed' && progress[action] >= 50) {
      unlockAchievement('security-expert');
    }
  } catch (error) {
    console.error('Failed to track progress:', error);
  }
}
