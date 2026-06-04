import {
  Alarm,
  AlarmProps,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { DeadLetterQueue, Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { IMessagingProvider, EmailProvider, SlackProvider } from './providers';

// Re-export providers for 100% backward compatibility
export { IMessagingProvider, EmailProvider, SlackProvider };

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

  /**
   * The number of days log events are kept in CloudWatch Logs for the Slack Lambda.
   * @default RetentionDays.ONE_WEEK
   * @optional
   */
  readonly logRetentionDays?: RetentionDays;
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

  /**
   * The log retention days configured for the Slack Lambda
   */
  public readonly logRetentionDays?: RetentionDays;

  constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
    super(scope, id);

    // Save log retention days to be accessible by providers during deployProvider()
    this.logRetentionDays = props.logRetentionDays;

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

    const defaults = {
      alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
      metric:
        deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
      threshold: props.messageThreshold || 5,
      evaluationPeriods: props.evaluationThreshold || 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    };

    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      {
        ...defaults,
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

    for (const messageProvider of props.messagingProviders
      ? props.messagingProviders
      : []) {
      messageProvider.deployProvider(this, topic);
    }
  }
}
