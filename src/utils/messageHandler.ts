import { config } from 'dotenv'; // Import dotenv config
config(); // Configure dotenv

import { callSendAPI } from '../utils/callSendAPI';
import { Wit } from 'node-wit';
import { obtenerRespuestaChatGPTFlow, manejarConsultaChatGPT } from '../flows/noclientes';

// Verify that the Wit.ai token is defined
const accessToken = process.env.WIT_AI_SERVER_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error('WIT_AI_SERVER_ACCESS_TOKEN is not defined in the environment variables.');
}

const witClient = new Wit({ accessToken });

// Track user sessions
const userSessions: { [key: string]: { state: string; timeoutHandle?: NodeJS.Timeout } } = {};

export async function handleIncomingMessage(
  senderId: string,
  messageText: string,
  platform: 'messenger' | 'instagram' // Restrict type to permitted values
) {
  try {
    console.log(`Processing message from ${senderId} on platform ${platform}: ${messageText}`);

    // Check if the user already has an active session
    if (userSessions[senderId]) {
      // If the user has an active session, handle the query
      await manejarConsultaChatGPT(senderId, messageText, platform); // Added `platform` argument
    } else {
      // Process the message with Wit.ai
      const witResponse = await witClient.message(messageText, {});

      // Validate the existence of intents before accessing the array
      const intent = witResponse.intents?.[0]?.name || null;

      if (intent === 'saludo') {
        // Response for greeting intent
        const response = {
          text: `Welcome to CrediWeb from ${platform}! 🌟 I'm your virtual assistant 🤖. I'm ready to help you.`,
        };
        await callSendAPI(platform, senderId, response);

        // Start the flow to handle ChatGPT interactions
        await obtenerRespuestaChatGPTFlow(senderId, messageText, platform); // Added `platform` argument
      } else if (intent) {
        // Handle other detected intents
        await obtenerRespuestaChatGPTFlow(senderId, messageText, platform); // Added `platform` argument
      } else {
        // If no intent was detected
        console.log('No intent detected in the message.');
        const response = {
          text: 'I’m sorry, I didn’t understand your message. Could you repeat it?',
        };
        await callSendAPI(platform, senderId, response);
      }
    }
  } catch (error) {
    console.error('Error processing the message:', error);
    // Default response in case of an error
    const response = {
      text: 'An error occurred while processing your request. Please try again later.',
    };
    await callSendAPI(platform, senderId, response);
  }
}