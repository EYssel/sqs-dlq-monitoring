# Implementation Plan - Issue #62: Support Custom Lambda Handler and Custom Lambda properties

## Problem Analysis and Context
In `src/monitoredQueue.ts`, the construct creates the internal Lambda function helper (`SlackListenerLambda`) using hardcoded properties like timeouts, VPCs, memory limits, etc. Users might need to customize these properties (e.g. running the Lambda in a custom VPC or setting a custom Timeout).
Additionally, users might want to completely bypass the internal lambda and supply an existing Lambda function instead.
To support both scenarios:
1. Expose optional `lambdaProps?: Partial<FunctionProps>` on the `SlackProvider` constructor. These parameters are spread and merged during function instantiation.
2. Implement a new class `LambdaProvider` that implements `IMessagingProvider` and accepts an existing `IFunction`. This gives users the option to supply their own pre-configured handler functions.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`
- `src/index.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts` (`SlackProvider` definition):
Add `lambdaProps` to the `SlackProvider` parameters:
```typescript
import { FunctionProps } from 'aws-cdk-lib/aws-lambda';

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;
  readonly lambdaProps?: Partial<FunctionProps>;

  constructor(
    slackToken: string,
    slackChannel: string,
    name: string,
    lambdaProps?: Partial<FunctionProps>,
  ) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
    this.lambdaProps = lambdaProps;
  }
  
  // ...
}
```

Merge the props when instantiating the Lambda:
```typescript
  const slackListener = new Function(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logRetention: 7,
    ...lambdaProps, // Merge user-provided overrides last
  });
```

#### 2. In `src/monitoredQueue.ts` (Implement `LambdaProvider`):
Create the `LambdaProvider` class to link existing lambda functions:
```typescript
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LambdaAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export class LambdaProvider implements IMessagingProvider {
  readonly lambdaFunction: IFunction;

  constructor(lambdaFunction: IFunction) {
    this.lambdaFunction = lambdaFunction;
  }

  deployProvider(scope: Construct, topic: Topic): void {
    if (scope instanceof MonitoredQueue) {
      scope.alarm.addAlarmAction(new LambdaAction(this.lambdaFunction));
      scope.alarm.addOkAction(new LambdaAction(this.lambdaFunction));
    } else {
      topic.addSubscription(new LambdaSubscription(this.lambdaFunction));
    }
  }
}
```

#### 3. In `src/index.ts`:
Export `LambdaProvider`:
```typescript
export { LambdaProvider } from './monitoredQueue';
```

## Step-by-Step Implementation Guide
1. Import `FunctionProps`, `IFunction` from `aws-cdk-lib/aws-lambda` and `LambdaAction` from `aws-cdk-lib/aws-cloudwatch-actions`.
2. Modify the `SlackProvider` class to add the optional `lambdaProps` parameter.
3. Update the Lambda construct creation inside `addSlackNotificationDestination` (or `deploySharedSlackProvider`) to use object spreading to apply `lambdaProps`.
4. Create the `LambdaProvider` class implementing `IMessagingProvider`.
5. Export `LambdaProvider` in `src/index.ts`.
6. Add unit tests in `test/monitoredQueue.test.ts` that verify:
   - Configuring custom `lambdaProps` (like `timeout: Duration.minutes(5)`) applies it correctly.
   - Configuring `LambdaProvider` with an existing lambda successfully links it to the CloudWatch alarm actions.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile.
2. **Unit Tests**: Run `npm test` and verify that the custom timeout and memory allocations are present in the synthesized Lambda CloudFormation resource properties.
