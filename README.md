# sqs-dlq-monitoring
This is an AWS CDK construct which creates an AWS Simple-Queue Service (SQS) queue with an appropriately monitored Dead-Letter Queue (DLQ).

Based on the configuration, this so called `MonitoredQueue` construct will send messages to the specified locations to notify you if messages in the DLQ cross a certain threshold.

The following messaging locations are available:

- Email
- Slack

# Why?

SQS is a common part of most AWS infrastructures, and it is recommended to deploy a DLQ alongside it to catch any failed messages.

The problem is that a DLQ can only keep messages for a time of up to 14 days, and if this DLQ is not monitored, developers may not know that any messages have failed.

These messages would then be deleted at the end of the retention period.

This package aims to solve this problem by granting developers an easy way to deploy a solution to monitor and notify them if messages have failed.

# Deployed Infrastructure

To support this construct the following infrastucture is deployed:

- SQS Queue
- SQS DLQ
- SNS Topic
- CloudWatch Alarm
- Lambda Function

A representation of the infrastructure can be seen below.

![alt text](./documentation/infrastructure_diagram.png)

# Setting up Email notifications
When using the construct the following parameter is available for setting up a Email notifications:

- `emails`

## `emails`
A list of emails can be provided to the `emails` parameter. 

Please note that a subscription request will be sent out to each email which needs to be accepted.

Be sure to check your Spam folder!

# Setting up Slack notifications
When using the construct the following parameters are available for setting up a Slack notification:

- `slackToken`
- `slackChannel`

## Slack App
To setup this feature, a Slack App needs to be created and added to the desired workspace which will provide the method for generating a token and providing the correct access for the Lambda Function.

A guide to do so can be found here https://api.slack.com/start/quickstart


## `slackToken`
A Bot User token which will be provided to the `slackToken` parameter. 

The token requires the following scopes: 
  - `chat.write`
  - `chat.write.public`

## `slackChannel`
A channel that the bot will send messages to. 

The channel ID needs to be used as the `slackChannel` parameter.
