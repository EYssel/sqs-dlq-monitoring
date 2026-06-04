import * as path from 'path';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from './index';

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
    // Accumulate Slack configurations on the scope (MonitoredQueue construct instance)
    const slackConfigs = (scope as any)._slackConfigs || [];
    slackConfigs.push({
      token: this.slackToken,
      channel: this.slackChannel,
    });
    (scope as any)._slackConfigs = slackConfigs;

    // Check if the single Lambda function has already been created for this MonitoredQueue
    let slackListener = scope.node.tryFindChild('SlackListenerLambda') as Function;
    if (!slackListener) {
      // Retrieve configurable log retention days from MonitoredQueue properties
      const logRetention = (scope as any).logRetentionDays ?? RetentionDays.ONE_WEEK;

      // Create explicit LogGroup with DESTROY removal policy
      const logGroup = new LogGroup(scope, 'SlackListenerLogGroup', {
        retention: logRetention,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      // Create the single Lambda function and associate it with the explicit LogGroup
      slackListener = new Function(scope, 'SlackListenerLambda', {
        runtime: Runtime.NODEJS_22_X,
        architecture: Architecture.ARM_64,
        code: Code.fromAsset(path.join(__dirname, '../../lib/lambda/slackListener')),
        handler: 'index.handler',
        logGroup: logGroup,
      });

      // Subscribe the single Lambda function to the SNS Topic
      topic.addSubscription(new LambdaSubscription(slackListener));
    }

    // Update the environment variable on the Lambda with all accumulated configurations
    slackListener.addEnvironment('SLACK_CONFIGS', JSON.stringify(slackConfigs));
  }
}
