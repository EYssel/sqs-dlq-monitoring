# Implementation Plan - Issue #127: Split monitoredQueue.ts into separate files as providers grow

## Problem Analysis and Context
The project contains all core constructs, helper functions, and providers (e.g. `SlackProvider`, `EmailProvider`) inside `src/monitoredQueue.ts`. As more notification providers are added (such as Microsoft Teams or Google Chat), keeping all definitions in a single file will make maintenance complex.
We need to split `monitoredQueue.ts` into a modular structure:
- `src/interfaces.ts`: Shareable props and interface definitions.
- `src/providers/email.ts` and `src/providers/slack.ts`: Cleanly isolated provider classes.
- `src/providers/index.ts`: Re-export all providers.
- `src/index.ts`: Unified entry point to maintain backward compatibility.

## Proposed Implementation Details

### Target Directory Layout
```
src/
├── index.ts
├── monitoredQueue.ts
├── interfaces.ts
├── providers/
│   ├── index.ts
│   ├── email.ts
│   └── slack.ts
```

### Code Changes / Diffs

#### 1. `src/interfaces.ts` (New File)
```typescript
import { AlarmProps } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface IMessagingProvider {
  deployProvider(scope: Construct, topic: Topic): void;
}

export interface IMonitoredQueueProps {
  readonly queueProps: QueueProps;
  readonly maxReceiveCount?: number;
  readonly messageThreshold?: number;
  readonly evaluationThreshold?: number;
  readonly messagingProviders?: IMessagingProvider[];
  readonly dlqProps?: QueueProps;
  readonly alarmProps?: AlarmProps;
  readonly topic?: Topic;
  readonly topicProps?: TopicProps;
}
```

#### 2. `src/providers/email.ts` (New File)
```typescript
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from '../interfaces';

export class EmailProvider implements IMessagingProvider {
  readonly emails: string[];

  constructor(emails: string[]) {
    this.emails = emails;
  }

  deployProvider(_scope: Construct, topic: Topic): void {
    addEmailNotificationDestination(topic, this.emails);
  }
}

function addEmailNotificationDestination(topic: Topic, emails: string[]) {
  for (const email of emails) {
    topic.addSubscription(new EmailSubscription(email));
  }
}
```

#### 3. `src/providers/slack.ts` (New File)
```typescript
import * as path from 'path';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from '../interfaces';

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;

  constructor(slackToken: string, slackChannel: string, name: string) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
  }

  deployProvider(scope: Construct, topic: Topic) {
    addSlackNotificationDestination(
      scope,
      topic,
      this.slackToken,
      this.slackChannel,
      this.name,
    );
  }
}

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
) {
  const slackListener = new Function(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logRetention: 7,
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

#### 4. `src/providers/index.ts` (New File)
```typescript
export * from './email';
export * from './slack';
```

#### 5. `src/monitoredQueue.ts` (Cleaned File)
```typescript
import { Alarm, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { DeadLetterQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { IMonitoredQueueProps } from './interfaces';

export class MonitoredQueue extends Construct {
  public readonly queue: Queue;
  public readonly deadLetterQueue: DeadLetterQueue;
  public readonly topic: Topic;
  public readonly alarm: Alarm;

  constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
    super(scope, id);

    const deadLetterQueue = props.queueProps.deadLetterQueue || {
      queue: new Queue(
        this,
        'DeadLetterQueue',
        props.dlqProps || {
          queueName: `${props.queueProps.queueName}-dlq`,
        },
      ),
      maxReceiveCount: props.maxReceiveCount || 3,
    };

    this.deadLetterQueue = deadLetterQueue;

    const queue = new Queue(this, 'Queue', {
      ...props.queueProps,
      deadLetterQueue,
    });

    this.queue = queue;

    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric: deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        ...props.alarmProps,
      },
    );

    this.alarm = alarm;

    const topic =
      props.topic ||
      new Topic(
        this,
        'Topic',
        props.topicProps || {
          topicName: `${deadLetterQueue.queue.queueName}-alarm-topic`,
        },
      );

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

#### 6. `src/index.ts` (Modified File)
```typescript
export { IMonitoredQueueProps, IMessagingProvider } from './interfaces';
export { EmailProvider, SlackProvider } from './providers';
export { MonitoredQueue } from './monitoredQueue';
```

## Step-by-Step Implementation Guide
1. Create the file `src/interfaces.ts` and declare interfaces.
2. Create `src/providers/email.ts` and `src/providers/slack.ts` files, moving class declarations and respective helper functions. Note the adjusted path in `Code.fromAsset(path.join(__dirname, '../lambda/slackListener'))`.
3. Create `src/providers/index.ts` exporting email and slack providers.
4. Clean up `src/monitoredQueue.ts` removing the providers, and importing `IMonitoredQueueProps` from `./interfaces`.
5. Edit `src/index.ts` to export everything.
6. Run `test/monitoredQueue.test.ts` imports check, changing imports from `../src/monitoredQueue` to `../src/index`.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile all TypeScript modules.
2. **Unit Tests**: Run `npm test` or `yarn test` to make sure imports work correctly and snapshot matching passes.
