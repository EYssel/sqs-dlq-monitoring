# Project: SQS DLQ Monitoring Planning

## Architecture
The `sqs-dlq-monitoring` project is an AWS CDK construct library written in TypeScript. 
It provides a `MonitoredQueue` construct which:
- Deploys an SQS Queue and its associated Dead Letter Queue (DLQ).
- Configures a CloudWatch Alarm on the DLQ to monitor the approximate number of visible messages.
- Sets up an SNS Topic for alarm notifications.
- Deploys Lambda-based or Email-based notification destinations (e.g., `SlackProvider`, `EmailProvider`).

Key files in scope:
- `src/monitoredQueue.ts`: Main construct, interfaces, and providers.
- `src/lambda/slackListener/index.ts`: Lambda handler sending Slack notifications.
- `src/lambda/alarmMessage.ts`: Formatting and helpers for alarm messages.
- `test/monitoredQueue.test.ts`: Unit tests using Jest.
- `.projenrc.ts`: Projen configuration.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Milestone 1: Bugs & Core Refactoring | Issues #125, #127, #122 | None | PLANNED |
| 2 | Milestone 2: SQS/DLQ & Listener Lambda | Issues #124, #123, #126, #81, #57, #62, #17 | M1 | PLANNED |
| 3 | Milestone 3: Integrations & Notifications | Issues #91, #8, #20, #26, #77 | M1 | PLANNED |
| 4 | Milestone 4: Testing & Docs Infrastructure | Issues #100, #92, #78 | M1 | PLANNED |

## Interface Contracts
- All plans are output as markdown files under `/home/estian/personal/sqs-dlq-monitoring/plans/` using the naming format `issue-<number>-<slug>.md`.
- A central `/home/estian/personal/sqs-dlq-monitoring/plans/README.md` index file links to all the plans, prioritized (Milestone 1 first).
- Every plan file must include:
  1. Problem analysis and context
  2. Proposed implementation details (files to change, code changes/diffs)
  3. Step-by-step implementation guide
  4. Verification plan (how to verify the change)
