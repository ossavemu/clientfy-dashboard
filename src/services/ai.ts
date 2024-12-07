import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_IA_API_KEY || '');

export async function improvePrompt(originalPrompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

    const prompt = `Como experto en prompts para chatbots de WhatsApp Business, mejora el siguiente prompt.
    
    REGLAS IMPORTANTES:
    1. PRESERVAR SIEMPRE datos críticos del prompt original como:
       - Precios y planes
       - Datos de contacto
       - Nombres de productos específicos
       - Horarios de atención
       - Información de ubicación
       - Políticas y términos específicos
    
    2. El prompt mejorado debe:
       - Empezar con "Eres un [rol específico]..."
       - Definir claramente personalidad y comportamiento
       - Incluir instrucciones específicas de respuesta
       - Establecer límites claros
       - Mantener un tono profesional pero amigable
       - NO usar markdown, asteriscos ni formateo especial
       - NO usar emojis
       - NO incluir ejemplos de conversación
       - Usar texto plano y directo
    
    Ejemplo de buen formato preservando datos críticos:
    "Eres un asesor de ventas especializado en planes de internet. Tu objetivo es ayudar a los clientes a elegir el mejor plan según sus necesidades. Debes mantener un tono profesional pero amigable, explicar los beneficios de cada plan y aclarar todas las dudas sobre el servicio. Los planes disponibles son: Plan Básico $29.99/mes (30 Mbps), Plan Premium $49.99/mes (100 Mbps), Plan Pro $79.99/mes (300 Mbps). Horario de atención: Lunes a Viernes 9am-6pm. Para instalaciones contactar al: 555-0123. No puedes modificar precios ni ofrecer descuentos no autorizados."

    Prompt a mejorar:
    ${originalPrompt}

    Responde SOLO con el prompt mejorado, sin explicaciones ni comentarios adicionales.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response
      .text()
      .replace(/```/g, '')
      .replace(/\*/g, '')
      .replace(/markdown/g, '')
      .replace(/\n\n/g, '\n')
      .trim();
  } catch (error) {
    console.error('Error mejorando prompt:', error);
    throw new Error('No se pudo mejorar el prompt');
  }
}
