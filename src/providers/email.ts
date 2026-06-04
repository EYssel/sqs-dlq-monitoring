import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from './index';

export class EmailProvider implements IMessagingProvider {
  /** The emails to which the messages should be sent */
  readonly emails: string[];

  constructor(emails: string[]) {
    this.emails = emails;
  }

  deployProvider(_scope: Construct, topic: Topic): void {
    for (const email of this.emails) {
      topic.addSubscription(new EmailSubscription(email));
    }
  }
}
