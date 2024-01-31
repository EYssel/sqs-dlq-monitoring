import * as path from 'path';
import { Alarm, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  EmailSubscription,
  LambdaSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface IMessagingProvider {
  deployProvider(scope: Construct, topic: Topic): void;
}

export class SlackProvider implements IMessagingProvider {
  /** Slack bot token for providing access to the Lambda function to write messages to Slack
   * @required
   */
  readonly slackToken: string;

  /** Slack channel to post messages to
   * @required
   */
  readonly slackChannel: string;

  constructor(slackToken: string, slackChannel: string) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
  }

  deployProvider(scope: Construct, topic: Topic) {
    addSlackNotificationDestination(
      scope,
      topic,
      this.slackToken,
      this.slackChannel,
    );
  }
}

export class EmailProvider implements IMessagingProvider {
  /** The emails to which the messages should be sent */
  readonly emails: string[];

  constructor(emails: string[]) {
    this.emails = emails;
  }

  deployProvider(_scope: Construct, topic: Topic): void {
    addEmailNotificationDestination(topic, this.emails);
  }
}

export interface IMonitoredQueueProps {
  /** The standard properties of the SQS Queue Construct
   * @required
   */
  readonly queueProps: QueueProps;

  /** The number of times a message can be unsuccesfully dequeued before being moved to the dead-letter queue.
   * @default 3
   * @optional
   */
  readonly maxReceiveCount?: number;

  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm
   * @default 5
   * @optional
   */
  readonly messageThreshold?: number;

  /** The number of periods over which data is compared to the specified threshold.
   * @default 1
   * @optional
   */
  readonly evaluationThreshold?: number;

  //readonly emails?: string[];

  /** Properties for setting up Slack Messaging
   * For info on setting this up see:
   * https://github.com/EYssel/sqs-dlq-monitoring/blob/master/README.md#setting-up-slack-notifications
   * @optional
   */
  //readonly slackProps? : SlackProps;

  readonly messagingProviders?: IMessagingProvider[];
}

export class MonitoredQueue extends Construct {
  constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
    super(scope, id);

    const deadLetterQueue = props.queueProps.deadLetterQueue
      ? props.queueProps.deadLetterQueue
      : {
        queue: new Queue(this, 'DeadLetterQueue', {
          queueName: `${props.queueProps.queueName}-dlq`,
        }),
        maxReceiveCount: props.maxReceiveCount || 3,
      };

    new Queue(this, 'Queue', {
      ...props.queueProps,
      deadLetterQueue,
    });

    const alarm = new Alarm(this, 'DLQ-Alarm', {
      alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
      metric: deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
      threshold: props.messageThreshold || 5,
      evaluationPeriods: props.evaluationThreshold || 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    const topic = new Topic(this, 'Topic', {
      topicName: `${deadLetterQueue.queue.queueName}-alarm-topic`,
    });

    const snsAction = new SnsAction(topic);

    alarm.addAlarmAction(snsAction);
    alarm.addOkAction(snsAction);

    for (const messageProvider of props.messagingProviders
      ? props.messagingProviders
      : []) {
      messageProvider.deployProvider(this, topic);
    }
  }
}

function addEmailNotificationDestination(topic: Topic, emails: string[]) {
  for (const email of emails) {
    topic.addSubscription(new EmailSubscription(email));
  }
}

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
) {
  const slackListener = new Function(scope, 'SlackNotificationLambda', {
    runtime: Runtime.NODEJS_18_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logRetention: 7,
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
