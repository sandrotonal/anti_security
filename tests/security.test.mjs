import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: SSRF IP Blacklist & Validation Logic
test('SSRF Protection - isForbiddenIp correctly flags private and dangerous IP ranges', async () => {
  // We mirror the exact CIDR logic implemented in api/scan-site.ts
  const { isForbiddenIp } = await import('../api/scan-site.ts');

  // IPv4 Loopback & Localhost
  assert.equal(isForbiddenIp('127.0.0.1'), true, '127.0.0.1 must be blocked');
  assert.equal(isForbiddenIp('127.255.255.255'), true, '127.255.255.255 must be blocked');
  assert.equal(isForbiddenIp('0.0.0.0'), true, '0.0.0.0 must be blocked');

  // Cloud Metadata & Link Local (RFC 3927)
  assert.equal(isForbiddenIp('169.254.169.254'), true, '169.254.169.254 (AWS/GCP metadata) must be blocked');
  assert.equal(isForbiddenIp('169.254.1.1'), true, '169.254.1.1 must be blocked');

  // RFC 1918 Private Ranges
  assert.equal(isForbiddenIp('10.0.0.1'), true, '10.0.0.1 must be blocked');
  assert.equal(isForbiddenIp('10.255.255.255'), true, '10.255.255.255 must be blocked');
  assert.equal(isForbiddenIp('172.16.0.1'), true, '172.16.0.1 must be blocked');
  assert.equal(isForbiddenIp('172.31.255.255'), true, '172.31.255.255 must be blocked');
  assert.equal(isForbiddenIp('192.168.1.1'), true, '192.168.1.1 must be blocked');
  assert.equal(isForbiddenIp('192.168.0.254'), true, '192.168.0.254 must be blocked');

  // Carrier-Grade NAT (RFC 6598)
  assert.equal(isForbiddenIp('100.64.0.1'), true, '100.64.0.1 (CGNAT) must be blocked');
  assert.equal(isForbiddenIp('100.127.255.255'), true, '100.127.255.255 must be blocked');

  // Documentation / Benchmark Ranges
  assert.equal(isForbiddenIp('192.0.2.1'), true, '192.0.2.1 (TEST-NET-1) must be blocked');
  assert.equal(isForbiddenIp('198.51.100.1'), true, '198.51.100.1 (TEST-NET-2) must be blocked');
  assert.equal(isForbiddenIp('203.0.113.1'), true, '203.0.113.1 (TEST-NET-3) must be blocked');

  // Multicast & Reserved
  assert.equal(isForbiddenIp('224.0.0.1'), true, '224.0.0.1 (Multicast) must be blocked');
  assert.equal(isForbiddenIp('240.0.0.1'), true, '240.0.0.1 (Reserved) must be blocked');
  assert.equal(isForbiddenIp('255.255.255.255'), true, '255.255.255.255 (Broadcast) must be blocked');

  // IPv6 Checks
  assert.equal(isForbiddenIp('::1'), true, '::1 (IPv6 Loopback) must be blocked');
  assert.equal(isForbiddenIp('fe80::1'), true, 'fe80::1 (IPv6 link-local) must be blocked');
  assert.equal(isForbiddenIp('fc00::1'), true, 'fc00::1 (IPv6 ULA) must be blocked');
  assert.equal(isForbiddenIp('fd00::1'), true, 'fd00::1 (IPv6 ULA) must be blocked');
  assert.equal(isForbiddenIp('::ffff:127.0.0.1'), true, '::ffff:127.0.0.1 (IPv4-mapped) must be blocked');

  // Valid Public IPs
  assert.equal(isForbiddenIp('8.8.8.8'), false, '8.8.8.8 (Google DNS) should be allowed');
  assert.equal(isForbiddenIp('1.1.1.1'), false, '1.1.1.1 (Cloudflare DNS) should be allowed');
  assert.equal(isForbiddenIp('140.82.121.4'), false, 'GitHub IP should be allowed');
});

// Test 2: URL SSRF Validator
test('SSRF Protection - validateTargetUrl blocks localhost and internal schemes', async () => {
  const { validateTargetUrl } = await import('../api/scan-site.ts');

  const res1 = await validateTargetUrl('http://127.0.0.1:5173');
  assert.equal(res1.safe, false, 'http://127.0.0.1:5173 must be rejected');

  const res2 = await validateTargetUrl('http://localhost:3000');
  assert.equal(res2.safe, false, 'http://localhost:3000 must be rejected');

  const res3 = await validateTargetUrl('http://169.254.169.254/latest/meta-data/');
  assert.equal(res3.safe, false, 'Cloud metadata URL must be rejected');

  const res4 = await validateTargetUrl('file:///etc/passwd');
  assert.equal(res4.safe, false, 'file: protocol must be rejected');

  const res5 = await validateTargetUrl('gopher://127.0.0.1:6379/_flushall');
  assert.equal(res5.safe, false, 'gopher: protocol must be rejected');

  const res6 = await validateTargetUrl('https://example.com');
  assert.equal(res6.safe, true, 'https://example.com should be safe');
});

// Test 3: Semver Range Comparator
test('CVE Database - Real Semver Comparator and isVersionAffected', async () => {
  const { compareSemver, isVersionAffected, parseSemver } = await import('../src/lib/cveDatabase.ts');

  // Parse check
  const p = parseSemver('v4.17.15');
  assert.deepEqual(p, { major: 4, minor: 17, patch: 15, prerelease: undefined });

  // Comparisons
  assert.equal(compareSemver('4.17.15', '4.17.21'), -1);
  assert.equal(compareSemver('4.17.21', '4.17.15'), 1);
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0);

  // Affected range checks
  assert.equal(isVersionAffected('4.17.15', '< 4.17.21'), true, '4.17.15 is < 4.17.21');
  assert.equal(isVersionAffected('4.17.21', '< 4.17.21'), false, '4.17.21 is NOT < 4.17.21');
  assert.equal(isVersionAffected('4.18.0', '< 4.17.21'), false, '4.18.0 is NOT < 4.17.21');

  // Compound ranges
  assert.equal(isVersionAffected('1.5.0', '>= 1.0.0 < 2.0.0'), true);
  assert.equal(isVersionAffected('2.0.0', '>= 1.0.0 < 2.0.0'), false);
  assert.equal(isVersionAffected('0.9.0', '>= 1.0.0 < 2.0.0'), false);

  // OR groups (||)
  assert.equal(isVersionAffected('0.5.0', '< 1.0.0 || >= 2.0.0'), true);
  assert.equal(isVersionAffected('2.5.0', '< 1.0.0 || >= 2.0.0'), true);
  assert.equal(isVersionAffected('1.5.0', '< 1.0.0 || >= 2.0.0'), false);
});

// Test 4: Secret Scanner Engine (Zero False Negatives on Structured Keys)
test('Scan Engine - Structured keys detected without entropy veto', async () => {
  const { scanContent, redactSecret } = await import('../src/lib/scanEngine.ts');

  // AWS Access Key ID (structured 20 chars starting with AKIA)
  const awsSample = `const key = "AKIAIOSFODNN7EXAMPLE";`;
  const awsFindings = scanContent(awsSample, 'config.js');
  assert.equal(awsFindings.length, 1, 'AWS Access Key ID must be detected');
  assert.equal(awsFindings[0].type, 'AWS Access Key ID');
  assert.equal(awsFindings[0].severity, 'high');
  assert.equal(awsFindings[0].confidence, 'high');

  // Stripe Live Secret Key (test sample)
  const stripeSample = `const stripeSecret = "${'sk_' + 'live_' + '1234567890abcdef12345678'}";`;
  const stripeFindings = scanContent(stripeSample, 'app.ts');
  assert.equal(stripeFindings.length, 1, 'Stripe Secret Key must be detected');
  assert.equal(stripeFindings[0].type, 'Stripe Secret Key');

  // GitHub PAT (test sample)
  const githubSample = `const token = "${'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz'}";`;
  const ghFindings = scanContent(githubSample, 'auth.ts');
  assert.equal(ghFindings.length, 1, 'GitHub Token must be detected');

  // Inline suppression with securify:ignore
  const suppressedSample = `const token = "${'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz'}"; // securify:ignore`;
  const suppressedFindings = scanContent(suppressedSample, 'auth.ts');
  assert.equal(suppressedFindings.length, 0, 'securify:ignore comment must suppress finding');

  // Redaction check
  assert.equal(redactSecret('AKIA' + 'IOSFODNN7EXAMPLE').includes('...'), true);
});

// Test 5: Glob Regex and Filter Utils
test('Filter Utils - Safe glob regex escaping', async () => {
  const { globToRegex, filterFindings } = await import('../src/lib/filterUtils.ts');

  const re1 = globToRegex('*.ts');
  assert.equal(re1.test('index.ts'), true);
  assert.equal(re1.test('index.js'), false);

  // Escaping special characters
  const re2 = globToRegex('src/[utils]/*.ts');
  assert.equal(re2.test('src/[utils]/math.ts'), true);
  assert.equal(re2.test('src/utils/math.ts'), false);

  const findings = [
    { file: 'src/config.ts', line: 10, type: 'AWS Key', severity: 'critical', match: 'AKIA...', description: 'AWS leak' },
    { file: 'src/app.js', line: 5, type: 'Stripe Key', severity: 'medium', match: 'sk_...', description: 'Stripe leak' },
  ];

  const filtered = filterFindings(findings, { severity: ['critical'] });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].file, 'src/config.ts');
});

// Test 6: CLI SARIF & Markdown Generation
test('CLI Output - SARIF 2.1.0 and Markdown table generation', async () => {
  const { generateSarifReport, generateMarkdownReport } = await import('../src/cli/index.ts');

  const findings = [
    { file: 'src/keys.ts', line: 12, column: 5, type: 'AWS Access Key ID', severity: 'critical', redacted: 'AKIA...LE', description: 'AWS Access Key ID detected' }
  ];

  const sarifStr = generateSarifReport(findings, []);
  const sarif = JSON.parse(sarifStr);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].results.length, 1);
  assert.equal(sarif.runs[0].results[0].level, 'error');

  const md = generateMarkdownReport(findings, [], { total: 1, critical: 1, high: 0, medium: 0, low: 0 });
  assert.equal(md.includes('# Securify Security Audit Report'), true);
  assert.equal(md.includes('AWS Access Key ID'), true);
});
