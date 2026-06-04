# Scope: Issue-125 - alarmProps override drops all defaults

## Architecture
- MonitoredQueue construct in `src/monitoredQueue.ts`

## Milestone
- Name: Issue-125
- Description: Merge `alarmProps` rather than overwriting defaults.
- Source plan: `plans/issue-125-alarmprops-override-drops-defaults.md`

## Requirements
1. Create a new branch named `issue-125` from `master`.
2. Implement the alarmProps merge in `src/monitoredQueue.ts`.
3. Add a unit test verifying custom alarmProps merge in `test/monitoredQueue.test.ts`.
4. Run `npx projen build` to compile and verify all unit tests pass.
5. Commit and push the changes.
6. Open a Pull Request using `gh` CLI linked to Issue #125.
