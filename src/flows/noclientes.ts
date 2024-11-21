import dotenv from 'dotenv';
import OpenAI from 'openai';
import { callSendAPI } from '../utils/callSendAPI';
import { consultaVariations } from './consultaVariations';
import { followUpVariations } from './followUpVariations';
import { faqs } from './faqs';

dotenv.config();

// Inicializar OpenAI
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

// Estructura para manejar sesiones de usuarios
interface UserSession {
  state: string;
  timeoutHandle?: NodeJS.Timeout;
}

const userSessions: { [key: string]: UserSession } = {};

// Función para elegir un mensaje aleatorio
function getRandomConsultaMessage() {
  const randomIndex = Math.floor(Math.random() * consultaVariations.length);
  return consultaVariations[randomIndex];
}

// Función para elegir un mensaje aleatorio de interacción previa
function getRandomFollowUpMessage() {
  const randomIndex = Math.floor(Math.random() * followUpVariations.length);
  return followUpVariations[randomIndex];
}

// Función para buscar en las FAQs
function buscarFAQ(text: string): string | null {
  for (const faq of faqs) {
    if (text.toLowerCase().includes(faq.pregunta.toLowerCase())) {
      return faq.respuesta;
    }
  }
  return null;
}

// Flujo principal
export const obtenerRespuestaChatGPTFlow = async (
  senderId: string,
  text: string,
  platform: 'messenger' | 'instagram' // Agregar la plataforma
) => {
  console.log(`Iniciando flujo alternativo para ${senderId} en ${platform}...`);

  // Iniciar una nueva sesión para el usuario
  userSessions[senderId] = { state: 'waiting_for_initial_response' };

  // Mensaje inicial
  const initialMessage =
    '📲 Descarga nuestra app para registrarte y acceder a todos nuestros servicios:\n' +
    '👉 [https://bit.ly/3aIB8HL]\n\n' +
    '✨ ¡Te esperamos en CrediWeb!';

  const response1 = { text: initialMessage };
  await callSendAPI(platform, senderId, response1);

  // Mensaje aleatorio de consulta
  const randomMessage = getRandomConsultaMessage();
  console.log(`Mensaje aleatorio seleccionado: ${randomMessage}`);
  const response2 = { text: randomMessage };
  await callSendAPI(platform, senderId, response2);

  // Configurar un temporizador para terminar la conversación si el usuario no responde
  userSessions[senderId].timeoutHandle = setTimeout(() => {
    terminarConversacion(senderId, platform);
  }, 60000); // 60 segundos de espera
};

// Manejar la consulta después del mensaje aleatorio
export const manejarConsultaChatGPT = async (
  senderId: string,
  text: string,
  platform: 'messenger' | 'instagram' // Agregar la plataforma
) => {
  console.log(`Procesando consulta para ${senderId} en ${platform}...`);

  // Verificar si el usuario tiene una sesión activa
  if (!userSessions[senderId]) {
    console.log(`No hay sesión activa para ${senderId}. Iniciando nueva sesión.`);
    await obtenerRespuestaChatGPTFlow(senderId, text, platform); // Agregar el argumento platform
    return;
  }

  // Limpiar el temporizador anterior ya que el usuario respondió
  if (userSessions[senderId].timeoutHandle) {
    clearTimeout(userSessions[senderId].timeoutHandle);
    userSessions[senderId].timeoutHandle = undefined;
  }

  // Actualizar el estado de la sesión
  userSessions[senderId].state = 'processing_user_input';

  // Buscar en FAQs
  const faqResponse = buscarFAQ(text);
  if (faqResponse) {
    console.log('Se encontró una respuesta en las FAQs.');
    const response = { text: faqResponse };
    await callSendAPI(platform, senderId, response);
  } else {
    // Si no hay coincidencia en FAQs, usar OpenAI
    console.log('No se encontró respuesta en FAQs, utilizando OpenAI...');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente de Crediweb, una plataforma que ofrece préstamos personales en línea. Tu objetivo es ayudar a los usuarios a entender los servicios de Crediweb, como los requisitos para solicitar un préstamo, tasas de interés, plazos de pago, y cualquier otra consulta relacionada con los productos financieros de Crediweb. Recuerda alentar a las personas a descargar la aplicación desde [https://bit.ly/3aIB8HL]. Usa un lenguaje natural, amigable y sencillo ya que nuestro público es gente del común y puedes usar emoticones. Ten presente que actualmente la app solo está disponible para dispositivos Android y estamos trabajando para dispositivos iOS.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const openAIResponse =
        completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
      const response = { text: openAIResponse };
      await callSendAPI(platform, senderId, response);
    } catch (error) {
      console.error('Error al generar respuesta con OpenAI:', error);
      const response = { text: 'Lo siento, ocurrió un error al procesar tu consulta.' };
      await callSendAPI(platform, senderId, response);
    }
  }

  // Cambiar el estado a 'waiting_for_follow_up'
  userSessions[senderId].state = 'waiting_for_follow_up';

  // Configurar un temporizador antes de enviar el mensaje de seguimiento
  const delayInMilliseconds = 8000; // 8 segundos
  userSessions[senderId].timeoutHandle = setTimeout(async () => {
    // Enviar un nuevo mensaje aleatorio para continuar la conversación
    const followUpMessage = getRandomFollowUpMessage();

    console.log(`Mensaje aleatorio seleccionado para continuar: ${followUpMessage}`);
    const response = { text: followUpMessage };
    await callSendAPI(platform, senderId, response);

    // Cambiar el estado a 'waiting_for_user_response'
    userSessions[senderId].state = 'waiting_for_user_response';

    // Configurar otro temporizador para terminar la conversación si el usuario no responde
    userSessions[senderId].timeoutHandle = setTimeout(() => {
      terminarConversacion(senderId, platform);
    }, 60000); // 60 segundos de espera
  }, delayInMilliseconds);
};

function terminarConversacion(senderId: string, platform: 'messenger' | 'instagram') {
  console.log(`Terminando conversación con ${senderId} en ${platform} por inactividad.`);
  // Limpiar cualquier temporizador pendiente
  if (userSessions[senderId]?.timeoutHandle) {
    clearTimeout(userSessions[senderId].timeoutHandle!);
  }
  // Eliminar la sesión del usuario
  delete userSessions[senderId];
}