// index.ts


import express, { Request, Response } from 'express';
import { config } from './config/dotenvConfig'; // Asegúrate de que la ruta sea correcta
import { handleIncomingMessage } from './utils/messageHandler';
import { initializeBot } from './bot';

const app = express();
app.use(express.json()); // Usar el middleware integrado de Express

// Función principal para inicializar el bot y manejar errores
(async () => {
  try {
    initializeBot();
    console.log('Bot iniciado y listo para operar');
  } catch (error) {
    console.error('Error al iniciar el bot:', error);
    process.exit(1); // Salir del proceso si hay un error crítico
  }
})();

// Endpoint para verificar el webhook
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === config.verifyToken) {
      console.log('WEBHOOK_VERIFICADO');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verificación fallida');
    }
  } else {
    res.status(400).send('Faltan parámetros en la solicitud');
  }
});

// Endpoint para manejar mensajes entrantes
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'page' || body.object === 'instagram') {
      body.entry.forEach(async (entry: any) => {
        let messagingEvents = [];

        if (entry.messaging) {
          // Eventos de Messenger
          messagingEvents = entry.messaging;
        } else if (entry.changes && entry.changes[0].value.messages) {
          // Eventos de Instagram
          messagingEvents = entry.changes[0].value.messages.map((msg: any) => ({
            sender: { id: msg.from },
            message: msg,
          }));
        }

        for (const event of messagingEvents) {
          const senderId = event.sender.id;
          const message = event.message;

          if (message && message.text) {
            const messageText = message.text.body || message.text;

            console.log(`Mensaje recibido: "${messageText}" de ${senderId}`);

            // Llama a tu función para manejar el mensaje
            await handleIncomingMessage(senderId, messageText);
          }
        }
      });
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    res.sendStatus(500);
  }
});

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`Servidor corriendo en http://localhost:${config.port}`);
});