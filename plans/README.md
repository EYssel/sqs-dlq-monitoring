# Central Planning Index

This planning project documents the detailed implementation plans for all 18 active GitHub issues in the `sqs-dlq-monitoring` repository. The implementation plans cover bug fixes, refactoring of source code organization, feature enhancements for alert routing and custom notification payloads, integration testing setup, compliance enforcement, and automated documentation generation.

Bugs (specifically Issue #125) are prioritized first, followed by high-priority enhancements (like integration tests and compliance verification checks), followed by medium-priority refactors and features, and finally documentation updates.

## Issue Plans Index

| Issue ID | Title | Category | Priority | Link |
| :--- | :--- | :--- | :--- | :--- |
| #125 | `alarmProps` override drops all defaults including `TreatMissingData` | Bug | High | [issue-125-alarmprops-override-drops-defaults.md](issue-125-alarmprops-override-drops-defaults.md) |
| #100 | Add Integration Tests based on aws-cdk standard | Enhancement | High | [issue-100-aws-cdk-standard-integration-tests.md](issue-100-aws-cdk-standard-integration-tests.md) |
| #92 | Consider usage of `cdk-nag` | Enhancement | High | [issue-92-usage-of-cdk-nag.md](issue-92-usage-of-cdk-nag.md) |
| #127 | Split `monitoredQueue.ts` into separate files as providers grow | Refactor | Medium | [issue-127-split-monitoredqueue-into-separate-files.md](issue-127-split-monitoredqueue-into-separate-files.md) |
| #122 | Replace `Code.fromAsset` with `NodejsFunction` for Lambda bundling | Enhancement | Medium | [issue-122-nodejsfunction-lambda-bundling.md](issue-122-nodejsfunction-lambda-bundling.md) |
| #123 | Configurable `logRetentionDays` | Enhancement | Medium | [issue-123-configurable-logretentiondays.md](issue-123-configurable-logretentiondays.md) |
| #126 | Deduplicate Lambdas / Slack Providers | Refactor | Medium | [issue-126-deduplicate-lambdas-slack-providers.md](issue-126-deduplicate-lambdas-slack-providers.md) |
| #81 | Combine Providers to Single Lambda | Refactor | Medium | [issue-81-combine-providers-single-lambda.md](issue-81-combine-providers-single-lambda.md) |
| #57 | Direct Lambda Invocation from CloudWatch Alarm | Enhancement | Medium | [issue-57-direct-lambda-invocation.md](issue-57-direct-lambda-invocation.md) |
| #62 | Support Custom Lambda Handler and Custom Lambda properties | Enhancement | Medium | [issue-62-custom-lambda-handler.md](issue-62-custom-lambda-handler.md) |
| #17 | Custom notification text | Enhancement | Medium | [issue-17-custom-notification-text.md](issue-17-custom-notification-text.md) |
| #91 | Slack Notifications via AWS Chatbot | Enhancement | Medium | [issue-91-slack-notifications-via-chatbot.md](issue-91-slack-notifications-via-chatbot.md) |
| #8 | Microsoft Teams Integration | Enhancement | Medium | [issue-8-teams-integration.md](issue-8-teams-integration.md) |
| #20 | Google Chat Integration | Enhancement | Medium | [issue-20-google-chat-integration.md](issue-20-google-chat-integration.md) |
| #77 | Async Lambda DLQs variant | Enhancement | Medium | [issue-77-async-lambda-dlqs-variant.md](issue-77-async-lambda-dlqs-variant.md) |
| #124 | Document default `removalPolicy` on DLQ | Documentation | Low | [issue-124-document-default-removalpolicy-dlq.md](issue-124-document-default-removalpolicy-dlq.md) |
| #78 | Investigate Auto-Generating Documentation | Documentation | Low | [issue-78-auto-generate-documentation.md](issue-78-auto-generate-documentation.md) |
| #26 | Slack CLI integration | Enhancement | Low | [issue-26-slack-cli-integration.md](issue-26-slack-cli-integration.md) |
