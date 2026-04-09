export type Scenario = 'branding' | 'performance' | 'informative';

export interface BriefData {
  brief: string;
  clientNeeds: string;
  scenario: Scenario;
}

export interface ProposalData {
  text?: string;
  image?: string; // base64
  imageMimeType?: string;
}

export interface ScorecardItem {
  category: string;
  score: number; // 1-5
  weight: number;
  weightedScore: number;
  description: string;
}

export interface EvaluationResult {
  alignment: {
    meetsObjective: { status: boolean; reason: string };
    targetLanguage: { status: boolean; reason: string };
    respectsConstraints: { status: boolean; reason: string };
  };
  conceptAnalysis: {
    originality: string;
    relevance: string;
    viability: string;
  };
  roast: string;
  verdict: {
    score: number; // 1-10
    recommendations: string[];
  };
  scorecard: ScorecardItem[];
  overallScore: number; // 0-100
}

export const SCENARIO_WEIGHTS: Record<Scenario, Record<string, number>> = {
  branding: {
    'Adecuación al brief': 10,
    'Claridad del mensaje': 10,
    'Jerarquía y lectura': 10,
    'Argumento y persuasión': 10,
    'Coherencia semiótica': 15,
    'Metáfora y concepto': 10,
    'Calidad formal': 10,
    'Tipografía': 5,
    'Color y contraste': 5,
    'Imagen / dirección de arte': 10,
    'Usabilidad y acción': 3,
    'Consistencia de marca': 10,
    'Viabilidad técnica': 2,
  },
  performance: {
    'Adecuación al brief': 8,
    'Claridad del mensaje': 12,
    'Jerarquía y lectura': 12,
    'Argumento y persuasión': 12,
    'Coherencia semiótica': 8,
    'Metáfora y concepto': 3,
    'Calidad formal': 8,
    'Tipografía': 5,
    'Color y contraste': 5,
    'Imagen / dirección de arte': 7,
    'Usabilidad y acción': 15,
    'Consistencia de marca': 3,
    'Viabilidad técnica': 2,
  },
  informative: {
    'Adecuación al brief': 10,
    'Claridad del mensaje': 18,
    'Jerarquía y lectura': 15,
    'Argumento y persuasión': 8,
    'Coherencia semiótica': 8,
    'Metáfora y concepto': 3,
    'Calidad formal': 8,
    'Tipografía': 10,
    'Color y contraste': 8,
    'Imagen / dirección de arte': 5,
    'Usabilidad y acción': 5,
    'Consistencia de marca': 2,
    'Viabilidad técnica': 3,
    'Cumplimiento legal': 15,
  },
};
