import { Alarm, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

interface EmailNotificationDestination extends NotificationDestination {
  /** The emails to which notifications will to be sent to (An email subscription request will be sent to each email) */
  readonly emails: string[];
}

interface NotificationDestination {}

enum NotificationDestinationType {
  email = 'EmailNotificationDestination',
}

export interface MonitoredQueueProps {
  /** The properties of the SQS Queue Construct */
  readonly queueProps: QueueProps;
  /** The threshold for the amount of messages that are in the DLQ which trigger the alarm */
  readonly messageThreshold?: number;
  /** */
  readonly notificationDestinations?: NotificationDestination[];
}

export class MonitoredQueue extends Construct {
  constructor(scope: Construct, id: string, props: MonitoredQueueProps) {
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
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    const topic = new Topic(this, 'Topic', {
      topicName: `${deadLetterQueue.queue.queueName}-alarm-topic`,
    });

    const snsAction = new SnsAction(topic);

    alarm.addAlarmAction(snsAction);

    props.notificationDestinations
      ? this.addNotificationDestinations(topic, props.notificationDestinations)
      : {};
  }

  addNotificationDestinations(
    topic: Topic,
    notificationDestinations: NotificationDestination[],
  ) {
    if (notificationDestinations.length === 0) {
      return;
    }

    for (const notificationDestination of notificationDestinations) {
      const notificationDestinationType = getNotificationDestinationType(
        notificationDestination,
      );

      if (!notificationDestinationType) {
        throw new Error(
          'Notification destination type not supported. Please check the documentation for supported notification destinations.',
        );
      }

      this.addNotificationDestination(
        topic,
        notificationDestination,
        notificationDestinationType,
      );
    }
  }

  addNotificationDestination(
    topic: Topic,
    notificationDestination: NotificationDestination,
    notificationDestinationType: NotificationDestinationType,
  ) {
    switch (notificationDestinationType) {
      case NotificationDestinationType.email:
        addEmailNotificationDestination(
          topic,
          notificationDestination as EmailNotificationDestination,
        );
        break;
    }
  }
}

function getNotificationDestinationType(
  notificationDestination: NotificationDestination,
) {
  if ('emails' in notificationDestination) {
    return NotificationDestinationType.email;
  }

  return null;
}

function addEmailNotificationDestination(
  topic: Topic,
  notificationDestination: EmailNotificationDestination,
) {
  for (const email of notificationDestination.emails) {
    topic.addSubscription(new EmailSubscription(email));
  }
}
