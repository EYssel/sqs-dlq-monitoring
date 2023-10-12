import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface MonitoredQueueProps extends Omit<QueueProps, 'deadLetterQueue'> {
  maxReceiveCount?: number;
  dlqQueueName?: string;
}

export class MonitoredQueue extends Queue {
  constructor(scope: Construct, id: string, props: MonitoredQueueProps) {
    super(scope, id);

    const { maxReceiveCount, dlqQueueName } = props;

    const dlq = new Queue(scope, 'DLQ', {
      queueName: dlqQueueName || `${this.queueName}-dlq`,
    });

    new Queue(scope, id, {
      ...props,
      deadLetterQueue: {
        maxReceiveCount: maxReceiveCount || 5,
        queue: dlq,
      },
    });
  }
}
