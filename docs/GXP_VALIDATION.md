# GxP validation package (computerised system)

This package defines the evidence needed to use the platform for GxP-relevant
records. Code and automated tests are necessary but **not sufficient**: the
system owner, Quality Unit and approvers must execute and sign the validation.

## 1. System description and intended use

The platform supports strategic planning, HR, payroll, QMS documents, timesheets
and governance reporting. Its validated use must be stated in the URS for each
regulated process (for example, training records or batch-related QMS
documents). Features outside the approved scope remain business systems and
must be clearly separated in user procedures.

## 2. Validation lifecycle

1. **Planning** — validation plan, roles, risk assessment, supplier assessment.
2. **URS** — user requirements with unique IDs and acceptance criteria.
3. **Risk assessment** — GAMP 5 style categories; prioritize patient safety,
   product quality and data integrity functions.
4. **FS/DS** — functional and design specification traced to the URS.
5. **IQ** — installation: versions, configuration, database, storage, backups,
   time synchronization, access paths.
6. **OQ** — operation: each requirement and negative path, including access
   denial, audit immutability, session revocation and upload rejection.
7. **PQ** — performance in the real process with trained users and real SOPs.
8. **Release** — validation summary report and formal approval.
9. **Maintenance** — change control, periodic review, incident/deviation
   management, retirement.

## 3. Minimum test script set

| ID | Test | Expected evidence |
| --- | --- | --- |
| SEC-01 | Sign in with valid and invalid credentials | success/failure, lockout after threshold, audit event |
| SEC-02 | Change password and use an old session | old token rejected with 401, cookie cleared |
| SEC-03 | Sign out all sessions | every other browser receives 401 |
| SEC-04 | Role denial | staff cannot open `/api/audit` or `/api/users` |
| SEC-05 | CSRF | cross-site mutation rejected; same-origin accepted |
| MFA-01 | Privileged user without MFA | only account-security endpoints allowed until enrollment |
| MFA-02 | Recovery code login | code accepted once, consumed, audited; reuse rejected |
| MFA-03 | Lost device | administrator reset ends sessions; user re-enrolls |
| PASS-01 | Register/remove passkey | origin/RP/user-verification enforced; multiple devices; fallback works |
| AUD-01 | Append then verify audit chain | `valid: true`, expected count |
| AUD-02 | Attempt update/delete on audit row | database trigger rejects |
| AUD-03 | Create Ed25519 checkpoint | signature verifies; head/count match |
| AUD-04 | Tamper a copied audit row | verify reports the first broken entry |
| DOC-01 | Upload allowed file | stored, downloadable by authorised user only |
| DOC-02 | Upload infected/mismatched file | deleted, 400, security log |
| HR-01 | Leave approval | field history contains actor, before/after, reason |
| HR-02 | Payroll change | history retained and visible to authorised roles |
| QMS-01 | Document approval and effective date | approval signature, version and audit trail |
| JOB-01 | Two API instances run a scheduler | one claim wins; no duplicate delivery |
| OPS-01 | Database unavailable | `/api/ready` 503; no false ready state |
| OPS-02 | SIGTERM during requests | in-flight requests drain; process exits cleanly |

Each script must record the exact build/commit, environment, tester, date,
expected result, actual result, pass/fail and evidence location.

## 4. Electronic records and signatures

- Records are attributable (user id and username), legible, contemporaneous,
  original and accurate. Audit entries include UTC timestamps and request IDs.
- The typed-name signature flow records the signer, the moment, the document and
  the signature asset used. The typed name is the legal act; an image alone is
  not. Signature changes are audited.
- Corrections are additive: field history preserves before/after values and the
  reason. Do not edit audit rows. Retention and archival follow the approved
  record-retention schedule.
- Where 21 CFR Part 11 applies, the organization must approve the signature
  policy, identity proofing, signature meaning and re-authentication rules.

## 5. Data integrity controls

- Audit chain plus database trigger provides detection of modification.
- Signed exports and external Ed25519 checkpoints provide evidence that a
  historical range existed at a point in time.
- Backups are encrypted, access-controlled and restore-tested.
- Time is synchronized from the host/OS; UTC is used in stored records.
- Access is least-privilege and reviewed periodically.

## 6. Change control

Every production change requires: description and risk, impact assessment,
test evidence, approval, deployment record, post-deployment verification and
updated training/SOPs where needed. Emergency changes are retrospectively
reviewed within the approved timeline. Schema migrations are versioned and
applied with `prisma migrate deploy`; changes to audit hashing, retention or
signing are high-risk and require Quality approval before release.

## 7. Periodic review

At least annually (or after a significant incident), review access, audit
exceptions, backup/restore evidence, unresolved deviations, dependency
vulnerabilities, key custody and the continued fitness of the system for its
intended use.

## 8. Sign-off

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| System owner |  |  |  |
| Quality Unit |  |  |  |
| IT/security |  |  |  |
| Process owner |  |  |  |

> This document is a template for organizational validation. It is not a
> completed validation report and does not by itself authorize GxP use.
