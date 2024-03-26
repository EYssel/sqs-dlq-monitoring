import * as path from 'path';
import {
  Alarm,
  AlarmProps,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import {
  EmailSubscription,
  LambdaSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { DeadLetterQueue, Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
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

  /**
   * Unique name or identifier for the slack provider.
   * This allows multiple slack providers to be created for a single alarm.
   */
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
  /**
   * The standard properties of the SQS Queue Props to set the properties for the deployed queue
   * @required
   */
  readonly queueProps: QueueProps;

  /**
   * The number of times a message can be unsuccesfully dequeued before being moved to the dead-letter queue.
   * @default 3
   * @optional
   */
  readonly maxReceiveCount?: number;

  /**
   * The threshold for the amount of messages that are in the DLQ which trigger the alarm
   * @default 5
   * @optional
   */
  readonly messageThreshold?: number;

  /**
   * The number of periods over which data is compared to the specified threshold.
   * @default 1
   * @optional
   */
  readonly evaluationThreshold?: number;

  /**
   * A list of messaging providers that will be deployed and will listen for changes to the alarm.
   * @optional
   */
  readonly messagingProviders?: IMessagingProvider[];

  /**
   * The standard SQS Queue Props which can be used to customise the deployed DLQ.
   * The value of this property will be overriden if the queueProps.deadLetterQueue is provided.
   */
  readonly dlqProps?: QueueProps;

  /**
   * The standard CloudWatch Alarm props which can be used to customise the deployed alarm.
   */
  readonly alarmProps?: AlarmProps;

  /**
   * A custom topic property which allows the user to pass through a pre-existing topic.
   */
  readonly topic?: Topic;

  /**
   * The standard SNS Topic properties which can be used to customise the deployed topic.
   * This value is overriden if the `topic` property is provided.
   */
  readonly topicProps?: TopicProps;
}

export class MonitoredQueue extends Construct {
  /**
   * The created `Queue` construct
   */
  public readonly queue: Queue;

  /**
   * The created `DeadLetterQueue` construct
   */
  public readonly deadLetterQueue: DeadLetterQueue;

  /**
   * The created `Topic` construct
   */
  public readonly topic: Topic;

  /**
   * The created `Alarm` construct
   */
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
  name: string,
) {
  const slackListener = new Function(scope, 'SlackListenerLambda' + name, {
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
