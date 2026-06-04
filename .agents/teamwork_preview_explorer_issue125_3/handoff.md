# Handoff Report: Issue-125 Explorer

This is a hard handoff report containing observations, reasoning, conclusions, and a verification plan for resolving Issue-125 in the `sqs-dlq-monitoring` construct repository.

---

## 1. Observation

- **Observed File Path & Lines**: In `src/monitoredQueue.ts` lines 169–180:
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
- **Observed Test Suite**: In `test/monitoredQueue.test.ts`, there are no usages of `alarmProps` inside any test configurations. A grep search for `alarmProps` in the `test` directory returned:
  ```
  No results found
  ```
- **Observed Snapshots**: Snapshot files under `test/__snapshots__/` format `TreatMissingData` as:
  ```json
  "TreatMissingData": "notBreaching"
  ```

---

## 2. Logic Chain

1. **Observation 1 (Alarm Constructor Fallback)**: The `Alarm` construct's configuration parameter utilizes a logical OR operator (`props.alarmProps || { defaults }`).
2. **Step 2 (Exclusivity)**: If `props.alarmProps` is defined (truthy), the expression evaluates immediately to `props.alarmProps`. The entire defaults object `{ alarmName, metric, threshold, evaluationPeriods, treatMissingData }` is ignored.
3. **Step 3 (Default Loss)**: Therefore, any user-supplied `alarmProps` causes the loss of all defaults, including `treatMissingData: TreatMissingData.NOT_BREACHING`.
4. **Observation 2 (Test Coverage)**: Because there are currently no test assertions that configure custom `alarmProps`, this bug is not caught by existing unit tests.
5. **Observation 3 (JSON representation)**: The snapshot file demonstrates that the CDK stringified format for `TreatMissingData.NOT_BREACHING` is `"notBreaching"`.
6. **Step 6 (Merge Plan)**: Changing `props.alarmProps || { defaults }` to `{ defaults, ...props.alarmProps }` guarantees that all defaults are retained and only overridden when explicitly specified in `props.alarmProps`.

---

## 3. Caveats

- **Required Properties in CDK**: `AlarmProps` has several required properties (`metric`, `threshold`, and `evaluationPeriods`). When configuring `alarmProps` in TypeScript, users might need to use type casting (e.g. `alarmProps: { alarmName: 'custom-name' } as any`) to override a subset of fields without TypeScript compiler errors, or specify all required fields. The merge plan safely supports both methods.
- **Other Overrides**: A similar fallback pattern (`props.XXXProps || { defaults }`) is used for `dlqProps` (line 153) and `topicProps` (line 189). These are out of scope for Issue-125 and have been left untouched to avoid unintended side-effects.

---

## 4. Conclusion

The current implementation of the `Alarm` construct in `src/monitoredQueue.ts` drops default configurations when custom `alarmProps` are supplied. This can be resolved by replacing the logical OR operator with object spreading:
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
Additionally, a unit test must be added to `test/monitoredQueue.test.ts` to assert that custom `alarmProps` merge correctly with default properties.

---

## 5. Verification Method

To verify the resolution of the bug:
1. Apply the changes to `src/monitoredQueue.ts` and `test/monitoredQueue.test.ts` as detailed in the merge plan.
2. Run `npm test` or `npx projen build` to compile the TypeScript files and execute the test runner.
3. Verify that the new test suite passes and successfully matches the snapshot (run `npm test -- -u` to update the snapshots once if necessary).
4. Inspect the test output to verify that the template contains the customized properties (e.g., custom alarm name or threshold) while preserving the default `TreatMissingData: 'notBreaching'` property.
