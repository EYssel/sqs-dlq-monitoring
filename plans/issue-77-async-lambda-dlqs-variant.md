# Implementation Plan - Issue #77: Async Lambda DLQs variant

## Problem Analysis and Context
Currently, `MonitoredQueue` creates both a main queue and a Dead-Letter Queue (DLQ) together. This model is restrictive and doesn't support cases where users want to monitor an *existing* queue (e.g., a DLQ configured for an asynchronous Lambda function or Lambda On-Failure Destination).
To decouple queue creation from DLQ monitoring, we should:
1. Extract the CloudWatch Alarm, SNS Topic, and Messaging Providers configuration logic into a new, reusable construct: `MonitoredDLQ`. This new construct will accept an existing `IQueue` instead of creating one.
2. Refactor `MonitoredQueue` to compose or extend `MonitoredDLQ` internally. This preserves 100% backward compatibility for all existing construct properties, while giving new callers the flexibility to monitor any arbitrary queue (including Lambda DLQs).

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`
- `src/index.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts`:
Define `IMonitoredDLQProps` and `MonitoredDLQ` class:
```typescript
import { IQueue } from 'aws-cdk-lib/aws-sqs';

export interface IMonitoredDLQProps {
  /**
   * The SQS Queue to monitor.
   * @required
   */
  readonly deadLetterQueue: IQueue;
  readonly messageThreshold?: number;
  readonly evaluationThreshold?: number;
  readonly messagingProviders?: IMessagingProvider[];
  readonly alarmProps?: AlarmProps;
  readonly topic?: Topic;
  readonly topicProps?: TopicProps;
}

export class MonitoredDLQ extends Construct {
  public readonly deadLetterQueue: IQueue;
  public readonly topic: Topic;
  public readonly alarm: Alarm;

  constructor(scope: Construct, id: string, props: IMonitoredDLQProps) {
    super(scope, id);
    this.deadLetterQueue = props.deadLetterQueue;

    const alarm = new Alarm(this, 'DLQ-Alarm', {
      alarmName: `${this.deadLetterQueue.queueName}-alarm`,
      metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
      threshold: props.messageThreshold || 5,
      evaluationPeriods: props.evaluationThreshold || 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      ...props.alarmProps,
    });
    this.alarm = alarm;

    const topic = props.topic || new Topic(this, 'Topic', props.topicProps || {
      topicName: `${this.deadLetterQueue.queueName}-alarm-topic`,
    });
    this.topic = topic;

    const snsAction = new SnsAction(topic);
    alarm.addAlarmAction(snsAction);
    alarm.addOkAction(snsAction);

    for (const messageProvider of props.messagingProviders || []) {
      messageProvider.deployProvider(this, topic);
    }
  }
}
```

Refactor `MonitoredQueue` to wrap `MonitoredDLQ`:
```typescript
export class MonitoredQueue extends Construct {
  public readonly queue: Queue;
  public readonly deadLetterQueue: DeadLetterQueue;
  public readonly monitor: MonitoredDLQ;

  constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
    super(scope, id);

    const deadLetterQueue = props.queueProps.deadLetterQueue || {
      queue: new Queue(this, 'DeadLetterQueue', props.dlqProps || {
        queueName: `${props.queueProps.queueName}-dlq`,
      }),
      maxReceiveCount: props.maxReceiveCount || 3,
    };
    this.deadLetterQueue = deadLetterQueue;

    this.queue = new Queue(this, 'Queue', {
      ...props.queueProps,
      deadLetterQueue,
    });

    this.monitor = new MonitoredDLQ(this, 'Monitor', {
      deadLetterQueue: deadLetterQueue.queue,
      messageThreshold: props.messageThreshold,
      evaluationThreshold: props.evaluationThreshold,
      messagingProviders: props.messagingProviders,
      alarmProps: props.alarmProps,
      topic: props.topic,
      topicProps: props.topicProps,
    });
  }

  // Preserve getter properties for public API backward compatibility
  public get alarm(): Alarm { return this.monitor.alarm; }
  public get topic(): Topic { return this.monitor.topic; }
}
```

#### 2. In `src/index.ts`:
Export the new class and interfaces:
```typescript
export { MonitoredDLQ, IMonitoredDLQProps } from './monitoredQueue';
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts`.
2. Extract the CloudWatch Alarm, SNS Topic, and messaging provider loop configuration into the new `MonitoredDLQ` class.
3. Update `MonitoredQueue` to inherit/instantiate `MonitoredDLQ` and redirect the public getters for `alarm` and `topic` to it.
4. Export the new construct in `src/index.ts`.
5. Add unit tests inside `test/monitoredQueue.test.ts` that verify instantiating `MonitoredDLQ` on an existing queue successfully attaches alarms and configurations without creating a secondary SQS Queue.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to ensure there are no syntax or type checking failures.
2. **Unit Tests**: Run `npm test` or `yarn test` to confirm that the existing test cases continue to pass, verifying backwards compatibility.
