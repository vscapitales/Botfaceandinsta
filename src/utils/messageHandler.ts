import { config } from 'dotenv'; // Importar config de dotenv
config(); // Configurar dotenv

import { callSendAPI } from '../utils/callSendAPI';
import { Wit } from 'node-wit';
import { obtenerRespuestaChatGPTFlow, manejarConsultaChatGPT } from '../flows/noclientes';

// Verificar que el token de acceso esté definido
const accessToken = process.env.WIT_AI_SERVER_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error('WIT_AI_SERVER_ACCESS_TOKEN no está definido en las variables de entorno.');
}

const witClient = new Wit({ accessToken });

const userSessions: { [key: string]: { state: string; timeoutHandle?: NodeJS.Timeout } } = {};


export async function handleIncomingMessage(
  senderId: string,
  messageText: string,
  platform: 'messenger' | 'instagram' // Restringir el tipo a los valores permitidos
) {
  try {
    console.log(`Procesando mensaje de ${senderId} en la plataforma ${platform}: ${messageText}`);

    // Verificar si el usuario tiene una sesión activa
    if (userSessions[senderId]) {
      // Si el usuario ya tiene una sesión activa, manejar la consulta
      await manejarConsultaChatGPT(senderId, messageText, platform); // Se agregó el argumento `platform`
    } else {
      // Procesar el mensaje con Wit.ai
      const witResponse = await witClient.message(messageText, {});

      // Analizar la respuesta de Wit.ai y determinar la intención
      const intent = witResponse.intents[0]?.name;

      if (intent === 'saludo') {
        // Respuesta cuando se detecta un saludo
        const response = {
          text: `¡Bienvenido a CrediWeb desde ${platform}! 🌟 Soy tu asistente virtual 🤖. Estoy listo para ayudarte.`,
        };
        await callSendAPI(platform, senderId, response);

        // Iniciar el flujo obtenerRespuestaChatGPTFlow
        await obtenerRespuestaChatGPTFlow(senderId, messageText, platform); // Se agregó el argumento `platform`
      } else {
        // Iniciar el flujo obtenerRespuestaChatGPTFlow sin saludo previo
        await obtenerRespuestaChatGPTFlow(senderId, messageText, platform); // Se agregó el argumento `platform`
      }
    }
  } catch (error) {
    console.error('Error al procesar el mensaje:', error);
    // Respuesta predeterminada en caso de error
    const response = {
      text: 'Lo siento, no entendí tu mensaje. ¿Podrías repetirlo?',
    };
    await callSendAPI(platform, senderId, response);
  }
}