## 2026-06-04T11:13:07Z
You are teamwork_preview_worker_issue125.
Your working directory is: /home/estian/personal/sqs-dlq-monitoring/.agents/teamwork_preview_worker_issue125
Your task is to implement the changes for Issue-125 as defined below:
1. Create a new branch named `issue-125` from `master`.
2. Implement the alarmProps merge in `src/monitoredQueue.ts`. Modify the Alarm creation so that `props.alarmProps` is merged with the default properties instead of completely replacing them, using the object spread operator `{ ...defaults, ...props.alarmProps }`.
3. Add a unit test in `test/monitoredQueue.test.ts` verifying that custom alarmProps are merged with defaults:
   - Specific user-provided alarmProps (e.g. alarmName, threshold) are overridden.
   - Non-overridden default values (e.g. treatMissingData: TreatMissingData.NOT_BREACHING / notBreaching) are retained.
4. Run `npx projen build` to verify compilation, linting, and tests.
5. Commit and push the changes to GitHub.
6. Open a Pull Request using the `gh` CLI linked to Issue #125 (e.g., gh pr create --title "..." --body "...").
7. Write your handoff report to `/home/estian/personal/sqs-dlq-monitoring/.agents/teamwork_preview_worker_issue125/handoff.md`.
8. Send a message to the caller when done with the path to your handoff.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
