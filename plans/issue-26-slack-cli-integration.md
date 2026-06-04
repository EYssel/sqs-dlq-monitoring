# Implementation Plan/Analysis - Issue #26: Slack CLI integration

## Problem Analysis and Context
Slack CLI compiles and deploys next-generation Slack Apps running on Deno. When deploying a CDK construct library (which is distributed via package managers like NPM/NuGet/PyPI), requiring users to have Deno, the Slack CLI, and manual workspace authentication configured locally during synthesis or deployment is impractical, complex, and error-prone.
Therefore, integrating the Slack CLI directly into the CDK codebase/synthesis pipeline is **not recommended**.

## Proposed Recommendation & Alternative
Instead of automating Slack App provisioning via Slack CLI, we recommend providing a template **Slack App Manifest** in the repository.
Developers can copy the YAML manifest and create their Slack App inside the Slack Developer Console with one click.
This gives the user complete control over security, scopes, and app settings without introducing brittle CLI dependencies to the CDK synthesis process.

### Alternative Asset: `documentation/slack-app-manifest.yaml` (New File)
```yaml
display_information:
  name: AWS SQS DLQ Monitor
  description: Receives and processes alerts from CloudWatch Alarms.
  background_color: "#1e1e24"
features:
  bot_user:
    display_name: DLQ Alert Bot
    always_online: false
oauth_config:
  scopes:
    bot:
      - chat:write
      - chat:write.public
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

## Step-by-Step Implementation Guide
1. Create a new documentation file at `documentation/slack-app-manifest.yaml`.
2. Add the Slack App Manifest configuration above.
3. Update the main `README.md` file to reference this manifest file under a "Slack Setup" section, instructing users how to copy/paste the manifest into the Slack Developer Portal to generate their `SLACK_BOT_TOKEN`.

## Verification Plan
1. **Manual manifest review**: Verify that the Slack App Manifest can be successfully imported in the Slack Developer Console to create an app with the correct `chat:write` and `chat:write.public` scopes.
