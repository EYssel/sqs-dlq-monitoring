import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface IMessagingProvider {
  deployProvider(scope: Construct, topic: Topic): void;
}

export * from './email';
export * from './slack';
