//messageHandler.ts


import { config } from 'dotenv'; // Import dotenv config
config(); // Configure dotenv

import { callSendAPI } from '../utils/callSendAPI';
import { obtenerRespuestaChatGPTFlow, manejarConsultaChatGPT } from '../flows/noclientes';
import { keywords } from '../config/keywords';



// Track user sessions
const userSessions: { [key: string]: { state: string; timeoutHandle?: NodeJS.Timeout } } = {};

export async function handleIncomingMessage(
  senderId: string,
  messageText: string,
  platform: 'messenger' | 'instagram'
) {
  try {
    console.log(`Processing message from ${senderId} on platform ${platform}: ${messageText}`);

    // Check if the user already has an active session
    if (userSessions[senderId]) {
      // If the user has an active session, handle the query
      await manejarConsultaChatGPT(senderId, messageText, platform);
    } else {
      // Normalize message to lowercase for keyword matching
      const lowerCaseMessage = messageText.toLowerCase();
      const isGreeting = keywords.greetings.some((keyword) =>
        lowerCaseMessage.includes(keyword)
      );

      if (isGreeting) {
        console.log(`Greeting detected for ${senderId}. Sending welcome message.`);
        // Send the initial greeting
        const response = {
          text: `Bienvenido a CrediWeb para ${platform}! 🌟 Soy tu asistente virtual 🤖.`,
        };
        await callSendAPI(platform, senderId, response);

        // Redirect to obtenerRespuestaChatGPTFlow after greeting
        await obtenerRespuestaChatGPTFlow(senderId, messageText, platform);
      } else {
        console.log('No matching keyword detected in the message.');
        const response = {
          text: 'Lo siento, no entendí tu mensaje. ¿Podrías repetirlo?',
        };
        await callSendAPI(platform, senderId, response);
      }
    }
  } catch (error) {
    console.error('Error processing the message:', error);
    // Default response in case of an error
    const response = {
      text: 'Ocurrió un error al procesar tu solicitud. Por favor, inténtalo más tarde.',
    };
    await callSendAPI(platform, senderId, response);
  }
}