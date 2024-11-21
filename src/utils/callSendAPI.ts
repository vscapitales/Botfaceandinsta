//callsendapi.ts

import axios from 'axios';
import { config } from '../config/dotenvConfig';

// Función para enviar mensajes a través de la API de Facebook/Instagram
export async function callSendAPI(
  platform: 'messenger' | 'instagram',
  senderId: string,
  response: any
) {
  // Crear el objeto recipient basado en la plataforma
  const recipient = { id: senderId };

  // Crear el cuerpo de la solicitud
  const requestBody = {
    recipient,
    message: response,
  };

  // Determinar el token de acceso según la plataforma
  const accessToken =
    platform === 'instagram'
      ? config.instagramAccessToken
      : config.facebookPageAccessToken;

  // URL de la API de Graph para enviar mensajes
  const apiUrl = `https://graph.facebook.com/v21.0/me/messages`;

  try {
    // Hacer la solicitud POST a la API de Facebook/Instagram
    const res = await axios.post(apiUrl, requestBody, {
      params: { access_token: accessToken },
    });

    // Registro en consola en caso de éxito
    console.log(`Mensaje enviado con éxito en ${platform}:`, res.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Manejo específico para errores de Axios
      const statusCode = error.response?.status || 'Desconocido';
      const errorMessage = error.response?.data || error.message;
      console.error(
        `Error al enviar el mensaje en ${platform} (HTTP ${statusCode}):`,
        errorMessage
      );
    } else {
      // Manejo genérico para otros tipos de errores
      console.error(
        `Error inesperado al enviar el mensaje en ${platform}:`,
        error
      );
    }
  }
}