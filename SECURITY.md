# Security Policy

## Supported versions

Security fixes are developed against the actively maintained ORVIA development branch. Older snapshots and demonstration builds may not receive security updates.

## Reporting a vulnerability

Do not publish exploit details, credentials, customer data, database dumps, or proof-of-concept attacks in public issues or discussions.

Report suspected vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting feature, if enabled. Include the affected component and version/commit, realistic impact and conditions, safe reproduction notes, and a suggested mitigation if known.

If private reporting is unavailable, contact the repository owner through a trusted private channel. Do not test against production, real restaurants, or accounts you do not own or have explicit permission to assess.

## Response principles

1. Acknowledge and triage reports.
2. Reproduce only in an isolated test environment.
3. Assess severity, scope, and affected data.
4. Contain exposure and rotate affected credentials where necessary.
5. Develop and test a fix before release.
6. Publish a coordinated advisory after remediation where appropriate.

## Secret handling

Never commit API keys, signing keys, database URLs, access tokens, customer records, or production exports. If a secret is exposed, revoke or rotate it immediately; deleting it from the latest commit is not sufficient.

## Scope and limitations

This policy is not a security certification or a guarantee that every deployment is secure. The current ORVIA prototype must not be used with real customer or payment data until the security review and operational controls are complete.
