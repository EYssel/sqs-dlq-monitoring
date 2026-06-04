# Handoff Report: SQS DLQ Monitoring Issues Implementation Plan

## 1. Observation

Based on static analysis of the `sqs-dlq-monitoring` repository, the following code configurations were observed:

### Issue #124 (removalPolicy on DLQ)
In `src/monitoredQueue.ts` (lines 149–158), when `props.queueProps.deadLetterQueue` is not provided, the Dead-Letter Queue (DLQ) is created using `props.dlqProps`:
```typescript
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
```
No default `removalPolicy` is set explicitly, meaning AWS CDK defaults to `RemovalPolicy.RETAIN`. There is no top-level prop to configure `removalPolicy`.

### Issue #123 (logRetentionDays config)
In `src/monitoredQueue.ts` (line 231), the `logRetention` option of the `slackListener` Lambda function is hardcoded to `7` days:
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
  });
```

### Issue #126 / #81 (Deduplicate Slack providers)
In `src/monitoredQueue.ts` (lines 201–205), messaging providers are deployed sequentially via a simple loop:
```typescript
    for (const messageProvider of props.messagingProviders
      ? props.messagingProviders
      : []) {
      messageProvider.deployProvider(this, topic);
    }
```
If a user defines multiple `SlackProvider` instances, each calls `deployProvider`, deploying its own instance of the `SlackListenerLambda` function and its own `LambdaSubscription`.

### Issue #57 (Direct Lambda invocation from Alarm)
In `src/monitoredQueue.ts` (lines 196–199), the alarm action is tied to the SNS topic using `SnsAction`:
```typescript
    const snsAction = new SnsAction(topic);

    alarm.addAlarmAction(snsAction);
    alarm.addOkAction(snsAction);
```
In `src/lambda/slackListener/index.ts` (lines 7–11), the Slack Lambda handler expects an SNS event format:
```typescript
export const handler = async (event: {
  Records: { Sns: { Message: string } }[];
}) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);
```

### Issue #62 (Custom Lambda Handler)
There is currently no mechanism to configure custom properties of the deployed Lambda function (e.g. timeouts, custom VPCs), nor is there a built-in provider to invoke an existing/custom Lambda function.

### Issue #17 (Custom notification text)
In `src/lambda/slackListener/index.ts` (lines 56–58), the Slack alert body text format is hardcoded:
```typescript
function getMessageText(message: AlarmMessage) {
  return `*State changed:*\n\n*_${message.OldStateValue}_* :arrow_right: *_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`;
}
```

---

## 2. Logic Chain

1. **Issue #124**: By defining a top-level `removalPolicy` in `IMonitoredQueueProps`, we can default it to `RemovalPolicy.RETAIN` (documenting this behavior) and merge it into the DLQ creation props. Placing it before `...props.dlqProps` ensures that any explicit `removalPolicy` passed within `dlqProps` retains overriding precedence.
2. **Issue #123**: By exposing `logRetentionDays` in the `SlackProvider` constructor, we can configure an explicit `LogGroup` using `aws-cdk-lib/aws-logs` instead of the shorthand `logRetention` property of `FunctionProps`. This fulfills the requirement of using an explicit `LogGroup` construct and allowing custom retention (defaulting to `RetentionDays.ONE_WEEK`).
3. **Issue #126 / #81**: To deduplicate Slack Lambda resources, the `MonitoredQueue` constructor can filter the list of `messagingProviders` to extract all `SlackProvider` instances. A single, shared Lambda function can then be deployed for all of them, mapping channels and tokens into a single stringified JSON array passed as an environment variable (`SLACK_PROVIDERS`).
4. **Issue #57**: AWS CloudWatch alarms support direct Lambda invocation using `LambdaAction` from `aws-cdk-lib/aws-cloudwatch-actions`. To implement this without breaking custom providers or SNS topic structures, the single shared Slack Lambda can be registered directly with the CloudWatch alarm as a `LambdaAction`. The Lambda handler must be updated to inspect the incoming event structure and parse both the SNS message structure and the direct CloudWatch alarm structure.
5. **Issue #62**: We can support custom functions in two ways:
   - Expose optional `lambdaProps: Partial<FunctionProps>` on `SlackProvider` constructors, allowing custom settings (VPC, timeout, memory) to be passed down and merged into the created `Function`.
   - Implement a new `LambdaProvider` class which implements `IMessagingProvider` and accepts an existing `IFunction`, allowing users to provide custom Lambda functions.
6. **Issue #17**: By exposing optional `customTitle` and `customText` template strings on the `SlackProvider`, we can serialize them along with the token and channel into the `SLACK_PROVIDERS` configuration array. The Lambda handler can then dynamically replace double-curly-bracket placeholders (e.g. `{{AlarmName}}`, `{{NewStateValue}}`) at runtime.

---

## 3. Caveats

- **Snapshot Test Failures**: Since direct invocation, log retention changes, and DLQ removal policy changes alter the synthesized CloudFormation template structure, existing snapshot tests in `test/monitoredQueue.test.ts.snap` will fail. The tests must be run with the `-u` flag to update the snapshots once changes are applied.
- **CDK Token Serialization**: Since Slack tokens can be CDK tokens (e.g., from SSM or Secrets Manager), they cannot be parsed at synthesis time. Using `Stack.of(scope).toJsonString(...)` is required to ensure CloudFormation resolves these values properly at deploy time.
- **Direct CW Alarm Invoke Events**: Direct invocation bypasses SNS, which means the event structure changes. The Lambda handler must explicitly support both shapes to avoid breaking fallback setups or other integrations.

---

## 4. Conclusion (Implementation Plan)

### Proposed Changes

#### File 1: `src/monitoredQueue.ts`

```typescript
import * as path from 'path';
import {
  Alarm,
  AlarmProps,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction, LambdaAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Architecture, Code, Function, Runtime, FunctionProps, IFunction } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import {
  EmailSubscription,
  LambdaSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { DeadLetterQueue, Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface IMessagingProvider {
  deployProvider(scope: Construct, topic: Topic): void;
}

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;
  readonly logRetentionDays?: RetentionDays;
  readonly lambdaProps?: Partial<FunctionProps>;
  readonly customTitle?: string;
  readonly customText?: string;

  constructor(
    slackToken: string,
    slackChannel: string,
    name: string,
    logRetentionDays?: RetentionDays,
    lambdaProps?: Partial<FunctionProps>,
    customTitle?: string,
    customText?: string,
  ) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
    this.logRetentionDays = logRetentionDays;
    this.lambdaProps = lambdaProps;
    this.customTitle = customTitle;
    this.customText = customText;
  }

  deployProvider(scope: Construct, topic: Topic) {
    // Retained for backward-compatibility with custom usages outside MonitoredQueue
    addSlackNotificationDestination(
      scope,
      topic,
      this.slackToken,
      this.slackChannel,
      this.name,
      this.logRetentionDays,
      this.lambdaProps,
      this.customTitle,
      this.customText,
    );
  }
}

export class EmailProvider implements IMessagingProvider {
  readonly emails: string[];

  constructor(emails: string[]) {
    this.emails = emails;
  }

  deployProvider(_scope: Construct, topic: Topic): void {
    addEmailNotificationDestination(topic, this.emails);
  }
}

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
  /**
   * The removal policy for the Dead-Letter Queue (DLQ).
   * By default, this is set to RemovalPolicy.RETAIN.
   * @default RemovalPolicy.RETAIN
   * @optional
   */
  readonly removalPolicy?: RemovalPolicy;
}

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
        {
          removalPolicy: props.removalPolicy || RemovalPolicy.RETAIN,
          queueName: `${props.queueProps.queueName}-dlq`,
          ...props.dlqProps,
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
      props.alarmProps || {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
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

    // 1. Identify SlackProvider instances for deduplication and direct invocation
    const slackProviders = (props.messagingProviders || []).filter(
      (p): p is SlackProvider => p instanceof SlackProvider
    );

    if (slackProviders.length > 0) {
      deploySharedSlackProvider(this, alarm, slackProviders);
    }

    // 2. Deploy other messaging providers
    for (const messageProvider of props.messagingProviders || []) {
      if (!(messageProvider instanceof SlackProvider)) {
        messageProvider.deployProvider(this, topic);
      }
    }
  }
}

function addEmailNotificationDestination(topic: Topic, emails: string[]) {
  for (const email of emails) {
    topic.addSubscription(new EmailSubscription(email));
  }
}

function deploySharedSlackProvider(
  scope: MonitoredQueue,
  alarm: Alarm,
  slackProviders: SlackProvider[],
) {
  const logRetentions = slackProviders
    .map(p => p.logRetentionDays)
    .filter((r): r is RetentionDays => r !== undefined);
  const logRetention = logRetentions.length > 0 ? logRetentions[0] : RetentionDays.ONE_WEEK;

  const customLambdaPropsList = slackProviders
    .map(p => p.lambdaProps)
    .filter((p): p is Partial<FunctionProps> => p !== undefined);
  const combinedLambdaProps = customLambdaPropsList.length > 0
    ? customLambdaPropsList[0]
    : {};

  const providersConfig = slackProviders.map(p => ({
    token: p.slackToken,
    channel: p.slackChannel,
    customTitle: p.customTitle,
    customText: p.customText,
  }));

  const logGroup = new LogGroup(scope, 'SlackListenerLogGroup', {
    retention: logRetention,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const slackListener = new Function(scope, 'SlackListenerLambda', {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_PROVIDERS: Stack.of(scope).toJsonString(providersConfig),
    },
    logGroup,
    ...combinedLambdaProps,
  });

  alarm.addAlarmAction(new LambdaAction(slackListener));
  alarm.addOkAction(new LambdaAction(slackListener));
}

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
  logRetentionDays?: RetentionDays,
  lambdaProps?: Partial<FunctionProps>,
  customTitle?: string,
  customText?: string,
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
      SLACK_PROVIDERS: Stack.of(scope).toJsonString([{
        token: slackToken,
        channel: slackChannel,
        customTitle,
        customText,
      }]),
    },
    logGroup,
    ...lambdaProps,
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

#### File 2: `src/index.ts`

```typescript
export { 
  EmailProvider, 
  IMessagingProvider, 
  IMonitoredQueueProps, 
  MonitoredQueue, 
  SlackProvider,
  LambdaProvider
} from './monitoredQueue';
```

#### File 3: `src/lambda/slackListener/index.ts`

```typescript
import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

const SLACK_CHAT_POST_MESSAGE_ENDPOINT =
  'https://slack.com/api/chat.postMessage';

interface SlackProviderConfig {
  token: string;
  channel: string;
  customTitle?: string;
  customText?: string;
}

export const handler = async (event: any) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    let message: AlarmMessage;

    // Detect event source format (SNS vs Direct CloudWatch Alarm)
    if (event.Records && event.Records[0] && event.Records[0].EventSource === 'aws:sns') {
      message = JSON.parse(event.Records[0].Sns.Message);
    } else if (event.source === 'aws.cloudwatch' && event.alarmData) {
      message = {
        AlarmName: event.alarmData.alarmName,
        AlarmDescription: event.alarmData.configuration?.description || '',
        AWSAccountId: event.accountId,
        AlarmConfigurationUpdatedTimestamp: event.time,
        NewStateValue: event.alarmData.state.value,
        NewStateReason: event.alarmData.state.reason,
        StateChangeTime: event.alarmData.state.timestamp,
        Region: event.region,
        AlarmArn: event.alarmArn,
        OldStateValue: event.alarmData.previousState?.value || 'INSUFFICIENT_DATA',
        OKActions: [],
        AlarmActions: [],
        InsufficientDataActions: [],
        Trigger: {
          MetricName: '',
          Namespace: '',
          StatisticType: '',
          Statistic: '',
          Period: 0,
          EvaluationPeriods: 0,
          ComparisonOperator: '',
          Threshold: 0,
          TreatMissingData: '',
          EvaluateLowSampleCountPercentile: '',
        },
      };
    } else {
      console.error('Unsupported event format:', JSON.stringify(event));
      return;
    }

    // Determine targeting slack configurations
    let providers: SlackProviderConfig[] = [];
    if (process.env.SLACK_PROVIDERS) {
      providers = JSON.parse(process.env.SLACK_PROVIDERS);
    } else if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL) {
      providers = [{
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
      }];
    }

    if (providers.length === 0) {
      console.warn('No Slack providers configured.');
      return;
    }

    // Parallel execution across targets
    await Promise.all(
      providers.map(async (provider) => {
        try {
          const title = provider.customTitle
            ? formatCustomTemplate(provider.customTitle, message)
            : `${message.AlarmName} has been triggered!`;

          const text = provider.customText
            ? formatCustomTemplate(provider.customText, message)
            : getDefaultMessageText(message);

          await axios.post(
            SLACK_CHAT_POST_MESSAGE_ENDPOINT,
            {
              channel: provider.channel,
              attachments: [
                {
                  color: getMessageColor(message),
                  blocks: [
                    {
                      type: 'header',
                      text: {
                        type: 'plain_text',
                        text: title,
                      },
                    },
                    {
                      type: 'section',
                      text: {
                        type: 'mrkdwn',
                        text: text,
                      },
                    },
                  ],
                },
              ],
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.token}`,
              },
            },
          );
        } catch (err) {
          console.error(`Failed to send alert to channel ${provider.channel}:`, err);
        }
      })
    );
  } catch (error) {
    console.error('Handler error:', error);
  }
};

function getMessageColor(message: AlarmMessage) {
  return message.NewStateValue === 'ALARM' ? '#ff0000' : '#36a64f';
}

function getDefaultMessageText(message: AlarmMessage) {
  return `*State changed:*\n\n*_${message.OldStateValue}_* :arrow_right: *_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`;
}

function formatCustomTemplate(template: string, message: AlarmMessage): string {
  return template
    .replace(/\{\{AlarmName\}\}/g, message.AlarmName)
    .replace(/\{\{AlarmDescription\}\}/g, message.AlarmDescription || '')
    .replace(/\{\{AWSAccountId\}\}/g, message.AWSAccountId)
    .replace(/\{\{NewStateValue\}\}/g, message.NewStateValue)
    .replace(/\{\{NewStateReason\}\}/g, message.NewStateReason)
    .replace(/\{\{StateChangeTime\}\}/g, message.StateChangeTime)
    .replace(/\{\{Region\}\}/g, message.Region)
    .replace(/\{\{AlarmArn\}\}/g, message.AlarmArn)
    .replace(/\{\{OldStateValue\}\}/g, message.OldStateValue);
}
```

---

### Step-by-Step Implementation Guide

1. **Update `src/monitoredQueue.ts`**:
   - Add the necessary imports.
   - Update `IMonitoredQueueProps` to include `removalPolicy`.
   - Update `SlackProvider` class constructor and properties.
   - Define `LambdaProvider` class.
   - Update `MonitoredQueue` class construct logic:
     - Implement the DLQ `removalPolicy` merge.
     - Implement `SlackProvider` filtering, deduplication, and direct `LambdaAction` binding.
     - Save the file.
2. **Update `src/index.ts`**:
   - Add `LambdaProvider` to exports.
3. **Update `src/lambda/slackListener/index.ts`**:
   - Rewrite the Lambda file to handle both SNS/Direct CW events and replace text placeholders based on `SLACK_PROVIDERS` env configuration.
4. **Compile and Bundle Lambdas**:
   - Run `npx projen compile` to compile the TypeScript files and execute the `./scripts/buildLambdas.ts` script.
5. **Update Test Cases & Snapshots**:
   - Add new tests in `test/monitoredQueue.test.ts` to assert that:
     - DLQ removalPolicy matches defaults/configurations.
     - Custom `logRetentionDays` outputs proper CloudWatch LogGroup resource retention properties.
     - Direct alarm actions contain correct target lambda references.
     - Configured lambdaProps (timeout, memory) exist in the synthesized function template.
     - Deduplication behaves as expected (resource count drops).
     - Custom title/text are encoded into the stringified environment variables.
   - Run `yarn test -u` to update the unit test snapshots.

---

## 5. Verification Method

To verify the changes, run:

1. **Verify Lambda Build**:
   ```bash
   yarn run compile
   ```
   Check that `lib/lambda/slackListener/index.js` compiles successfully without typescript errors.

2. **Verify Tests and Snapshots**:
   ```bash
   yarn test
   ```
   Ensure that the snapshot updates successfully, and all unit tests pass with the new resources and structures.

3. **Verify CDK Synthesis**:
   Synthesize a test stack utilizing `MonitoredQueue` with multiple `SlackProviders` and verify:
   - Only 1 Lambda function is created.
   - No SNS Subscription is created for the Lambda.
   - CloudWatch Alarm action references the Lambda function directly.
