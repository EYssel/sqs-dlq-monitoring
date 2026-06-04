# Implementation Plan - Issue #8: Microsoft Teams Integration

## Problem Analysis and Context
Currently, the construct only supports email and Slack messaging providers. We need to support Microsoft Teams notification channels. Microsoft Teams channels receive alerts using incoming Webhook connectors.
To implement this:
1. Define a `TeamsProvider` class that implements `IMessagingProvider`.
2. Write a Node.js Lambda function handler `src/lambda/teamsListener/index.ts` to parse incoming CloudWatch/SNS notifications and POST them to the Microsoft Teams Webhook URL using `axios` in Adaptive Card format.
3. Configure the build script / Projen to compile the new listener.

## Proposed Implementation Details

### Files to Change:
- `.projenrc.ts` (or `scripts/buildLambdas.ts` if custom bundling is active)
- `src/monitoredQueue.ts`
- `src/index.ts`
- `src/lambda/teamsListener/index.ts` (New File)

### Code Changes / Diffs:

#### 1. In `src/lambda/teamsListener/index.ts`:
Create the webhook handler:
```typescript
import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

export const handler = async (event: { Records: { Sns: { Message: string } }[] }) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);
    const teamsMessage = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
              {
                type: 'TextBlock',
                text: `${message.AlarmName} has been triggered!`,
                weight: 'Bolder',
                size: 'Medium',
                color: message.NewStateValue === 'ALARM' ? 'Attention' : 'Good',
              },
              {
                type: 'FactSet',
                facts: [
                  { title: 'State Change:', value: `${message.OldStateValue} -> ${message.NewStateValue}` },
                  { title: 'Reason:', value: message.NewStateReason },
                  { title: 'AWS Account:', value: message.AWSAccountId },
                  { title: 'Region:', value: message.Region },
                ],
              },
            ],
          },
        },
      ],
    };

    await axios.post(process.env.TEAMS_WEBHOOK_URL!, teamsMessage, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending message to Microsoft Teams:', error);
  }
};
```

#### 2. In `src/monitoredQueue.ts` (Add `TeamsProvider`):
```typescript
export class TeamsProvider implements IMessagingProvider {
  readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  deployProvider(scope: Construct, topic: Topic): void {
    const teamsListener = new Function(scope, 'TeamsListenerLambda', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(path.join(__dirname, '../lib/lambda/teamsListener')),
      handler: 'index.handler',
      environment: {
        TEAMS_WEBHOOK_URL: this.webhookUrl,
      },
      logRetention: 7,
    });

    topic.addSubscription(new LambdaSubscription(teamsListener));
  }
}
```

#### 3. In `src/index.ts`:
Export `TeamsProvider`:
```typescript
export { TeamsProvider } from './monitoredQueue';
```

#### 4. In `scripts/buildLambdas.ts` (if custom compilation is used):
```typescript
const lambdaPaths = ['lambda/slackListener/', 'lambda/teamsListener/'];
```

## Step-by-Step Implementation Guide
1. Create `src/lambda/teamsListener/index.ts` with the Adaptive Card formatter logic.
2. Edit `scripts/buildLambdas.ts` (or `.projenrc.ts` if using NodejsFunction) to compile the new lambda.
3. Open `src/monitoredQueue.ts`, import `TeamsProvider`, and declare the class.
4. Export the new class in `src/index.ts`.
5. Add unit tests in `test/monitoredQueue.test.ts` verifying that:
   - Creating a `TeamsProvider` successfully synthesizes the AWS Lambda and log group resources.
   - The lambda contains `TEAMS_WEBHOOK_URL` in its environment properties.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile`.
2. **Unit Tests**: Run `npm test` or `yarn test` to confirm that the Teams CloudFormation properties are generated successfully.
