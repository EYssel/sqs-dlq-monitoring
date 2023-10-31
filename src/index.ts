import { Alarm, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  EmailSubscription,
  LambdaSubscription,
} from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface IMonitoredQueueProps {
  /** The properties of the SQS Queue Construct */
  readonly queueProps: QueueProps;
  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm */
  readonly messageThreshold?: number;
  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm */
  readonly evaluationThreshold?: number;
  /** The emails to which the messages should be sent */
  readonly emails?: string[];
  /** Slack bot token */
  readonly slackToken?: string;
  /** Slack channel to post messages to */
  readonly slackChannel?: string;
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
      ? this.addEmailNotificationDestination(topic, props.emails)
      : {};

    props.slackToken && props.slackChannel
      ? this.addSlackNotificationDestination(
        topic,
        props.slackToken,
        props.slackChannel,
      )
      : {};
  }

  addEmailNotificationDestination(topic: Topic, emails: string[]) {
    for (const email of emails) {
      topic.addSubscription(new EmailSubscription(email));
    }
  }

  addSlackNotificationDestination(
    topic: Topic,
    slackToken: string,
    slackChannel: string,
  ) {
    const slackListener = new Function(this, 'SlackNotificationLambda', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
      handler: 'index.handler',
      environment: {
        SLACK_BOT_TOKEN: slackToken,
        SLACK_CHANNEL: slackChannel,
      },
    });

    topic.addSubscription(new LambdaSubscription(slackListener));
  }
}
