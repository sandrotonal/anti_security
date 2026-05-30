---
trigger: always_on
---

# SECURITY FIRST POLICY

Security is a mandatory requirement.

Never prioritize convenience over security.

All code must follow OWASP Top 10 recommendations.

# API SECURITY

- Never expose API keys.
- Never hardcode secrets.
- Use environment variables.
- Validate all API inputs.
- Sanitize all user inputs.
- Implement rate limiting.
- Use HTTPS only.
- Apply authentication where necessary.
- Use least privilege access.
- Never expose internal endpoints.

# AUTHENTICATION

- Use secure authentication.
- Prefer JWT with refresh tokens.
- Use HttpOnly cookies when applicable.
- Implement CSRF protection.
- Use secure password hashing.
- Use bcrypt, Argon2 or scrypt.
- Never store plaintext passwords.

# DATABASE SECURITY

- Use parameterized queries.
- Prevent SQL Injection.
- Validate all database inputs.
- Never trust user input.
- Implement proper indexing.
- Use database migrations.
- Follow least privilege database access.

# XSS PROTECTION

- Escape output.
- Sanitize HTML.
- Validate all form fields.
- Prevent reflected XSS.
- Prevent stored XSS.
- Prevent DOM-based XSS.

# FILE UPLOAD SECURITY

- Validate MIME types.
- Restrict extensions.
- Limit file sizes.
- Scan uploaded files.
- Store uploads outside public directories.

# ERROR HANDLING

- Never expose stack traces.
- Never expose internal paths.
- Log securely.
- Return user-friendly errors.
- Prevent information leakage.

# LOGGING

- Log security events.
- Log API failures.
- Log authentication attempts.
- Never log passwords.
- Never log API keys.
- Never log sensitive tokens.

# PERFORMANCE

- Minimize database queries.
- Optimize API calls.
- Use caching where appropriate.
- Lazy load resources.
- Compress assets.
- Minify production files.

# FRONTEND SECURITY

- Use Content Security Policy.
- Use secure headers.
- Prevent clickjacking.
- Implement X-Frame-Options.
- Implement Referrer Policy.

# BACKEND SECURITY

- Validate every request.
- Verify permissions server-side.
- Never trust frontend validation.
- Implement role-based access control.

# SEO REQUIREMENTS

- Semantic HTML.
- Proper heading hierarchy.
- Structured data.
- Meta tags.
- Open Graph tags.
- Sitemap generation.
- Robots.txt validation.
- Canonical URLs.

# GOOGLE ANALYTICS

- Use GA4 events.
- Track conversions.
- Track form submissions.
- Track CTA clicks.
- Respect GDPR requirements.
- Respect cookie consent requirements.

# CODE QUALITY

- Production-ready code only.
- No placeholder logic.
- No pseudo-code.
- No insecure shortcuts.
- No deprecated libraries.
- Follow latest best practices.

# TESTING

Generate:

- Unit Tests
- Integration Tests
- Security Test Cases
- Edge Case Tests
- Error Handling Tests

# OUTPUT REQUIREMENTS

For every implementation provide:

1. Architecture Explanation
2. Security Considerations
3. Potential Vulnerabilities
4. Mitigation Strategies
5. Performance Recommendations
6. SEO Considerations
7. Scalability Considerations
8. Production Deployment Notes

Always explain:
- Why the implementation is secure.
- What attacks are prevented.
- What tradeoffs exist.
- How to improve security further.

Before generating code:

Perform an internal security audit.

Check for:
- SQL Injection
- XSS
- CSRF
- SSRF
- RCE
- Path Traversal
- Authentication flaws
- Authorization flaws
- Sensitive data exposure
- Insecure API design
- Dependency vulnerabilities

If any issue exists:

Fix it automatically before returning code.

Return only production-grade implementations.