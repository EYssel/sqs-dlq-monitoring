# Implementation Plan - Issue #78: Investigate Auto-Generating Documentation

## Problem Analysis and Context
Developers using the construct need clear API reference documentation mapping out the classes, interface properties, and default values. Because this construct is a JSII library, we should use JSII's official documentation generator tool `jsii-docgen`. It parses typescript types and JSDoc comments to generate a standardized `API.md` file listing all properties, defaults, and usage guidelines.
We can enable this directly within Projen.

## Proposed Implementation Details

### Files to Change:
- `.projenrc.ts`

### Code Changes / Diffs:

#### 1. In `.projenrc.ts`:
Change `docgen: false` to `docgen: true` in the construct constructor:
```typescript
const project = new awscdk.AwsCdkConstructLibrary({
  // ...
  docgen: true, // Enable jsii-docgen to auto-generate API.md
  // ...
});
```

*(Optional) Configure interactive TypeDoc HTML documentation:*
If interactive HTML documentation pages are also required, we can add `typedoc` to `devDeps` and define a custom projen task:
```typescript
devDeps: [
  'esbuild',
  'typedoc',
  // ...
],
```
Define a custom task inside `.projenrc.ts` (before `project.synth()`):
```typescript
const typedocTask = project.addTask('docs:html', {
  exec: 'typedoc --options typedoc.json',
});
```

Create `typedoc.json` in the root:
```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "documentation/html",
  "readme": "README.md",
  "exclude": ["src/lambda/**/*", "playground/**/*"],
  "cleanOutputDir": true
}
```

## Step-by-Step Implementation Guide
1. Open `.projenrc.ts`.
2. Locate the `docgen: false` configuration line and modify it to `docgen: true`.
3. (Optional) Append the `typedoc` dependency and the custom `docs:html` task.
4. Run `npx projen` in the terminal to download packages, configure tasks, and recreate scripts.
5. Run `yarn build` (which executes the `compile` and `docgen` tasks).
6. Verify that `API.md` is successfully generated in the project root.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile.
2. **API Documentation Check**: Run `yarn build` and confirm that a new file `API.md` exists in the repository root, and that it successfully documents `MonitoredQueue`, `IMonitoredQueueProps`, `SlackProvider`, etc.
3. **HTML Docs (Optional)**: Run `yarn docs:html` and inspect the generated documentation under the `documentation/html/` path.
