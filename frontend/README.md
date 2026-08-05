# govt-subsidy-disbursement-tracking-system

## Contributions / Recent updates (by jeevan)

- Updated the `Beneficiary` entity to the simplified structure used by the team:
	- Replaced the previous detailed model with `user` (`Users`) and `application` (`Application`) associations and fields: `sanctionedAmount`, `disbursedAmount`, `benefitStatus`, `approvedDate`, `disbursedDate`, `remarks`.
- Updated `SchemeEligibilityRule` to use `RuleKey` and `ruleValue`.
- Added new enum `RuleKey` to standardize eligibility rule keys.
- Updated `DocumentType` enum values to match the project's expected document types.
- Added `AuditLog` entity and `AuditAction` enum to record audit events.

Branch used for these changes: `feature/update-beneficiary-entities` (committed and pushed).

This README section is a quick cross-check summary for team meetings; tell me if you'd like a formatted changelog or JIRA-style entries.
