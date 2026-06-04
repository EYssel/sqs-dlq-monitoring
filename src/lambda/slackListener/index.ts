import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

const SLACK_CHAT_POST_MESSAGE_ENDPOINT =
  'https://slack.com/api/chat.postMessage';

export const handler = async (event: {
  Records: { Sns: { Message: string } }[];
}) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);

    // 1. Try to parse configurations dynamically from the SNS message (AlarmDescription)
    let slackConfigs: { token: string; channel: string }[] = [];

    if (message.AlarmDescription) {
      const match = message.AlarmDescription.match(/\|\|slackConfigs:(.*?)\|\|/);
      if (match && match[1]) {
        try {
          slackConfigs = JSON.parse(match[1]);
        } catch (e) {
          console.error('Failed to parse slackConfigs from alarm description:', e);
        }
      }
    }

    // 2. If nothing found in SNS message, check the accumulated SLACK_CONFIGS env var (array format)
    if (slackConfigs.length === 0 && process.env.SLACK_CONFIGS) {
      try {
        slackConfigs = JSON.parse(process.env.SLACK_CONFIGS);
      } catch (e) {
        console.error('Failed to parse SLACK_CONFIGS environment variable:', e);
      }
    }

    // 3. Fallback to legacy single environment variables (fully backward-compatible)
    if (
      slackConfigs.length === 0 &&
      process.env.SLACK_BOT_TOKEN &&
      process.env.SLACK_CHANNEL
    ) {
      slackConfigs.push({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
      });
    }

    if (slackConfigs.length === 0) {
      console.warn('No Slack configurations found.');
      return;
    }

    // 4. Send the notification to all resolved Slack channels
    for (const config of slackConfigs) {
      await axios.post(
        SLACK_CHAT_POST_MESSAGE_ENDPOINT,
        {
          channel: config.channel,
          attachments: [
            {
              color: getMessageColor(message),
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: `${message.AlarmName} has been triggered!`,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: getMessageText(message),
                  },
                },
              ],
            },
          ],
        },
        {
          headers: {
            ContentType: 'application/json',
            Authorization: `Bearer ${config.token}`,
          },
        },
      );
    }
  } catch (error) {
    console.error(error);
  }
};

function getMessageColor(message: AlarmMessage) {
  return message.NewStateValue === 'ALARM' ? '#ff0000' : '#36a64f';
}

function getMessageText(message: AlarmMessage) {
  return `*State changed:*\n\n*_${message.OldStateValue}_* :arrow_right: *_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`;
}
