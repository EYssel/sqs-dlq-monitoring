import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface MonitoredQueueProps {
  readonly queueProps: QueueProps;
  readonly messageThreshold?: number;
}

export class MonitoredQueue extends Construct {
  constructor(scope: Construct, id: string, props: MonitoredQueueProps) {
    super(scope, id);

    // if no deadLetterQueue add default
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


  }
}
