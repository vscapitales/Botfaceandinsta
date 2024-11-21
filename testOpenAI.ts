// testOpenAI.ts
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Error: OPENAI_API_KEY no está definida en las variables de entorno.");
  process.exit(1);
}
const openai = new OpenAI({ apiKey });

async function testOpenAI() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de prueba.',
        },
        { role: 'user', content: 'Hola, ¿cómo estás?' },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    console.log('Respuesta de OpenAI:', completion.choices[0]?.message?.content);
  } catch (error: any) {
    console.error('Error al conectar con OpenAI:', error.message || error);
  }
}

testOpenAI();
