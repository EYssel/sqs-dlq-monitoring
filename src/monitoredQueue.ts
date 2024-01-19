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

export interface SlackProps {
  /** Slack bot token */
  readonly slackToken: string;
  /** Slack channel to post messages to */
  readonly slackChannel: string;
}

export interface IMonitoredQueueProps {
  /** The properties of the SQS Queue Construct */
  readonly queueProps: QueueProps;
  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm */
  readonly messageThreshold?: number;
  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm */
  readonly evaluationThreshold?: number;
  /** The emails to which the messages should be sent */
  readonly emails?: string[];
  /** Properties for setting up Slack Messaging
   * For info on setting this up see:
   * https://github.com/EYssel/sqs-dlq-monitoring/blob/master/README.md#setting-up-slack-notifications
   */
  readonly slackProps? : SlackProps;
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
        maxReceiveCount: 3,
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

    props.emails
      ? addEmailNotificationDestination(topic, props.emails)
      : {};

    const slackProps = props.slackProps;

    slackProps
      ? addSlackNotificationDestination(
        this,
        topic,
        slackProps.slackToken,
        slackProps.slackChannel,
      )
      : {};
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