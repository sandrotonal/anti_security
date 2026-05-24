import { useState, useEffect } from 'react';

interface PipelineStep {
  step: string;
  title: string;
  description: string;
  codeBlock?: string;
  tag: string;
}

interface FaqItem {
  q: string;
  a: string;
}

export const SecurifyIntegrations = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  const [activePlatform, setActivePlatform] = useState<'slack' | 'discord' | 'teams'>('slack');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://hooks.slack.com/services/T00000000/B00000000/DUMMYSHORTKEY');
  const [channelName, setChannelName] = useState<string>('#security-alerts');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (activePlatform === 'slack') {
      setWebhookUrl('https://hooks.slack.com/services/T00000000/B00000000/DUMMYSHORTKEY');
      setChannelName('#security-alerts');
    } else if (activePlatform === 'discord') {
      setWebhookUrl('https://discord.com/api/webhooks/000000000000000000/DUMMYWEBHOOKKEY');
      setChannelName('#general');
    } else if (activePlatform === 'teams') {
      setWebhookUrl('https://xyzcompany.webhook.office.com/webhookb2/00000000-0000-0000-0000-000000000000@00000000-0000-0000-0000-000000000000');
      setChannelName('security channel');
    }
  }, [activePlatform]);

  const getPayload = () => {
    if (activePlatform === 'slack') {
      return {
        channel: channelName,
        text: "⚠️ [securify] credential leak identified in commit!",
        attachments: [
          {
            color: "#ef4444",
            fields: [
              { title: "repository", value: "github.com/org/billing-api", short: true },
              { title: "file path", value: "src/config/db.js", short: true },
              { title: "severity", value: "critical", short: true },
              { title: "leaked type", value: "AWS Access Key ID", short: true }
            ]
          }
        ]
      };
    } else if (activePlatform === 'discord') {
      return {
        username: "securify-monitor",
        content: `⚠️ **credential leak detected** in ${channelName}!`,
        embeds: [
          {
            title: "critical vulnerability flagged",
            color: 15728640,
            fields: [
              { name: "repository", value: "github.com/org/billing-api", inline: true },
              { name: "file", value: "src/config/db.js", inline: true },
              { name: "rule triggered", value: "AWS Access Key ID", inline: false }
            ]
          }
        ]
      };
    } else {
      return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "EF4444",
        "summary": "securify security incident",
        "sections": [
          {
            "activityTitle": "securify leak scan failure",
            "activitySubtitle": `critical credentials exposed in ${channelName}`,
            "facts": [
              { "name": "repository", "value": "github.com/org/billing-api" },
              { "name": "file", "value": "src/config/db.js" },
              { "name": "finding", "value": "AWS Access Key ID" }
            ]
          }
        ]
      };
    }
  };

  const handleTestWebhook = () => {
    setTestStatus('sending');
    setTimeout(() => {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1200);
  };

  const steps: PipelineStep[] = [
    {
      step: '01',
      title: 'local binary scan',
      description: 'compiled as a lightweight native binary. scans file systems and directory structures locally with near-instant execution.',
      codeBlock: '$ securify scan .',
      tag: 'cli'
    },
    {
      step: '02',
      title: 'git hooks gateway',
      description: 'hooks directly into the git lifecycles. aborts the commit operation automatically if any api key patterns are identified.',
      codeBlock: '$ securify init-hook',
      tag: 'pre-commit'
    },
    {
      step: '03',
      title: 'ci/cd integration gate',
      description: 'enforces repository compliance policies. blocks pull request merges on remote environments if tokens are found.',
      codeBlock: '- name: run scan\n  uses: securify/action@v2',
      tag: 'github actions'
    },
    {
      step: '04',
      title: 'webhooks dispatcher',
      description: 'delivers immediate payloads to slack, teams, or discord channels the instant leaks are detected in the repository history.',
      codeBlock: 'POST https://api.securify.dev/webhook',
      tag: 'notifications'
    }
  ];

  const marqueeItems = [
    { 
      name: 'github actions', 
      glowClass: 'neon-item-github',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
      )
    },
    { 
      name: 'amazon web services', 
      glowClass: 'neon-item-aws',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#ff9900">
          <path d="M11.962 16.03c-2.433 0-4.004-.766-4.717-2.298-.242-.519-.34-.972-.293-1.353.053-.434.256-.708.61-.823.518-.17 1.066.115 1.258.636.37.994 1.218 1.488 2.54 1.488 1.385 0 2.215-.46 2.215-1.238 0-.965-.968-1.22-2.893-1.637-2.613-.566-4.225-.39-4.225-2.664 0-2.316 2.05-3.673 4.908-3.673 1.986 0 3.493.52 4.195 1.62.247.388.307.785.18 1.19a1.042 1.042 0 0 1-1.077.721c-.482-.01-1.074-.523-1.353-.94-.373-.557-.962-.806-1.943-.806-1.235 0-1.895.426-1.895 1.08 0 .805.776 1.043 2.656 1.455 2.793.612 4.46 1.372 4.46 3.864 0 2.678-2.211 3.967-4.795 3.967zm-7.65-4.103c.358-.518.966-.69 1.442-.403.477.288.583.927.237 1.436-.88 1.292-2.203 2.269-3.727 2.752a1.002 1.002 0 0 1-1.253-.732 1.007 1.007 0 0 1 .632-1.233c1.078-.342 2.02-.99 2.669-1.82zM21.2 13.9c-.31.55-.91.75-1.4.45s-.62-.9-.32-1.45c.71-1.39.92-2.93.59-4.33a.987.987 0 0 1 .71-1.19.98.98 0 0 1 1.19.71c.46 1.96.17 4.11-.77 5.81zM11.66 18.06c4.66 0 8.78-1.92 11.23-4.94a.5.5 0 0 0-.08-.71.505.505 0 0 0-.71.08c-2.27 2.8-6.11 4.57-10.44 4.57-5.07 0-9.45-2.42-11.6-6.11a.501.501 0 0 0-.69-.17.498.498 0 0 0-.17.69c2.32 3.98 7.1 6.59 12.46 6.59zM1.44 14.8c.28-.27.75-.24.99.07l1.78 2.26c.21.27.17.66-.09.87-.27.21-.66.17-.87-.09L1.47 15.65c-.24-.31-.2-.78.07-.99z"/>
        </svg>
      )
    },
    { 
      name: 'supabase platform', 
      glowClass: 'neon-item-supabase',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#3ecf8e">
          <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.258 1.409 1.872.637l9.263-11.651c1.094-1.377.114-3.405-1.645-3.405h-9.578l-.113-7.51Z"/>
        </svg>
      )
    },
    { 
      name: 'stripe payments', 
      glowClass: 'neon-item-stripe',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#635bff">
          <path d="M13.934 12.502c0-2.278-1.637-3.468-4.434-3.468-1.564 0-2.98.41-3.801.884l-.454 2.766c.866-.413 2.164-.784 3.443-.784 1.536 0 2.258.629 2.258 1.629 0 2.65-8.506 2.217-8.506 7.95 0 2.64 2.052 4.521 5.342 4.521 1.959 0 3.753-.557 4.794-1.072l.464-2.835c-.938.485-2.526.897-3.929.897-1.588 0-2.433-.67-2.433-1.67 0-2.949 8.5-2.29 8.5-8.819zM22.062 12.28c-.804 0-1.464.444-1.743.918v-.97h-2.99v12.203h3.042v-8.662c0-2.093 1.341-3.238 3.433-3.238.443 0 .815.062 1.114.155l.485-2.908c-.413-.103-.949-.155-1.505-.155zM22.188 5.753a1.956 1.956 0 0 0-1.959 1.959c0 1.082.877 1.959 1.959 1.959a1.956 1.956 0 0 0 1.959-1.959 1.956 1.956 0 0 0-1.959-1.959zM9.402.13l-3.052.65v2.856h3.052v5.187h3.042V3.636h3.29V.78h-3.29V.13H9.402zm12.392 9.072c-1.341 0-2.269.588-2.733 1.196v-1.093h-2.99v12.203h3.042v-8.662c0-2.093 1.341-3.238 3.433-3.238.443 0 .815.062 1.114.155l.485-2.908c-.413-.103-.949-.155-1.505-.155zm7.362-.155c-3.413 0-5.63 2.196-5.63 6.187 0 4.197 2.217 6.455 5.92 6.455 1.577 0 2.877-.381 3.691-.918l.423-2.547c-.773.443-1.846.742-3.29.742-2.124 0-3.475-1.114-3.568-3.403h10.97c.052-.454.083-.938.083-1.464-.01-3.959-1.938-7.052-5.61-7.052zm-2.599 4.393c.124-1.681 1.093-2.557 2.454-2.557 1.433 0 2.258.918 2.258 2.557h-4.712z"/>
        </svg>
      )
    },
    { 
      name: 'slack integrations', 
      glowClass: 'neon-item-slack',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#e01e5a">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.043zm0-6.317a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.26a2.528 2.528 0 0 1 2.52 2.522v5.043a2.528 2.528 0 0 1-2.52 2.522H1.261A2.528 2.528 0 0 1 0 17.683v-5.043a2.528 2.528 0 0 1 1.261-2.522h5.043zm6.317-5.061a2.528 2.528 0 0 1 2.522-2.52 2.528 2.528 0 0 1 2.52 2.52v2.52h-2.52a2.528 2.528 0 0 1-2.522-2.52zm-1.26 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H11.36a2.528 2.528 0 0 1-2.52-2.52V5.047zm0 6.317a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v2.522h-2.522a2.528 2.528 0 0 1-2.52-2.522zm6.317 1.26a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522h-5.043a2.528 2.528 0 0 1-2.522-2.522v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043z"/>
        </svg>
      )
    },
    { 
      name: 'vercel deployments', 
      glowClass: 'neon-item-vercel',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M24 22.525H0L12 1.475Z"/>
        </svg>
      )
    },
    { 
      name: 'gitlab pipeline', 
      glowClass: 'neon-item-gitlab',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24" fill="#fc6d26">
          <path d="m23.955 13.587-1.342-4.135a.44.44 0 0 0-.25-.258.439.439 0 0 0-.356.008.45.45 0 0 0-.214.225l-1.354 4.16H3.56L2.207 9.427a.439.439 0 0 0-.214-.225.439.439 0 0 0-.356-.008.44.44 0 0 0-.25.258L.045 13.587a.879.879 0 0 0 .319.986l11.121 8.08a.88.88 0 0 0 1.03 0l11.12-8.08a.879.879 0 0 0 .32-.986Z"/>
        </svg>
      )
    },
    { 
      name: 'google cloud platform', 
      glowClass: 'neon-item-gcp',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 -25 256 256">
          <path d="M170.2517,56.8186 L192.5047,34.5656 L193.9877,25.1956 C153.4367,-11.6774 88.9757,-7.4964 52.4207,33.9196 C42.2667,45.4226 34.7337,59.7636 30.7167,74.5726 L38.6867,73.4496 L83.1917,66.1106 L86.6277,62.5966 C106.4247,40.8546 139.8977,37.9296 162.7557,56.4286 L170.2517,56.8186 Z" fill="#EA4335"></path>
          <path d="M224.2048,73.9182 C219.0898,55.0822 208.5888,38.1492 193.9878,25.1962 L162.7558,56.4282 C175.9438,67.2042 183.4568,83.4382 183.1348,100.4652 L183.1348,106.0092 C198.4858,106.0092 210.9318,118.4542 210.9318,133.8052 C210.9318,149.1572 198.4858,161.2902 183.1348,161.2902 L127.4638,161.2902 L121.9978,167.2242 L121.9978,200.5642 L127.4638,205.7952 L183.1348,205.7952 C223.0648,206.1062 255.6868,174.3012 255.9978,134.3712 C256.1858,110.1682 244.2528,87.4782 224.2048,73.9182" fill="#4285F4"></path>
          <path d="M71.8704,205.7957 L127.4634,205.7957 L127.4634,161.2897 L71.8704,161.2897 C67.9094,161.2887 64.0734,160.4377 60.4714,158.7917 L52.5844,161.2117 L30.1754,183.4647 L28.2234,191.0387 C40.7904,200.5277 56.1234,205.8637 71.8704,205.7957" fill="#34A853"></path>
          <path d="M71.8704,61.4255 C31.9394,61.6635 -0.2366,94.2275 0.0014,134.1575 C0.1344,156.4555 10.5484,177.4455 28.2234,191.0385 L60.4714,158.7915 C46.4804,152.4705 40.2634,136.0055 46.5844,122.0155 C52.9044,108.0255 69.3704,101.8085 83.3594,108.1285 C89.5244,110.9135 94.4614,115.8515 97.2464,122.0155 L129.4944,89.7685 C115.7734,71.8315 94.4534,61.3445 71.8704,61.4255" fill="#FBBC05"></path>
        </svg>
      )
    },
    { 
      name: 'postgresql database', 
      glowClass: 'neon-item-postgres',
      icon: (
        <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 457.733 457.733" fill="#336791">
          <path d="M439.467 151.467c-.267-.267-.267-.533-.533-.533-2.133-1.6-4.533-3.2-6.933-4.533-20.8-12.8-48.8-18.133-77.867-17.067C324 100.8 280 73.067 228.533 73.067c-13.867 0-27.467 2-40.267 6.133-3.467-9.333-8.8-18.133-15.467-25.867C142.933 19.467 101.6 0 54.933 0 24.8 0 0 24.8 0 54.933c0 30.667 13.867 58.933 36 78.4C5.067 167.2 0 216 0 256c0 10.667 4 20.8 11.2 28.533 19.467 20.8 54.667 23.467 78.4 23.467 2.133 0 4 .533 5.333 1.867l28.267 28.267c7.467 7.467 17.6 11.733 28.267 11.733H224c16.267 0 31.733-6.4 43.2-18.133l42.667-42.667c13.867-13.867 36-13.867 49.867 0l22.133 22.133a8.8 8.8 0 0 0 6.133 2.667h53.333c10.667 0 20.8-4 28.533-11.2l-3.2-3.2a275.567 275.567 0 0 1-20.8-78.4c17.6-1.867 33.6-5.867 47.467-12 18.667-8.267 34.667-20.8 47.2-36.8l2-2.133v-1.6c0-10.4-4.267-20.267-11.467-28zM31.467 118.933C14.667 105.067 8 83.2 8 54.933 8 29.067 29.067 8 54.933 8c41.333 0 77.867 17.6 98.667 49.6C169.067 77.6 172.8 98.4 172.8 120H152c-29.333 0-57.333-12.8-77.867-33.333l-22.133-22.133a8.8 8.8 0 0 0-6.133-2.667H22.133C11.467 61.867 8 72 8 82.667c0 14.133 11.733 36.267 23.467 36.267h6.667a8.8 8.8 0 0 0 8.8-8.8V93.333a8.8 8.8 0 0 1 8.8-8.8H72a8.8 8.8 0 0 1 8.8 8.8v22.4c0 1.067-.267 2.133-.533 3.2-5.067 13.867-13.867 25.867-25.333 34.667a8.8 8.8 0 0 1-5.333 1.867h-5.667c-4.267.267-8.533.267-12.467 0zM152 441.6c-7.467 0-14.667-3-19.733-8.133L104 405.2C85.333 386.533 55.467 386.533 36.8 405.2L14.667 427.333a8.8 8.8 0 0 0-2.667 6.133H8v-1.6l15.467-15.467c27.467-27.467 72-27.467 99.467 0l28.267 28.267c1.867 1.867 4.533 3 7.2 3h65.6c1.6 0 3.2-.533 4.533-1.6l42.667-42.667c11.2-11.2 26.133-17.333 42.133-17.333h13.867c2.667 0 5.333-1.067 7.2-2.933l22.133-22.133c1.867-1.867 2.933-4.533 2.933-7.2v-13.867c0-16 6.133-30.933 17.333-42.133l42.667-42.667c1.067-1.067 1.6-2.933 1.6-4.533V184l-28.267 28.267c-18.667 18.667-48.533 18.667-67.2 0l-28.267-28.267c-11.733-11.733-27.467-18.133-44.267-18.133H152c-8.8 0-16 7.2-16 16v182.933c0 29.333 11.2 57.067 31.467 77.867l2.667 2.667v8.533c0 5.333-1.867 10.4-5.333 14.4-4 4.533-9.333 6.933-14.8 6.933zm294.4-235.2c-1.333 0-2.667.533-3.733 1.6l-42.667 42.667c-19.467 19.467-51.2 19.467-70.667 0l-22.133-22.133c-3.467-3.467-9.333-3.467-12.8 0l-28.267 28.267c-10.667 10.667-24.8 16.533-40 16.533H224c-16.533 0-32-6.4-43.2-18.133L152.533 244c-1.867-1.867-4.533-3-7.2-3H97.6c-4.267 0-8.267 1.867-11.2 4.8-19.467 19.467-51.2 19.467-70.667 0L8 238.133v17.867c0 37.867 4.267 85.333 34.667 115.733l22.133-22.133c18.667-18.667 48.533-18.667 67.2 0l22.133 22.133c10.133 10.133 23.467 15.733 37.867 15.733H224c16.533 0 32-6.4 43.2-18.133l42.667-42.667c10.667-10.667 24.8-16.533 40-16.533h13.867c4.8 0 8.8-4 8.8-8.8v-13.867c0-15.2 5.867-29.333 16.533-40l42.667-42.667c1.867-1.867 3-4.533 3-7.2v-24.267c-20.267 1.6-40 3.733-58.667 5.6-2.4 0-4.533 1.067-6.133 2.667l-22.133 22.133a8.8 8.8 0 0 0 0 12.533l28.267 28.267a8.8 8.8 0 0 1 0 12.533c-1.6 1.6-4 2.667-6.133 2.667H368c-1.067 0-2.133.267-3.2.533-13.867 5.067-25.867 13.867-34.667 25.333a8.8 8.8 0 0 1-7.2 3.733H320a8.8 8.8 0 0 1-8.8-8.8v-22.4a8.8 8.8 0 0 1 8.8-8.8h2.667a8.8 8.8 0 0 0 8.8-8.8v-6.667c0-11.733-22.133-23.467-36.267-23.467h-10.667c-10.667 0-20.8 3.467-28.533 10.667l-15.467 15.467v1.6h5.333c16.267 0 31.733 6.4 43.2 18.133L314.667 296v.533c3.467-4 5.333-9.067 5.333-14.4v-64c0-26.667-21.867-48.533-48.533-48.533H224c-22.133 0-40.267-14.933-45.333-35.2H224c26.667 0 48.533-21.867 48.533-48.533V76.8a8.8 8.8 0 0 0-8.8-8.8h-77.867c-5.333 0-10.4 1.867-14.4 5.333L156 88.8v-2.133c0-37.867-4.267-85.333-34.667-115.733L99.2 1.6C97.067.533 94.4 0 92 0c-4.8 0-8.8 4-8.8 8.8v13.867c0 15.2-5.867 29.333-16.533 40L24 105.333c-1.867 1.867-3 4.533-3 7.2v103.467c22.4 0 42.133 3.467 58.667 10.133l3.2.533c6.4-15.2 21.6-26.133 39.467-26.133H224c11.733 0 22.4-5.067 30.133-13.867a42.2 42.2 0 0 0 7.467-19.2c1.6-8.267 8.533-14.4 17.067-14.4h83.733c2.4 0 4.8 1.067 6.4 2.667l22.133 22.133a8.8 8.8 0 0 1 0 12.533l-28.267 28.267a8.8 8.8 0 0 0 0 12.533c2.933 2.933 7.2 4 10.933 2.667 22.4-8 47.467-12 74.667-12h1.6L441.6 200c3.733 1.867 6.4 5.6 6.4 9.8v1.6c-1.6-1.6-3.2-3.2-4.8-4.8zM425.6 136H392c-29.333 0-57.333-12.8-77.867-33.333l-22.133-22.133c-4-4-9.333-6.133-14.8-6.133H224c-12.8 0-24 7.467-29.333 19.2C189.333 105.067 178.133 112 165.333 112h-12c-5.867 0-10.933-3.2-13.867-8l-20.267-34.133c-1.6-2.667-4.267-4.533-7.2-4.87-3.2-.267-6.133.8-8.267 3.2L81.6 90.4c-4.8 4.8-11.2 7.2-17.867 7.2h-3.733c.8 3.733 1.6 7.467 2.667 11.2 1.333 0 2.667-.533 3.733-1.6l22.133-22.133c10.667-10.667 24.8-16.533 40-16.533h13.867c4.8 0 8.8 4 8.8 8.8v6.667c0 11.733 22.133 23.467 36.267 23.467h10.667c1.333 0 2.667-.533 3.733-1.6l42.667-42.667c1.867-1.867 3-4.533 3-7.2V50.667c0-4.8 4-8.8 8.8-8.8H320c15.2 0 29.333 5.867 40 16.533l22.133 22.133c1.867 1.867 4.533 3 7.2 3h38.4l2.133 2.133v1.6l-4.267 42.667c-.267 2.4-1.333 4.533-2.933 6.133zM448 184v-13.867c0-2.4-1.067-4.8-2.933-6.667L422.933 141.2c-4-4-9.333-6.133-14.8-6.133H368c-12.8 0-24 7.467-29.333 19.2-5.333 11.733-16.533 18.667-29.333 18.667h-12c-5.867 0-10.933-3.2-13.867-8l-20.267-34.133a15.867 15.867 0 0 0-15.467-8.133c-5.6.533-10.4 3.733-12.8 8.8L213.6 172.8c-2.933 5.867-9.067 9.6-15.733 9.6h-44.533c-2.4 0-4.8 1.067-6.4 2.667L124.8 207.2c-4.8 4.8-11.2 7.2-17.867 7.2H97.6c-4.8 0-8.8-4-8.8-8.8V152.8c0-8.8-7.2-16-16-16H22.4c-4.8 0-8.8 4-8.8 8.8v64.8c12 2.667 24.533 4 37.867 4h1.6l22.133-22.133a8.8 8.8 0 0 1 12.533 0l22.133 22.133a8.8 8.8 0 0 0 12.533 0c2.933-2.933 4-7.2 2.667-10.933a272.784 272.784 0 0 1-12-74.667h3.733c1.333 0 2.667-.533 3.733-1.6l42.667-42.667c1.867-1.867 3-4.533 3-7.2V65.067c0-4.8 4-8.8 8.8-8.8H224c15.2 0 29.333 5.867 40 16.533l22.133 22.133c1.867 1.867 4.533 3 7.2 3h38.4l2.133 2.133v1.6c-.267 2.4-1.333 4.533-2.933 6.133l-22.133 22.133a8.8 8.8 0 0 0 0 12.533l28.267 28.267a8.8 8.8 0 0 1 0 12.533c-1.6 1.6-4 2.667-6.133 2.667h-3.733c-2.4 0-4.533 1.067-6.133 2.667l-22.133 22.133a8.8 8.8 0 0 0 0 12.533l28.267 28.267a8.8 8.8 0 0 1 0 12.533c-1.6 1.6-4 2.667-6.133 2.667H368c-1.067 0-2.133.267-3.2.533-13.867 5.067-25.867 13.867-34.667 25.333a8.8 8.8 0 0 1-7.2 3.733H320a8.8 8.8 0 0 1-8.8-8.8v-22.4a8.8 8.8 0 0 1 8.8-8.8h2.667c2.4 0 4.8-1.067 6.4-2.667l22.133-22.133a8.8 8.8 0 0 0 0-12.533l-28.267-28.267a8.8 8.8 0 0 1 0-12.533l22.133-22.133c1.867-1.867 3-4.533 3-7.2V113.067c0-4.8 4-8.8 8.8-8.8H320c15.2 0 29.333 5.867 40 16.533l22.133 22.133c1.867 1.867 4.533 3 7.2 3h38.4l2.133 2.133v1.6l-2 20c-1.333 12.267.533 24.8 5.6 35.733.267.533.533.8 1.067 1.067l20.267 12.267a8.8 8.8 0 0 0 8.8 0L448 184z"/>
        </svg>
      )
    }
  ];

  const faqs: FaqItem[] = [
    {
      q: 'does securify upload my codebase or secrets to the cloud?',
      a: 'absolutely not. securify is designed to be 100% security-first. the interactive sandbox and local directory scanners execute entirely client-side inside your browser engine. no file data ever leaves your device.'
    },
    {
      q: 'how does the pre-commit hook prevent credential leaks?',
      a: "securify installs a shell script in your repository's .git/hooks/pre-commit file. every time you run 'git commit', the hook intercepts the operation, scans the staged changes for secrets, and aborts the commit if a match is found."
    },
    {
      q: 'can i customize the detection regex rules or entropy thresholds?',
      a: "yes. you can generate a custom 'securify.toml' configuration file using our sandbox configurator to adjust entropy limits, exclude specific files/directories, or define custom regex detection rules."
    },
    {
      q: 'is there a way to bypass a specific leak block when necessary?',
      a: "yes. if a flagged line is a false positive or intentional, you can bypass the blocker by appending the comment '# securify:ignore' (or matching comment syntax for your file language) to the end of that specific line."
    }
  ];

  return (
    <section id="solutions" className="bg-neutral-950 py-28 px-6 md:px-12 border-t border-white/5 relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        
        /* Neon Icon persistent soft glow & hover effects */
        .neon-item-github svg {
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
        }
        .neon-item-github:hover svg {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .neon-item-github:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .neon-item-aws svg {
          filter: drop-shadow(0 0 2px rgba(255, 153, 0, 0.15));
        }
        .neon-item-aws:hover svg {
          filter: drop-shadow(0 0 8px rgba(255, 153, 0, 0.8));
        }
        .neon-item-aws:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255, 153, 0, 0.6);
        }

        .neon-item-supabase svg {
          filter: drop-shadow(0 0 2px rgba(62, 207, 142, 0.15));
        }
        .neon-item-supabase:hover svg {
          filter: drop-shadow(0 0 8px rgba(62, 207, 142, 0.8));
        }
        .neon-item-supabase:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(62, 207, 142, 0.6);
        }

        .neon-item-stripe svg {
          filter: drop-shadow(0 0 2px rgba(99, 91, 255, 0.15));
        }
        .neon-item-stripe:hover svg {
          filter: drop-shadow(0 0 8px rgba(99, 91, 255, 0.8));
        }
        .neon-item-stripe:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(99, 91, 255, 0.6);
        }

        .neon-item-slack svg {
          filter: drop-shadow(0 0 2px rgba(224, 30, 90, 0.15));
        }
        .neon-item-slack:hover svg {
          filter: drop-shadow(0 0 8px rgba(224, 30, 90, 0.8));
        }
        .neon-item-slack:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(224, 30, 90, 0.6);
        }

        .neon-item-vercel svg {
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
        }
        .neon-item-vercel:hover svg {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
        }
        .neon-item-vercel:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .neon-item-gitlab svg {
          filter: drop-shadow(0 0 2px rgba(252, 109, 38, 0.15));
        }
        .neon-item-gitlab:hover svg {
          filter: drop-shadow(0 0 8px rgba(252, 109, 38, 0.8));
        }
        .neon-item-gitlab:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(252, 109, 38, 0.6);
        }

        .neon-item-gcp svg {
          filter: drop-shadow(0 0 2px rgba(66, 133, 244, 0.15));
        }
        .neon-item-gcp:hover svg {
          filter: drop-shadow(0 0 8px rgba(66, 133, 244, 0.8));
        }
        .neon-item-gcp:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(66, 133, 244, 0.6);
        }

        .neon-item-postgres svg {
          filter: drop-shadow(0 0 2px rgba(51, 103, 145, 0.15));
        }
        .neon-item-postgres:hover svg {
          filter: drop-shadow(0 0 8px rgba(51, 103, 145, 0.8));
        }
        .neon-item-postgres:hover span {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(51, 103, 145, 0.6);
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
          {/* Left Area - Text (lg:col-span-5) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
              integration pipeline
            </span>
            <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-6">
              continuous guard.
            </h2>
            <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed mb-8">
              securify runs locally and globally. it shields credentials in real-time from the moment you write code on your machine up to the deployment release in cloud servers.
            </p>
            <a
              href="https://github.com/sandrotonal/anti_security#integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white hover:text-neutral-300 text-sm lowercase border-b border-white/20 pb-1 hover:border-white transition-all select-none"
            >
              view configuration guide
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Right Area - Connected Pipeline (lg:col-span-7) */}
          <div className="lg:col-span-7 relative pl-6 md:pl-10 select-none">
            {/* Vertical Pipeline Line */}
            <div className="absolute left-1 md:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />

            <div className="space-y-12">
              {steps.map((item) => (
                <div key={item.step} className="relative group">
                  
                  {/* Node Dot */}
                  <div className="absolute -left-[25px] md:-left-[33px] top-1.5 w-2 h-2 rounded-full bg-neutral-800 border border-white/40 group-hover:bg-white group-hover:scale-125 transition-all duration-300 shadow-lg" />

                  {/* Step Content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-500">{item.step}</span>
                      <h3 className="text-lg md:text-xl font-medium text-white lowercase tracking-tight">
                        {item.title}
                      </h3>
                      <span className="text-[9px] font-mono bg-neutral-900 border border-white/5 text-neutral-500 rounded px-2 py-0.5 lowercase">
                        {item.tag}
                      </span>
                    </div>
                    
                    <p className="text-neutral-400 text-xs md:text-sm font-light lowercase leading-relaxed max-w-xl">
                      {item.description}
                    </p>

                    {item.codeBlock && (
                      <div className="max-w-md bg-black/60 border border-white/5 rounded-xl p-3.5 font-mono text-[11px] text-neutral-400 group-hover:border-white/10 transition-colors shadow-xl select-text overflow-x-auto min-w-0">
                        <pre className="whitespace-pre-wrap break-all">{item.codeBlock}</pre>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Neon Logos Infinite Marquee */}
        <div className="w-full overflow-hidden border-y border-white/5 py-7 bg-black/40 backdrop-blur-sm relative select-none mb-24 rounded-2xl">
          {/* Blur masks */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

          <div className="animate-marquee gap-20 items-center">
            {/* First Set */}
            {marqueeItems.map((item, idx) => (
              <span key={`m1-${idx}`} className={`flex items-center gap-3 text-[10px] font-mono text-neutral-500 hover:text-white transition-all duration-300 tracking-widest uppercase cursor-default shrink-0 group/neon ${item.glowClass}`}>
                {item.icon}
                <span className="transition-all duration-300 group-hover/neon:text-white">{item.name}</span>
              </span>
            ))}
            {/* Duplicate Set */}
            {marqueeItems.map((item, idx) => (
              <span key={`m2-${idx}`} className={`flex items-center gap-3 text-[10px] font-mono text-neutral-500 hover:text-white transition-all duration-300 tracking-widest uppercase cursor-default shrink-0 group/neon ${item.glowClass}`}>
                {item.icon}
                <span className="transition-all duration-300 group-hover/neon:text-white">{item.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div className="max-w-4xl mx-auto border-t border-white/5 pt-20">
          <div className="text-center mb-12">
            <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-3 py-0.5 text-[10px] font-mono text-neutral-400 lowercase mb-3 tracking-wider">
              help & support
            </span>
            <h3 className="hero-title text-3xl md:text-4xl font-medium tracking-tight text-white lowercase">
              frequently asked questions.
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index} 
                  className={`border rounded-2xl p-5 transition-all duration-300 cursor-pointer ${
                    isOpen ? 'bg-neutral-900/20 border-white/10' : 'bg-transparent border-white/5 hover:border-white/10'
                  }`}
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs md:text-sm font-mono text-white lowercase tracking-tight">
                      {faq.q}
                    </span>
                    <span className="text-neutral-500 text-xs shrink-0 select-none">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                  
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-white/5 text-neutral-400 text-xs md:text-sm font-light lowercase leading-relaxed animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Webhook Notification Configurator */}
        <div className="max-w-4xl mx-auto border-t border-white/5 pt-20 mt-20 select-text">
          <div className="text-center mb-12">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[10px] font-mono text-neutral-400 lowercase mb-3 tracking-wider">
              real-time notifications
            </span>
            <h3 className="hero-title text-3xl md:text-4xl font-medium tracking-tight text-white lowercase">
              webhook notification dispatcher.
            </h3>
            <p className="text-neutral-400 text-xs md:text-sm font-light lowercase leading-relaxed max-w-xl mx-auto mt-2">
              configure outgoing integration webhooks to dispatch instant warnings to developer communication channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            {/* Form Input fields (md:col-span-6) */}
            <div className="md:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-5">
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  dispatch endpoints parameters
                </span>

                {/* Platform select tabs */}
                <div className="flex gap-2 border-b border-white/5 pb-4 select-none">
                  {['slack', 'discord', 'teams'].map((plat) => (
                    <button
                      key={plat}
                      onClick={() => setActivePlatform(plat as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all lowercase ${
                        activePlatform === plat
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-neutral-500 border-white/5 hover:text-white'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">webhook receiver url:</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 font-mono"
                  />
                </div>

                {/* Channel/Room Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">target channel / display identifier:</label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 font-mono"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleTestWebhook}
                  disabled={testStatus === 'sending'}
                  className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3 lowercase transition-all select-none disabled:opacity-50"
                >
                  {testStatus === 'sending' ? 'dispatching request...' : 'test notification'}
                </button>

                {testStatus === 'success' && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl text-center font-mono text-[10px] lowercase animate-page-entrance">
                    ✔ test payload dispatched successfully! status code 200 ok.
                  </div>
                )}
              </div>
            </div>

            {/* JSON Output Preview (md:col-span-6) */}
            <div className="md:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  live outgoing json payload
                </span>
                
                <div className="bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-[10px] text-neutral-400 overflow-auto max-h-[220px]">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(getPayload(), null, 2)}</pre>
                </div>
              </div>

              <p className="text-[9px] font-mono text-neutral-500 lowercase mt-6 leading-relaxed">
                securify server integrations leverage webhook payloads containing structured repo, file, and rule definitions. dispatch simulation is run purely inside local sandboxes.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
