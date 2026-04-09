import { GoogleGenAI, Type } from "@google/genai";
import { BriefData, ProposalData, EvaluationResult, SCENARIO_WEIGHTS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function evaluateCreative(
  briefData: BriefData,
  proposalData: ProposalData
): Promise<EvaluationResult> {
  const weights = SCENARIO_WEIGHTS[briefData.scenario];
  const categories = Object.keys(weights);

  const systemInstruction = `Actúa como un Evaluador de conceptos de APC para cliente con alta experiencia estratégica. Tu objetivo es evaluar una propuesta creativa comparándola estrictamente con el Brief y las Necesidades del Cliente.

Debes analizar la propuesta y generar un informe de evaluación estructurado.
Si se proporciona una imagen, analízala visualmente en detalle (composición, color, tipografía, jerarquía).

INDICADORES PARA EL SCORECARD (Escala 1-5):
- Adecuación al brief: ¿Responde al problema, público, contexto y tono?
- Claridad del mensaje: ¿Se entiende rápido y sin ambigüedad? (Test 5 segundos)
- Jerarquía y lectura: ¿Orden de atención, escaneabilidad y ritmo?
- Argumento y persuasión: ¿Beneficio principal explícito y RTB (razón para creer)?
- Coherencia semiótica: ¿Estilo, símbolos y colores hablan el idioma del target?
- Metáfora y concepto: ¿Se entiende rápido y no abre interpretaciones riesgosas?
- Calidad formal: ¿Orden visual, retícula, balance y consistencia?
- Tipografía: ¿Legibilidad real y jerarquía tipográfica?
- Color y contraste: ¿Funcionalidad e intención?
- Imagen / dirección de arte: ¿Pertinencia al mensaje y coherencia de estilo?
- Usabilidad y acción: ¿Conduce al comportamiento esperado sin fricción?
- Consistencia de marca: ¿Uso correcto de logo, paleta y estilos?
- Viabilidad técnica: ¿Se puede producir sin perder calidad?
- Cumplimiento legal: ¿Claims defensables y disclaimers legibles?

Estructura de respuesta esperada (JSON):
{
  "alignment": {
    "meetsObjective": { "status": boolean, "reason": string },
    "targetLanguage": { "status": boolean, "reason": string },
    "respectsConstraints": { "status": boolean, "reason": string }
  },
  "conceptAnalysis": {
    "originality": string,
    "relevance": string,
    "viability": string
  },
  "roast": string (Análisis crítico ejecutivo),
  "verdict": {
    "score": number (1-10),
    "recommendations": string[] (exactamente 3)
  },
  "scorecard": [
    {
      "category": string,
      "score": number (1-5),
      "description": string
    }
  ]
}

Categorías para el scorecard: ${categories.join(", ")}.
Por favor, sé honesto, directo y mantén un tono profesional pero audaz.`;

  const prompt = `
### CONTEXTO PARA LA EVALUACIÓN:
1. El Brief: ${briefData.brief}
2. Necesidades del Cliente: ${briefData.clientNeeds}
3. Propuesta Solución: ${proposalData.text || "Ver imagen adjunta"}

### ESCENARIO: ${briefData.scenario.toUpperCase()}

Analiza la propuesta y completa el scorecard para las categorías mencionadas.`;

  const parts: any[] = [{ text: prompt }];
  if (proposalData.image && proposalData.imageMimeType) {
    // Basic check to ensure image data isn't excessively large for the proxy
    const base64Data = proposalData.image.split(",")[1];
    if (base64Data.length > 10 * 1024 * 1024) { // 10MB limit check
      console.warn("Image data is very large, this might cause RPC errors.");
    }
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: proposalData.imageMimeType,
      },
    });
  }

  const generateWithRetry = async (retries = 2): Promise<any> => {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              alignment: {
                type: Type.OBJECT,
                properties: {
                  meetsObjective: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.BOOLEAN },
                      reason: { type: Type.STRING },
                    },
                    required: ["status", "reason"],
                  },
                  targetLanguage: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.BOOLEAN },
                      reason: { type: Type.STRING },
                    },
                    required: ["status", "reason"],
                  },
                  respectsConstraints: {
                    type: Type.OBJECT,
                    properties: {
                      status: { type: Type.BOOLEAN },
                      reason: { type: Type.STRING },
                    },
                    required: ["status", "reason"],
                  },
                },
                required: ["meetsObjective", "targetLanguage", "respectsConstraints"],
              },
              conceptAnalysis: {
                type: Type.OBJECT,
                properties: {
                  originality: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                  viability: { type: Type.STRING },
                },
                required: ["originality", "relevance", "viability"],
              },
              roast: { type: Type.STRING },
              verdict: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["score", "recommendations"],
              },
              scorecard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                  },
                  required: ["category", "score", "description"],
                },
              },
            },
            required: ["alignment", "conceptAnalysis", "roast", "verdict", "scorecard"],
          },
        },
      });
    } catch (error) {
      if (retries > 0) {
        console.warn(`RPC failed, retrying... (${retries} attempts left)`, error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateWithRetry(retries - 1);
      }
      throw error;
    }
  };

  const response = await generateWithRetry();

  const rawResult = JSON.parse(response.text);
  
  // Calculate weighted scores
  let totalWeightedScore = 0;
  const processedScorecard = rawResult.scorecard.map((item: any) => {
    const weight = weights[item.category] || 0;
    const weightedScore = (item.score / 5) * weight;
    totalWeightedScore += weightedScore;
    return {
      ...item,
      weight,
      weightedScore,
    };
  });

  return {
    ...rawResult,
    scorecard: processedScorecard,
    overallScore: Math.round(totalWeightedScore),
  };
}
