# Implementation Plan - Issue #81: Combine Providers to Single Lambda

## Problem Analysis and Context
This issue is a duplicate/related issue of **Issue #126**. When a user adds multiple Slack messaging providers to monitor their Dead-Letter Queue (DLQ), the construct compiles and deploys multiple instances of the same Slack Listener Lambda function. This wastes AWS resource quotas and deployment time.
By combining all configured Slack providers into a single environment configuration variable (`SLACK_PROVIDERS`) represented as a JSON array of token/channel mappings, we can deploy exactly one shared Lambda function helper inside the construct stack to process notifications for all Slack providers in parallel.

## Proposed Implementation Details
Please refer to the technical design and changes documented in [plans/issue-126-deduplicate-lambdas-slack-providers.md](issue-126-deduplicate-lambdas-slack-providers.md).

### Summary of Changes:
1. **Deduplication Logic in SQS DLQ Monitoring Construct**:
   Filter out all `SlackProvider` instances from `props.messagingProviders` and deploy a single combined function:
   ```typescript
   const slackProviders = (props.messagingProviders || []).filter(
     (p): p is SlackProvider => p instanceof SlackProvider
   );

   if (slackProviders.length > 0) {
     deploySharedSlackProvider(this, alarm, slackProviders);
   }
   ```
2. **Configure environment variable mapping**:
   Stringify the array of providers into `SLACK_PROVIDERS` configuration:
   ```typescript
   environment: {
     SLACK_PROVIDERS: Stack.of(scope).toJsonString(providersConfig),
   }
   ```
3. **Loop execution inside the lambda handler**:
   Map across the parsed `SLACK_PROVIDERS` inside `src/lambda/slackListener/index.ts` and send posts concurrently using `Promise.all`.

## Step-by-Step Implementation Guide
1. Review [plans/issue-126-deduplicate-lambdas-slack-providers.md](issue-126-deduplicate-lambdas-slack-providers.md) for files and code details.
2. Implement deduplication logic inside `src/monitoredQueue.ts` / `src/providers/slack.ts`.
3. Update the Lambda listener handler in `src/lambda/slackListener/index.ts` to execute multiple alerts.
4. Update unit tests in `test/monitoredQueue.test.ts` to assert that multiple Slack providers yield exactly one Lambda resource in synthesis.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile`.
2. **Unit Tests**: Run `npm test` and assert that the CloudFormation template contains exactly one `AWS::Lambda::Function` resource for Slack notifications.
