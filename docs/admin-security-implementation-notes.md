# Admin Security Implementation Notes

The approved persistence foundation stores Owner-created invitation token digests only, immutable security-event records without passwords, session values, TOTP codes, recovery codes, or raw invitation tokens, encrypted TOTP seeds, and one-time recovery-code digests. The existing account role model remains unchanged: only established `admin` accounts can reach the second-factor challenge, and Owner-only procedures must be bound to the configured project-owner identity.
