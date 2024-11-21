import express, { Request, Response } from 'express';
import { config } from './config/dotenvConfig'; // Asegúrate de que la ruta sea correcta
import { handleIncomingMessage } from './utils/messageHandler';
import { initializeBot } from './bot';

const app = express();
app.use(express.json()); // Usar el middleware integrado de Express

// Ruta principal para la página de presentación
app.get('/', (req: Request, res: Response) => {
  res.send(`
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook and Instagram Bot - Crediweb</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.6; }
        h1 { color: #2d89ef; }
        p, a { color: #555; }
        ul { margin: 1rem 0; }
        footer { margin-top: 2rem; font-size: 0.9rem; color: #888; }
        a { text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Crediweb's Instagram Bot</h1>
    <p>This bot automatically responds to common questions about our services on Instagram.</p>
    <h2>What does the bot do?</h2>
    <ul>
        <li>Answers frequently asked questions about loan requirements.</li>
        <li>Provides business hours.</li>
        <li>Offers basic information about our services.</li>
    </ul>
    <h2>Interaction examples</h2>
    <p>Here are some examples of messages you can try with our bot:</p>
    <ul>
        <li><strong>User:</strong> "What are the requirements for a loan?"</li>
        <li><strong>Bot:</strong> "To apply for a loan, you need to be over 18 years old, have an email address, and a bank account."</li>
        <li><strong>User:</strong> "What are your business hours?"</li>
        <li><strong>Bot:</strong> "Our business hours are Monday to Friday, from 9:00 a.m. to 5:00 p.m., and Saturdays from 8:00 a.m. to 1:00 p.m."</li>
    </ul>
    <p>For more information, visit our <a href="https://www.crediweb.com.co">official website</a>.</p>
    <footer>
        <p><a href="https://crediweb.com.co/datospersonales" target="_blank">Personal Data Policy</a></p>
        <p><a href="https://crediweb.com.co/terminos" target="_blank">Terms and Conditions</a></p>
    </footer>
</body>
</html>

  `);
});

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
        let messagingEvents: any[] = [];

        // Procesar eventos de Messenger
        if (entry.messaging) {
          messagingEvents = entry.messaging;
        }
        // Procesar eventos de Instagram
        else if (entry.changes && entry.changes[0].value.messages) {
          messagingEvents = entry.changes[0].value.messages.map((msg: any) => ({
            sender: { id: msg.from },
            message: { text: msg.text },
          }));
        }

        for (const event of messagingEvents) {
          const senderId = event.sender.id;
          const message = event.message;

          if (message && message.text) {
            const messageText = message.text.body || message.text;

            console.log(`Mensaje recibido: "${messageText}" de ${senderId}`);

            // Detectar la plataforma (Messenger o Instagram)
            const platform: 'messenger' | 'instagram' =
              body.object === 'page' ? 'messenger' : 'instagram';

            // Llama a tu función para manejar el mensaje
            await handleIncomingMessage(senderId, messageText, platform);
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