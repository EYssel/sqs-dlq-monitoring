# Implementation Plan - Issue #124: Document default removalPolicy on DLQ

## Problem Analysis and Context
In `src/monitoredQueue.ts`, the construct creates a Dead-Letter Queue (DLQ) if the user does not supply one. Currently, no `removalPolicy` is explicitly set on this DLQ, meaning CDK will default to `RemovalPolicy.RETAIN`.
To make the construct more robust and customizable, we should:
1. Allow the user to specify a top-level `removalPolicy?: RemovalPolicy` in `IMonitoredQueueProps` to easily configure it for both the main queue and the DLQ.
2. Explicitly default the DLQ `removalPolicy` to `RemovalPolicy.RETAIN` if not provided, ensuring data persistence.
3. Document this behavior in the code comments so that users are aware of the default behavior.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts` (`IMonitoredQueueProps` interface):
Add the `removalPolicy` property and its docstrings:
```typescript
export interface IMonitoredQueueProps {
  // ...
  /**
   * The removal policy for the Dead-Letter Queue (DLQ) and the main queue.
   * By default, this is set to RemovalPolicy.RETAIN.
   * @default RemovalPolicy.RETAIN
   * @optional
   */
  readonly removalPolicy?: RemovalPolicy;
}
```

#### 2. In `src/monitoredQueue.ts` (`MonitoredQueue` constructor):
Pass the `removalPolicy` to the DLQ:
```typescript
    const deadLetterQueue = props.queueProps.deadLetterQueue || {
      queue: new Queue(
        this,
        'DeadLetterQueue',
        {
          removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN,
          queueName: `${props.queueProps.queueName}-dlq`,
          ...props.dlqProps,
        },
      ),
      maxReceiveCount: props.maxReceiveCount || 3,
    };
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts`.
2. Import `RemovalPolicy` from `aws-cdk-lib` at the top of the file.
3. Add the `removalPolicy` field to `IMonitoredQueueProps` with descriptive JSDoc comments explaining that the default is `RemovalPolicy.RETAIN`.
4. Update the fallback `DeadLetterQueue` creation logic to set `removalPolicy` default, while allowing overrides in `props.dlqProps` or the new top-level `removalPolicy`.
5. Add a unit test in `test/monitoredQueue.test.ts` to assert that the generated CloudFormation template specifies `UpdateReplacePolicy` and `DeletionPolicy` corresponding to custom configurations (e.g. `RemovalPolicy.DESTROY`).

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to verify TypeScript compilation succeeds.
2. **Unit Tests**:
   - Write a unit test asserting:
     ```typescript
     template.hasResource('AWS::SQS::Queue', {
       UpdateReplacePolicy: 'Delete',
       DeletionPolicy: 'Delete',
     });
     ```
   - Run `yarn test` to verify everything works.
