import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

const SLACK_CHAT_POST_MESSAGE_ENDPOINT =
  'https://slack.com/api/chat.postMessage';

export const handler = async (event: {
  Records: { Sns: { Message: string } }[];
}) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);

    await axios.post(
      SLACK_CHAT_POST_MESSAGE_ENDPOINT,
      {
        channel: process.env.SLACK_CHANNEL,
        // text: getTextMessage(message),
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
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    );
  } catch (error) {
    console.error(error);
  }
};

function getMessageColor(message: AlarmMessage) {
  return message.NewStateValue === 'ALARM' ? '#ff0000' : '#36a64f';
}

function getMessageText(message: AlarmMessage) {
  return `*State changed:*\n\n*_${message.OldStateValue}_*:arrow_right:*_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`;
}
