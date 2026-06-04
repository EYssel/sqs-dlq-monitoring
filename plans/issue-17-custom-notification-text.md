# Implementation Plan - Issue #17: Custom notification text

## Problem Analysis and Context
Currently, the Slack alert body text layout is hardcoded inside the Lambda handler:
```typescript
function getMessageText(message: AlarmMessage) {
  return `*State changed:*\n\n*_${message.OldStateValue}_* :arrow_right: *_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`;
}
```
Users want to customize the Slack notifications with custom titles and text bodies (e.g. including details like regional tags or account numbers).
To implement this:
1. Expose optional `customTitle` and `customText` parameters in the `SlackProvider` class constructor.
2. Serialize these templates along with token and channel inside the environment configurations (`SLACK_PROVIDERS`).
3. In the Lambda listener handler (`src/lambda/slackListener/index.ts`), replace placeholders like `{{AlarmName}}`, `{{NewStateValue}}` inside the templates using regex replacement at runtime.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts` (or `src/providers/slack.ts`)
- `src/lambda/slackListener/index.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts`:
Update `SlackProvider` property definitions:
```typescript
export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;
  readonly customTitle?: string;
  readonly customText?: string;

  constructor(
    slackToken: string,
    slackChannel: string,
    name: string,
    customTitle?: string,
    customText?: string,
  ) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
    this.customTitle = customTitle;
    this.customText = customText;
  }
  
  // ...
}
```

Ensure they are included in `SLACK_PROVIDERS` configuration payload:
```typescript
  const providersConfig = slackProviders.map(p => ({
    token: p.slackToken,
    channel: p.slackChannel,
    customTitle: p.customTitle,
    customText: p.customText,
  }));
```

#### 2. In `src/lambda/slackListener/index.ts`:
Apply template replacement inside the handler loop:
```typescript
          const title = provider.customTitle
            ? formatCustomTemplate(provider.customTitle, message)
            : `${message.AlarmName} has been triggered!`;

          const text = provider.customText
            ? formatCustomTemplate(provider.customText, message)
            : getDefaultMessageText(message);
```

Add the `formatCustomTemplate` function:
```typescript
function formatCustomTemplate(template: string, message: AlarmMessage): string {
  return template
    .replace(/\{\{AlarmName\}\}/g, message.AlarmName)
    .replace(/\{\{AlarmDescription\}\}/g, message.AlarmDescription || '')
    .replace(/\{\{AWSAccountId\}\}/g, message.AWSAccountId)
    .replace(/\{\{NewStateValue\}\}/g, message.NewStateValue)
    .replace(/\{\{NewStateReason\}\}/g, message.NewStateReason)
    .replace(/\{\{StateChangeTime\}\}/g, message.StateChangeTime)
    .replace(/\{\{Region\}\}/g, message.Region)
    .replace(/\{\{AlarmArn\}\}/g, message.AlarmArn)
    .replace(/\{\{OldStateValue\}\}/g, message.OldStateValue);
}
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts` and add `customTitle` and `customText` parameters to `SlackProvider`.
2. Map these fields into the serialization object inside `deploySharedSlackProvider` (or `addSlackNotificationDestination`).
3. Open `src/lambda/slackListener/index.ts`. Add the `formatCustomTemplate` helper and use it to replace placeholders.
4. Add a unit test inside `test/monitoredQueue.test.ts` to assert that custom text properties are serialized correctly in the environment block.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile`.
2. **Unit Tests**: Run `npm test` or `yarn test` to verify that custom strings compile and assert correctly.
