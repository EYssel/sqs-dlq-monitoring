import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class MonitoredQueue extends Queue {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}