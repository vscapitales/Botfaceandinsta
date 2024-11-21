// noclientes.ts

import dotenv from 'dotenv';
import OpenAI from 'openai';
import { callSendAPI } from '../utils/callSendAPI';
import { consultaVariations } from './consultaVariations';
import { followUpVariations } from './followUpVariations';
import { faqs } from './faqs';
import { getSession, createSession, updateSession, setTimeoutHandle, clearTimeoutHandle, deleteSession } from '../config/sessionManager';

dotenv.config();

// Inicializar OpenAI
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY no está definida en las variables de entorno.");
  process.exit(1); // Termina la ejecución del proceso con un código de error
}
const openai = new OpenAI({ apiKey });


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

function buscarFAQ(text: string): string | null {
  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .toLowerCase();

  const textoNormalizado = normalize(text);
  console.log(`Texto normalizado del usuario: "${textoNormalizado}"`);

  for (const faq of faqs) {
    const preguntaNormalizada = normalize(faq.pregunta);
    console.log(`Comparando con FAQ: "${preguntaNormalizada}"`);
    const regex = new RegExp(`\\b${preguntaNormalizada}\\b`, 'i');
    if (regex.test(textoNormalizado)) {
      console.log(`Coincidencia encontrada: "${faq.pregunta}"`);
      return faq.respuesta;
    }
  }
  console.log('No se encontró una coincidencia en las FAQs.');
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
  createSession(senderId, 'waiting_for_initial_response');

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
  const timeout = setTimeout(() => {
    terminarConversacion(senderId, platform);
  }, 60000); // 60 segundos de espera

  setTimeoutHandle(senderId, timeout);
};

// Manejar la consulta después del mensaje aleatorio
export const manejarConsultaChatGPT = async (
  senderId: string,
  text: string,
  platform: 'messenger' | 'instagram'
) => {
  console.log(`Procesando consulta para ${senderId} en ${platform}...`);

  // Verificar si el usuario tiene una sesión activa
  const session = getSession(senderId);
  if (!session) {
    console.log(`No hay sesión activa para ${senderId}. Iniciando nueva sesión.`);
    await obtenerRespuestaChatGPTFlow(senderId, text, platform);
    return;
  }

  // Limpiar el temporizador anterior si el usuario respondió
  if (session.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
    clearTimeoutHandle(senderId);
  }

  // Buscar en FAQs primero
  const faqResponse = buscarFAQ(text);
  if (faqResponse) {
    console.log('Se encontró una respuesta en las FAQs.');
    const response = { text: faqResponse };
    await callSendAPI(platform, senderId, response);
    return; // Termina aquí si se encontró una respuesta
  }

  console.log('No se encontró respuesta en FAQs, utilizando OpenAI...');
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asesor virtual de Crediweb, una plataforma que ofrece préstamos personales en línea. ' +
    'No puedes decir que ofrecemos servicios financieros. Tu objetivo es ayudar a los usuarios a entender los servicios de Crediweb, ' +
    'como los requisitos para solicitar un préstamo, tasas de interés, plazos de pago, y cualquier otra consulta relacionada con los productos de Crediweb. ' +
    'Recuerda alentar a las personas a descargar la aplicación desde [https://bit.ly/3aIB8HL]. Usa un lenguaje natural y sencillo ya que nuestro público es gente del común y puedes usar emoticones.' +
    'El monto máximo del préstamo es $750.000 y el monto minimo es de $150.000 con plazos hasta 90 días. No estamos aun disponibles para Iphone solo para Android. si no estas seguro d ela respuesta puedes invitarlos a la pagina web a obtener mas informacion ' 
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
  } catch (error: any) { // Asegurarse de capturar cualquier tipo de error
    console.error('Error al generar respuesta con OpenAI:', error.message || error);
    const response = { text: 'Lo siento, ocurrió un error al procesar tu consulta.' };
    await callSendAPI(platform, senderId, response);
  }
  

  // Cambiar el estado a 'waiting_for_follow_up'
  updateSession(senderId, 'waiting_for_follow_up');

  const delayInMilliseconds = 8000; // 8 segundos
  const followUpTimeout = setTimeout(async () => {
    const followUpMessage = getRandomFollowUpMessage();
    console.log(`Mensaje aleatorio seleccionado para continuar: ${followUpMessage}`);
    const response = { text: followUpMessage };
    await callSendAPI(platform, senderId, response);

    updateSession(senderId, 'waiting_for_user_response');

    // Configurar otro temporizador para terminar la conversación si el usuario no responde
    const finalTimeout = setTimeout(() => {
      terminarConversacion(senderId, platform);
    }, 60000); // 60 segundos de espera

    setTimeoutHandle(senderId, finalTimeout);
  }, delayInMilliseconds);

  setTimeoutHandle(senderId, followUpTimeout);
};

function terminarConversacion(senderId: string, platform: 'messenger' | 'instagram') {
  console.log(`Terminando conversación con ${senderId} en ${platform} por inactividad.`);
  // Limpiar cualquier temporizador pendiente
  clearTimeoutHandle(senderId);
  // Eliminar la sesión del usuario
  deleteSession(senderId);
}
