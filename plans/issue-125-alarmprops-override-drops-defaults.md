# Implementation Plan - Issue #125: alarmProps override drops all defaults including TreatMissingData

## Problem Analysis and Context
In `src/monitoredQueue.ts`, the Alarm constructor options fallback to the default object only if `props.alarmProps` is falsy (`props.alarmProps || { ... }`).
Consequently, if a user provides custom `alarmProps`, it completely overrides the default properties, causing important default settings like `treatMissingData: TreatMissingData.NOT_BREACHING`, the metric, the threshold, and the evaluation periods to be completely dropped (unless they are explicitly redefined by the caller in `alarmProps`).
The goal is to allow users to override specific alarm properties while retaining other defaults.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`

### Code Changes / Diffs:
In `src/monitoredQueue.ts`:
```typescript
// Replace:
    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      props.alarmProps || {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );

// With:
    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        ...props.alarmProps,
      },
    );
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts` and locate the `Alarm` construct definition inside the `MonitoredQueue` constructor.
2. Modify the alarm properties parameter to use object spreading: `{ ...defaults, ...props.alarmProps }`.
3. In `test/monitoredQueue.test.ts`, add a unit test suite that configures a custom `alarmProps` and asserts that defaults (like `treatMissingData` / `notBreaching`) are still set, while user-specified properties (like `alarmName` or `threshold`) are updated.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to ensure the project compiles successfully.
2. **Unit Tests**: Run `npm test` or `yarn test` to verify all existing and new tests pass.
3. **Template Verification**:
   - Write a unit test asserting that:
     ```typescript
     template.hasResourceProperties('AWS::CloudWatch::Alarm', {
       AlarmName: 'custom-alarm-name',
       Threshold: 10,
       TreatMissingData: 'notBreaching',
     });
     ```
