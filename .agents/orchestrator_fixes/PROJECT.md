# Project: SQS DLQ Monitoring Fixes
# Scope: All milestones

## Architecture
- MonitoredQueue construct in `src/monitoredQueue.ts` manages an SQS queue, dead letter queue, SNS topic, and Slack alarm notifications.
- Dependencies: `@aws-cdk/integ-tests-alpha`, `@aws-cdk/integ-runner`, `cdk-nag`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Issue-125 | Merge `alarmProps` rather than overwriting defaults in `src/monitoredQueue.ts` | None | IN_PROGRESS |
| 2 | Issue-100 | Add standard CDK integration tests using `integ-runner` | Issue-125 | PLANNED |
| 3 | Issue-92  | Enforce SSL on queues and configure `cdk-nag` rules/suppressions | Issue-100 | PLANNED |

## Interface Contracts
### MonitoredQueueProps ↔ cdk.aws_sqs.QueueProps
- `alarmProps` is merged with defaults instead of replacing them.
- All created SQS queues (both main and DLQ) must have `enforceSSL: true`.
