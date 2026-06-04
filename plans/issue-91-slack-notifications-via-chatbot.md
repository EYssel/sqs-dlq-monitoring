# Implementation Plan - Issue #91: Slack Notifications via AWS Chatbot

## Problem Analysis and Context
Instead of deploying a custom Node.js Lambda function to handle Slack webhook calls, AWS CDK natively supports AWS Chatbot through the `aws-chatbot.SlackChannelConfiguration` construct. AWS Chatbot integrates directly with Amazon SNS to format and deliver alarm events to Slack channels without writing custom listener code.
We will implement a new class `ChatBotSlackProvider` that implements the `IMessagingProvider` interface.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts` (or `src/providers/chatbot.ts`)
- `src/index.ts`

### Code Changes / Diffs:

#### 1. Create/Add `ChatBotSlackProvider` in `src/monitoredQueue.ts`:
```typescript
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface IChatBotSlackProviderProps {
  readonly slackWorkspaceId: string;
  readonly slackChannelId: string;
  readonly configurationName?: string;
  readonly role?: iam.IRole;
  readonly guardrailPolicies?: iam.IManagedPolicy[];
}

export class ChatBotSlackProvider implements IMessagingProvider {
  readonly props: IChatBotSlackProviderProps;

  constructor(props: IChatBotSlackProviderProps) {
    this.props = props;
  }

  deployProvider(scope: Construct, topic: Topic): void {
    new chatbot.SlackChannelConfiguration(scope, `ChatBotSlack-${this.props.slackChannelId}`, {
      slackChannelConfigurationName: this.props.configurationName || `${scope.node.id}-chatbot-slack`,
      slackWorkspaceId: this.props.slackWorkspaceId,
      slackChannelId: this.props.slackChannelId,
      notificationTopics: [topic],
      role: this.props.role,
      guardrailPolicies: this.props.guardrailPolicies,
    });
  }
}
```

#### 2. Export `ChatBotSlackProvider` in `src/index.ts`:
```typescript
export { ChatBotSlackProvider, IChatBotSlackProviderProps } from './monitoredQueue';
```

## Step-by-Step Implementation Guide
1. Import `aws-chatbot` and `aws-iam` packages in `src/monitoredQueue.ts`.
2. Define `IChatBotSlackProviderProps` and the `ChatBotSlackProvider` class.
3. Implement `deployProvider` using `chatbot.SlackChannelConfiguration`.
4. Export the new class and interface in `src/index.ts`.
5. Add a unit test in `test/monitoredQueue.test.ts` to assert that:
   - Configuring `ChatBotSlackProvider` synthesizes the `AWS::ChatBot::SlackChannelConfiguration` resource in CloudFormation.
   - The properties match `SlackWorkspaceId`, `SlackChannelId`, and target SNS topic ARN correctly.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to verify the build.
2. **Unit Tests**: Run `npm test` and verify that the Chatbot CloudFormation resource properties are verified correctly.
3. **Important Caveat Note**: Note that AWS Chatbot requires manual authorization of the Slack workspace in the AWS Console for the destination account prior to deploying the stack. This cannot be automated within CDK.
