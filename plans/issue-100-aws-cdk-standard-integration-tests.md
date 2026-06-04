# Implementation Plan - Issue #100: Add Integration Tests based on aws-cdk standard

## Problem Analysis and Context
Unit tests verify the structure of the synthesized CloudFormation templates, but they cannot verify if the constructs deploy, configure, and communicate properly with AWS services. We need to introduce the standard `@aws-cdk/integ-tests-alpha` integration testing framework and configure `integ-runner` to run tests and match snapshots.
Integration test files (named `integ.*.ts`) must be ignored by Jest (which looks for `*.test.ts`) but detected by the `integ-runner` CLI.

## Proposed Implementation Details

### Files to Change:
- `.projenrc.ts`
- `package.json` (regenerated via projen)
- `test/integ.monitored-queue.ts` (New File)

### Code Changes / Diffs:

#### 1. In `.projenrc.ts`:
Add dependencies and tasks for integration testing:
```typescript
const project = new awscdk.AwsCdkConstructLibrary({
  // ...
  devDeps: [
    'esbuild',
    '@aws-cdk/integ-tests-alpha@2.168.0-alpha.0',
    '@aws-cdk/integ-runner@^2.168.0',
  ],
  // ...
});

const integTask = project.addTask('integ', {
  exec: 'integ-runner',
});
const integUpdateTask = project.addTask('integ:update', {
  exec: 'integ-runner --update-on-failed',
});
```

#### 2. Creation of `test/integ.monitored-queue.ts`:
```typescript
import { App, Stack } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { MonitoredQueue } from '../src/monitoredQueue';

const app = new App();
const stack = new Stack(app, 'IntegMonitoredQueueStack');

new MonitoredQueue(stack, 'MonitoredQueue', {
  queueProps: {
    queueName: 'integ-test-queue',
  },
  messageThreshold: 3,
});

new IntegTest(app, 'MonitoredQueueInteg', {
  testCases: [stack],
});
```

## Step-by-Step Implementation Guide
1. Open `.projenrc.ts`.
2. Add `@aws-cdk/integ-tests-alpha@2.168.0-alpha.0` and `@aws-cdk/integ-runner@^2.168.0` to `devDeps`.
3. Add the `integ` and `integ:update` tasks inside `.projenrc.ts`.
4. Run `npx projen` in the terminal to configure the tasks and install the dependencies.
5. Create `test/integ.monitored-queue.ts` with the test configuration.
6. Compile the code using `yarn build`.
7. Generate the initial integration test snapshots by running `yarn integ:update`.

## Verification Plan
1. **CDK Synthesis Verification**: Run `yarn integ --dry-run` to compile and verify that the integration test stack successfully synthesizes without deploying it to AWS.
2. **Snapshot check**: Confirm that the snapshot folder `test/integ.monitored-queue.js.snapshot/` was generated successfully and contains correct resource assertions.
