# Implementation Plan - Issue #122: Replace Code.fromAsset with NodejsFunction for Lambda bundling

## Problem Analysis and Context
Currently, the construct compiles the lambda functions at build-time using a custom script `scripts/buildLambdas.ts` and references the compiled output:
```typescript
code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
```
This is fragile, requires custom esbuild tooling configurations, and doesn't utilize standard CDK features. By migrating to the standard `NodejsFunction` from `aws-cdk-lib/aws-lambda-nodejs`, CDK will automatically bundle the TypeScript source code at synthesis time using `esbuild`.
However, because `.npmignore` by default excludes `src/` files, consumers of the library won't have access to the `.ts` files inside `src/lambda` during synthesis, leading to `File not found` errors.
To prevent this, we must configure Projen to explicitly include the lambda source directory `src/lambda/**/*` in the generated `.npmignore` file.

## Proposed Implementation Details

### Files to Change:
- `src/providers/slack.ts` (or `src/monitoredQueue.ts`)
- `.projenrc.ts`

### Code Changes / Diffs:

#### 1. In `src/providers/slack.ts` / `src/monitoredQueue.ts`:
Replace the lambda `Function` creation with `NodejsFunction`:
```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
) {
  const slackListener = new NodejsFunction(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    entry: path.join(__dirname, '../../src/lambda/slackListener/index.ts'),
    handler: 'handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    bundling: {
      minify: true,
      target: 'esnext',
      keepNames: true,
      sourceMap: true,
    },
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

#### 2. In `.projenrc.ts`:
Update the project configuration to include lambda sources in the package, and remove the pre-compile command:
```typescript
// Add:
project.npmignore!.include('src/lambda/**/*');

// Remove or comment out:
// project.compileTask.exec('ts-node ./scripts/buildLambdas.ts');
```

## Step-by-Step Implementation Guide
1. Open `.projenrc.ts`.
2. Add `project.npmignore!.include('src/lambda/**/*');` to ensure Lambda source files are packed.
3. Remove/comment out the `buildLambdas.ts` compile task invocation.
4. Run `npx projen` in the terminal to update the project structure and `.npmignore` configurations.
5. Delete the file `scripts/buildLambdas.ts`.
6. Open `src/providers/slack.ts` (or `src/monitoredQueue.ts` if not yet refactored).
7. Import `NodejsFunction` from `aws-cdk-lib/aws-lambda-nodejs`.
8. Change the Lambda instantiation from `Function` to `NodejsFunction`, adjusting parameters (`entry`, `handler`, `bundling`).

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile everything.
2. **Npmignore check**: Check the generated `.npmignore` file and verify that the line `!/src/lambda/**/*` or similar inclusion pattern is listed.
3. **Snapshot Tests**: Since `NodejsFunction` alters asset packaging hash formats, run the Jest tests with:
   ```bash
   yarn test -u
   ```
   to update the Jest snapshot output files and ensure that the synthesis is structurally correct.
