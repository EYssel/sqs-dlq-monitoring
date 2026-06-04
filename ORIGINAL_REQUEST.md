# Original User Request

## Initial Request — 2026-06-04T12:52:10Z

Create detailed implementation plans for all active GitHub issues of the `sqs-dlq-monitoring` project, prioritizing bugs first, to prepare them for sequential implementation.

Working directory: /home/estian/personal/sqs-dlq-monitoring
Integrity mode: development

## Active GitHub Issues to Plan

Here is the list of active GitHub issues that need planning:

1. **Issue #125 (Bug)**: `alarmProps override drops all defaults including TreatMissingData`
   - *Problem*: Passing custom `alarmProps` replaces defaults (TreatMissingData, metric) rather than merging them.
   - *Solution*: Merge user props with defaults.

2. **Issue #127 (Refactor)**: `Split monitoredQueue.ts into separate files as providers grow`
   - *Problem*: All construct code, interfaces, helper functions, and provider classes are in `monitoredQueue.ts`.
   - *Solution*: Move to `src/providers/` directory structure.

3. **Issue #126 (Enhancement)**: `Deduplicate Lambda functions when multiple SlackProviders are used`
   - *Problem*: Each `SlackProvider` deploys its own copy of the listener Lambda.
   - *Solution*: Reuse a single Lambda function across multiple Slack providers (see also #81).

4. **Issue #124 (Documentation)**: `Document default removalPolicy behaviour on DLQ`
   - *Problem*: Default DLQ `removalPolicy` is `RETAIN` but it is undocumented.
   - *Solution*: Document this behavior and expose it as a top-level prop.

5. **Issue #123 (Enhancement)**: `Make logRetentionDays configurable instead of hardcoded to 7`
   - *Problem*: `logRetention: 7` is hardcoded on the Slack listener Lambda.
   - *Solution*: Expose an optional `logRetentionDays` prop and default to `RetentionDays.ONE_WEEK`. Use explicit `LogGroup` instead of shorthand.

6. **Issue #122 (Enhancement)**: `Replace Code.fromAsset with NodejsFunction for Lambda bundling`
   - *Problem*: Lambda bundling uses `Code.fromAsset` with pre-compiled paths.
   - *Solution*: Migrate to `NodejsFunction` for automatic esbuild bundling.

7. **Issue #100**: `Add Integration Tests based on aws-cdk standard`
   - *Problem*: Need standard integration tests per aws-cdk guidelines.

8. **Issue #92 (Enhancement)**: `Consider usage of cdk-nag`
   - *Problem*: Production quality/compliance auditing needed.

9. **Issue #91 (Enhancement)**: `Consider supporting (Slack) notifications via AWS ChatBot`
   - *Problem*: Standard Slack notifications require custom Lambdas; AWS ChatBot can natively support them.

10. **Issue #81 (Enhancement)**: `Combine multiple of the same provider into a single Lambda function`
    - *Problem*: (Duplicate/related to #126).

11. **Issue #78 (Doc/Enhancement)**: `Investigate auto generating documentation`

12. **Issue #77 (Enhancement)**: `Add a variant for Async Lambda DLQs`

13. **Issue #62 (Enhancement - Low Prio)**: `Custom Lambda Handler`

14. **Issue #57 (Enhancement)**: `Use direct Lambda invocation`
    - *Problem/Feature*: Invoke Lambda directly from CloudWatch alarm without SNS.

15. **Issue #26 (Enhancement)**: `Investigate integrating Slack CLI into CDK implementation`

16. **Issue #20 (Enhancement)**: `Add Google Chat Integration`

17. **Issue #17 (Enhancement)**: `Add custom notification text`

18. **Issue #8 (Enhancement)**: `Add Teams Integration`

## Requirements

### R1. Issue Categorization and Priority
Categorize all open GitHub issues. Prioritize the bugs first (specifically Issue #125), followed by enhancements and documentation issues.

### R2. Structured Implementation Plans
Create a separate markdown file for each issue inside a `plans/` directory in the repository root. Each plan must detail:
- Problem analysis and context
- Proposed implementation details (files to change, code changes/diffs)
- Step-by-step implementation guide
- Verification plan (how to verify the change)

### R3. Maintainability and Correctness
Ensure the plans align with AWS CDK best practices and the existing codebase structure (e.g., using TypeScript/JSII patterns, handling defaults correctly).

## Acceptance Criteria

### Planning Output
- [ ] A plan exists for every active GitHub issue (18 in total, including #125, #126, #127, etc.).
- [ ] Each plan is in its own markdown file under `plans/` named `issue-<number>-<slug>.md`.
- [ ] The plans are prioritized and linked in a central `plans/README.md` index file.
- [ ] Each plan contains a concrete verification strategy (e.g. CDK synth, unit tests, integration tests).

## Follow-up — 2026-06-04T11:08:36Z

Implement the fixes for the top 3 issues (Issue #125, Issue #100, and Issue #92) based on the generated planning documents, and create a separate GitHub Pull Request (PR) for each fix.

Working directory: /home/estian/personal/sqs-dlq-monitoring
Integrity mode: development

## Requirements

### R1. Implement Fixes from Planning Documents
Follow the generated planning documents to implement each fix:
- **Issue #125**: Merge `alarmProps` rather than overwriting defaults. See [issue-125-alarmprops-override-drops-defaults.md](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-125-alarmprops-override-drops-defaults.md).
- **Issue #100**: Add integration tests using `@aws-cdk/integ-tests-alpha` and `integ-runner`. See [issue-100-aws-cdk-standard-integration-tests.md](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-100-aws-cdk-standard-integration-tests.md).
- **Issue #92**: Enforce SSL on queues and configure `cdk-nag` rules/suppressions. See [issue-92-usage-of-cdk-nag.md](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-92-usage-of-cdk-nag.md).

### R2. Code Quality and Testing
Build the project (`npx projen build`) and ensure all unit tests and new integration tests pass successfully without compiler errors.

### R3. Create Separate Pull Requests
For each issue, create a new branch from `master`, commit the changes, push to GitHub, and open a Pull Request using the `gh` CLI.

## Acceptance Criteria

### PR Creation
- [ ] Three separate PRs are open on GitHub (one for each of #125, #100, #92).
- [ ] Each PR is linked to its respective GitHub issue.
- [ ] Each branch compiles and tests successfully before pushing.

## Follow-up — 2026-06-04T11:44:59Z

Implement the fixes for issues #125, #100, and #92 in the `sqs-dlq-monitoring` project, verify the build and tests, and create separate GitHub Pull Requests (PRs) for each issue.

Working directory: /home/estian/personal/sqs-dlq-monitoring
Integrity mode: benchmark

## Requirements

### R1. Milestone 1: Issue #125 (alarmProps merge)
Modify `src/monitoredQueue.ts` to merge custom `alarmProps` with the default properties instead of replacing them. Add a unit test in `test/monitoredQueue.test.ts` to verify that custom properties are applied while non-overridden default properties (e.g., `TreatMissingData`, `evaluationPeriods`) are retained.

### R2. Milestone 2: Issue #100 (Integration tests)
Incorporate the standard CDK integration testing framework using `@aws-cdk/integ-tests-alpha` and `@aws-cdk/integ-runner`. Add an integration test `test/integ.monitored-queue.ts` that synthesizes and verifies the construct.

### R3. Milestone 3: Issue #92 (SSL enforcement & cdk-nag)
Enforce SSL (`enforceSSL: true`) on all created SQS queues (main and DLQ) within the construct. Introduce `cdk-nag` and enforce compliance with the `AwsSolutionsChecks` ruleset. Suppress acceptable violations (like SNS topic encryption and standard Lambda IAM wildcard permissions) using `NagSuppressions`. Add cdk-nag assertions to unit tests.

### R4. Pull Request Creation
For each issue, create a new branch from `master`, commit the changes, push to GitHub, and open a Pull Request using the `gh` CLI, linking each PR to its corresponding issue.

## Verification Resources
The following planning documents in the codebase detail the context and step-by-step implementation details:
- [Issue #125 Plan](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-125-alarmprops-override-drops-defaults.md)
- [Issue #100 Plan](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-100-aws-cdk-standard-integration-tests.md)
- [Issue #92 Plan](file:///home/estian/personal/sqs-dlq-monitoring/plans/issue-92-usage-of-cdk-nag.md)

## Acceptance Criteria

### Correctness & Tests
- [ ] The codebase builds successfully with `npx projen build`.
- [ ] All unit tests pass, including the new unit tests for `alarmProps` merging and `cdk-nag` compliance.
- [ ] Integration tests are successfully set up and the initial snapshot under `test/integ.monitored-queue.js.snapshot/` is generated.
- [ ] Running `yarn integ --dry-run` compiles and synthesizes the integration tests successfully without errors.

### GitHub Pull Requests
- [ ] Three separate Pull Requests are open on GitHub (for issues #125, #100, and #92).
- [ ] Each PR description links back to its respective GitHub issue.
- [ ] Each branch compiles and passes all checks.
