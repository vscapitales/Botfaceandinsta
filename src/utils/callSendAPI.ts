import axios, { AxiosError } from 'axios';
import { config } from '../config/dotenvConfig';

export async function callSendAPI(senderId: string, response: any) {
  const requestBody = {
    recipient: {
      id: senderId,
    },
    message: response,
  };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v16.0/me/messages`,
      requestBody,
      {
        params: { access_token: config.pageAccessToken },
      }
    );
    console.log('Mensaje enviado con éxito');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Manejo específico para errores de Axios
      console.error('No se pudo enviar el mensaje:', error.response?.data || error.message);
    } else {
      // Manejo genérico para otros tipos de errores
      console.error('No se pudo enviar el mensaje:', error);
    }
  }
};