# Analysis & Recommendations: Issue-125 - alarmProps override drops all defaults

## Executive Summary
In `src/monitoredQueue.ts`, the AWS CDK `Alarm` constructor uses `props.alarmProps || { ...defaults }`. When a user specifies any custom properties via `props.alarmProps`, the fallback defaults are entirely ignored. This drops vital default settings like `treatMissingData: TreatMissingData.NOT_BREACHING`, the automatically computed SQS DLQ `metric`, the default `threshold` (5), and the default `evaluationPeriods` (1). 

The recommended fix is to merge the custom `alarmProps` with defaults using the JavaScript/TypeScript spread operator: `{ ...defaults, ...props.alarmProps }`. This guarantees that defaults are preserved, while any custom alarm property specified by the caller correctly overrides the default.

---

## Detailed Findings

### Codebase Location
In `src/monitoredQueue.ts` (lines 169–180), the current implementation for the alarm is:
```typescript
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
```

### Analysis of the Bug
Because of the logical OR operator (`||`), if `props.alarmProps` is defined (even as an empty object `{}` or with a single property like `{ alarmName: 'my-custom-name' }`), the entire right-hand side operand is skipped. As a result, critical configurations like `treatMissingData`, `metric`, `threshold`, and `evaluationPeriods` are left undefined (unless manually specified by the user in `props.alarmProps`).

---

## Proposed Solution

Modify the instantiation of `Alarm` in `src/monitoredQueue.ts` to merge the properties:

```typescript
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

### Why this is safe and correct:
1. **Property Merging**: If `props.alarmProps` is undefined, `...props.alarmProps` evaluates to nothing, so the defaults are kept exactly as before.
2. **Prioritization**: Any property defined within `props.alarmProps` (e.g. `threshold`, `treatMissingData`, etc.) is placed at the end of the object creation, so it will overwrite the corresponding default field correctly.
3. **Backwards Compatibility**: Existing code that relied on legacy properties (e.g., `props.messageThreshold` or `props.evaluationThreshold`) will still have those fields correctly populated and fall back to `5` and `1` respectively.

---

## Verification and Testing Strategy

### New Test Case
To verify the fix and prevent regressions, add the following test suite to `test/monitoredQueue.test.ts`:

```typescript
  describe('should create a monitored queue with custom alarm properties and preserve defaults', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      alarmProps: {
        alarmName: 'custom-alarm-name',
        threshold: 10,
      },
    });

    const template = Template.fromStack(stack);

    test('should create SQS queues', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
    });

    test('should merge alarmProps and preserve other default properties', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'custom-alarm-name',
        Threshold: 10,
        EvaluationPeriods: 1, // Default preserved
        TreatMissingData: 'notBreaching', // Default preserved
        MetricName: 'ApproximateNumberOfMessagesVisible', // Default preserved
      });
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
```

### Verification Commands
Once the changes are made, run the following commands to verify:
1. **Compile the project**:
   ```bash
   npx projen compile
   ```
2. **Run all tests and update snapshots**:
   ```bash
   npm test -- -u
   ```
