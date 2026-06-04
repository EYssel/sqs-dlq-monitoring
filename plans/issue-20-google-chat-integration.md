# Implementation Plan - Issue #20: Google Chat Integration

## Problem Analysis and Context
Currently, the construct only supports email and Slack messaging providers. We need to introduce support for Google Chat. Google Chat spaces support receiving messages via Webhook URLs.
To implement this:
1. Define a `GoogleChatProvider` that implements `IMessagingProvider`.
2. Write a Node.js Lambda function handler `src/lambda/googleChatListener/index.ts` to parse incoming CloudWatch Alarm/SNS messages and POST them to the Google Chat Webhook URL using `axios` in CardV2 format.
3. Configure the build script / Projen to compile the new listener.

## Proposed Implementation Details

### Files to Change:
- `.projenrc.ts` (or `scripts/buildLambdas.ts` if custom bundling is active)
- `src/monitoredQueue.ts`
- `src/index.ts`
- `src/lambda/googleChatListener/index.ts` (New File)

### Code Changes / Diffs:

#### 1. In `src/lambda/googleChatListener/index.ts`:
Create the webhook handler:
```typescript
import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

export const handler = async (event: { Records: { Sns: { Message: string } }[] }) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);
    const googleChatMessage = {
      cardsV2: [
        {
          cardId: 'alarmCard',
          card: {
            header: {
              title: `${message.AlarmName} has been triggered!`,
              subtitle: `Account: ${message.AWSAccountId} | Region: ${message.Region}`,
              imageUrl: message.NewStateValue === 'ALARM'
                ? 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/warning/default/24px.svg'
                : 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/24px.svg',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>State change:</b><br>${message.OldStateValue} &rarr; <b>${message.NewStateValue}</b><br><br><b>Reason:</b><br>${message.NewStateReason}`,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL!, googleChatMessage, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending message to Google Chat:', error);
  }
};
```

#### 2. In `src/monitoredQueue.ts` (Add `GoogleChatProvider`):
```typescript
export class GoogleChatProvider implements IMessagingProvider {
  readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  deployProvider(scope: Construct, topic: Topic): void {
    const chatListener = new Function(scope, 'GoogleChatListenerLambda', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(path.join(__dirname, '../lib/lambda/googleChatListener')),
      handler: 'index.handler',
      environment: {
        GOOGLE_CHAT_WEBHOOK_URL: this.webhookUrl,
      },
      logRetention: 7,
    });

    topic.addSubscription(new LambdaSubscription(chatListener));
  }
}
```

#### 3. In `src/index.ts`:
Export `GoogleChatProvider`:
```typescript
export { GoogleChatProvider } from './monitoredQueue';
```

#### 4. In `scripts/buildLambdas.ts` (if custom compilation is used):
```typescript
const lambdaPaths = ['lambda/slackListener/', 'lambda/googleChatListener/'];
```

## Step-by-Step Implementation Guide
1. Create `src/lambda/googleChatListener/index.ts` with the CardV2 formatter logic.
2. Edit `scripts/buildLambdas.ts` (or `.projenrc.ts` if using NodejsFunction) to compile the new lambda.
3. Open `src/monitoredQueue.ts`, import `GoogleChatProvider`, and declare the class.
4. Export the new class in `src/index.ts`.
5. Add unit tests in `test/monitoredQueue.test.ts` verifying that:
   - Creating a `GoogleChatProvider` synthesizes the AWS Lambda and log group resources.
   - The lambda contains `GOOGLE_CHAT_WEBHOOK_URL` in its environment.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile.
2. **Unit Tests**: Run `npm test` or `yarn test` to confirm that the Google Chat CloudFormation properties are generated successfully.
