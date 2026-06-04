# Implementation Plan - Issue #123: Configurable logRetentionDays

## Problem Analysis and Context
In `src/monitoredQueue.ts`, the Slack Lambda helper function `SlackListenerLambda` has a hardcoded `logRetention: 7` setting.
```typescript
    logRetention: 7,
```
Hardcoding this value limits flexibility for users who need shorter or longer log retention windows. We should allow this value to be configurable at the provider level.
Instead of using the shorthand `logRetention` option, we will instantiate an explicit `LogGroup` construct from the `aws-cdk-lib/aws-logs` package, allowing complete control over the retention period. We will expose `logRetentionDays` in the `SlackProvider` constructor, defaulting to `RetentionDays.ONE_WEEK` if not specified.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts` (or `src/providers/slack.ts`)

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts` / `src/providers/slack.ts`:
Expose `logRetentionDays` in the `SlackProvider` properties and constructor:
```typescript
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;
  readonly logRetentionDays?: RetentionDays;

  constructor(
    slackToken: string,
    slackChannel: string,
    name: string,
    logRetentionDays?: RetentionDays,
  ) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
    this.logRetentionDays = logRetentionDays;
  }
  
  // ...
}
```

Update `addSlackNotificationDestination` / `deploySharedSlackProvider` to create an explicit LogGroup:
```typescript
function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
  logRetentionDays?: RetentionDays,
) {
  const logRetention = logRetentionDays || RetentionDays.ONE_WEEK;
  
  const logGroup = new LogGroup(scope, 'SlackListenerLogGroup' + name, {
    retention: logRetention,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const slackListener = new Function(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logGroup,
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

## Step-by-Step Implementation Guide
1. Import `LogGroup` and `RetentionDays` from `aws-cdk-lib/aws-logs`.
2. Update the `SlackProvider` constructor signature and public properties to accept `logRetentionDays?: RetentionDays`.
3. In `deploySharedSlackProvider` or `addSlackNotificationDestination`, extract the requested retention days (falling back to `RetentionDays.ONE_WEEK`).
4. Create a new `LogGroup` construct and associate it with the `Function` using the `logGroup` property.
5. In `test/monitoredQueue.test.ts`, write a test validating that specifying a custom log retention (e.g., `RetentionDays.ONE_MONTH`) correctly synthesizes the corresponding CloudWatch LogGroup resource with `RetentionInDays: 30`.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile changes.
2. **Unit Tests**: Run `npm test` or `yarn test` to verify the log retention configuration generates the correct log group properties in CloudFormation.
