import { AlarmMessage } from '../alarmMessage';

export const handler = async (event) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);

    console.log(message.AlarmName);

    // send google chat message
  } catch (error) {
    console.error(error);
  }
};