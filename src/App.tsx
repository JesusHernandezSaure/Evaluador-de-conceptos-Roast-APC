import { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  Briefcase, 
  Target, 
  Image as ImageIcon, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  Trophy,
  AlertCircle,
  BarChart3,
  Upload,
  Download
} from 'lucide-react';
import { BriefData, ProposalData, EvaluationResult, Scenario } from './types';
import { evaluateCreative } from './services/geminiService';
import ScorecardChart from './components/ScorecardChart';
import { cn } from './lib/utils';

type Step = 'scenario' | 'brief' | 'proposal' | 'analyzing' | 'results';

export default function App() {
  const [step, setStep] = useState<Step>('scenario');
  const [briefData, setBriefData] = useState<BriefData>({
    brief: '',
    clientNeeds: '',
    scenario: 'branding',
  });
  const [proposalData, setProposalData] = useState<ProposalData>({
    text: '',
  });
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1200px
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setProposalData(prev => ({
            ...prev,
            image: compressedDataUrl,
            imageMimeType: 'image/jpeg'
          }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadReport = async () => {
    if (!result || !resultsRef.current) return;

    setIsDownloading(true);
    try {
      // Small delay to ensure all assets and animations are settled
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = resultsRef.current;
      
      // Warm-up call to ensure library cache is populated
      await htmlToImage.toPng(element);
      
      // Actual capture
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [element.offsetWidth, element.offsetHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
      pdf.save(`reporte-creativo-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const startAnalysis = async () => {
    setStep('analyzing');
    setError(null);
    try {
      const evalResult = await evaluateCreative(briefData, proposalData);
      setResult(evalResult);
      setStep('results');
    } catch (err) {
      console.error(err);
      setError('Hubo un error al analizar la propuesta. Por favor intenta de nuevo.');
      setStep('proposal');
    }
  };

  const reset = () => {
    setStep('scenario');
    setResult(null);
    setProposalData({ text: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">EVALUADOR<span className="text-orange-500"> APC</span></span>
          </div>
          {step !== 'scenario' && step !== 'analyzing' && step !== 'results' && (
            <div className="flex items-center gap-4 text-xs font-mono text-white/40">
              <span className={cn(step === 'brief' && "text-orange-500")}>01 BRIEF</span>
              <ChevronRight className="w-3 h-3" />
              <span className={cn(step === 'proposal' && "text-orange-500")}>02 PROPUESTA</span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'scenario' && (
            <motion.div
              key="scenario"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none">
                  EVALÚA TU <span className="text-orange-500 italic">CONCEPTO</span>
                </h1>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Selecciona el escenario de tu proyecto para aplicar los pesos estratégicos correctos en la evaluación.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['branding', 'performance', 'informative'] as Scenario[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setBriefData(prev => ({ ...prev, scenario: s }));
                      setStep('brief');
                    }}
                    className="group relative p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-orange-500/50 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {s === 'branding' && <Trophy className="w-16 h-16" />}
                      {s === 'performance' && <BarChart3 className="w-16 h-16" />}
                      {s === 'informative' && <FileText className="w-16 h-16" />}
                    </div>
                    <h3 className="text-xl font-bold capitalize mb-2">{s}</h3>
                    <p className="text-sm text-white/40">
                      {s === 'branding' && 'Enfoque en identidad, recordación y coherencia semiótica.'}
                      {s === 'performance' && 'Enfoque en conversión, claridad y usabilidad.'}
                      {s === 'informative' && 'Enfoque en legibilidad, jerarquía y cumplimiento.'}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'brief' && (
            <motion.div
              key="brief"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setStep('scenario')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold">Configura el Contexto</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">El Brief Estratégico</label>
                  <textarea
                    value={briefData.brief}
                    onChange={(e) => setBriefData(prev => ({ ...prev, brief: e.target.value }))}
                    placeholder="Objetivos, target y mensaje clave..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 focus:border-orange-500 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Necesidades del Cliente</label>
                  <textarea
                    value={briefData.clientNeeds}
                    onChange={(e) => setBriefData(prev => ({ ...prev, clientNeeds: e.target.value }))}
                    placeholder="Dolores específicos, presupuesto, miedos o restricciones..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 focus:border-orange-500 outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  disabled={!briefData.brief || !briefData.clientNeeds}
                  onClick={() => setStep('proposal')}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Siguiente Paso <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'proposal' && (
            <motion.div
              key="proposal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setStep('brief')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold">Sube la Propuesta</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Concepto o Copy</label>
                  <textarea
                    value={proposalData.text}
                    onChange={(e) => setProposalData(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Describe la idea, el concepto o pega el copy aquí..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 focus:border-orange-500 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Material Gráfico (Opcional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all overflow-hidden relative",
                      proposalData.image ? "border-orange-500/50 bg-orange-500/5" : "border-white/10 hover:border-white/20 bg-white/5"
                    )}
                  >
                    {proposalData.image ? (
                      <>
                        <img 
                          src={proposalData.image} 
                          className="absolute inset-0 w-full h-full object-contain p-4" 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-sm font-bold">Cambiar Imagen</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                          <Upload className="w-6 h-6 text-white/60" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold">Haz clic para subir imagen</p>
                          <p className="text-xs text-white/40">PNG, JPG o WEBP</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <button
                  disabled={!proposalData.text && !proposalData.image}
                  onClick={startAnalysis}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Iniciar Evaluación <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 space-y-8"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Evaluador de conceptos de APC para cliente Analizando...</h2>
                <p className="text-white/40 font-mono text-sm animate-pulse">
                  Comparando propuesta con brief estratégico...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'results' && result && (
            <motion.div
              key="results"
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12 pb-24 bg-[#0a0a0a]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={reset} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Nueva Evaluación
                  </button>
                  <button 
                    onClick={downloadReport}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {isDownloading ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                </div>
                <div className="px-4 py-1 bg-orange-500/10 border border-orange-500/50 rounded-full text-orange-500 text-xs font-bold uppercase tracking-widest">
                  {briefData.scenario}
                </div>
              </div>

              {/* Hero Score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
                    {result.overallScore}<span className="text-orange-500 text-4xl">/100</span>
                  </h1>
                  <p className="text-xl text-white/60 font-medium">
                    Puntuación Estratégica Final
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.alignment.meetsObjective.status ? (
                      <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OBJETIVO CUMPLIDO
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> OBJETIVO NO CUMPLIDO
                      </span>
                    )}
                  </div>
                </div>
                <ScorecardChart data={result.scorecard} />
              </div>

              {/* Alignment Diagnosis */}
              <section className="space-y-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-orange-500" /> Diagnóstico de Alineación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Objetivo Principal', data: result.alignment.meetsObjective },
                    { label: 'Lenguaje Target', data: result.alignment.targetLanguage },
                    { label: 'Restricciones', data: result.alignment.respectsConstraints },
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-white/40 uppercase">{item.label}</span>
                        {item.data.status ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm leading-relaxed">{item.data.reason}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* The Roast */}
              <section className="relative p-8 bg-orange-500/5 border border-orange-500/20 rounded-3xl overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Flame className="w-32 h-32 text-orange-500" />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-2xl font-bold flex items-center gap-2 text-orange-500">
                    <Flame className="w-6 h-6" /> Análisis Crítico APC
                  </h3>
                  <p className="text-lg italic leading-relaxed text-white/80">
                    "{result.roast}"
                  </p>
                </div>
              </section>

              {/* Concept Analysis */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <h4 className="font-bold text-white/40 uppercase text-xs tracking-widest">Originalidad</h4>
                  <p className="text-sm">{result.conceptAnalysis.originality}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-white/40 uppercase text-xs tracking-widest">Relevancia</h4>
                  <p className="text-sm">{result.conceptAnalysis.relevance}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-white/40 uppercase text-xs tracking-widest">Viabilidad</h4>
                  <p className="text-sm">{result.conceptAnalysis.viability}</p>
                </div>
              </section>

              {/* Image & Annotations */}
              {proposalData.image && (
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold">Análisis Visual</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <img 
                        src={proposalData.image} 
                        className="w-full h-auto rounded-lg" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest">Observaciones del Evaluador de APC para cliente</h4>
                      <div className="space-y-3">
                        {result.scorecard.filter(s => s.score < 4).map((item, i) => (
                          <div key={i} className="flex gap-3 p-4 bg-white/5 rounded-xl border-l-2 border-orange-500">
                            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold">{item.category}</p>
                              <p className="text-xs text-white/60">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Recommendations */}
              <section className="space-y-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" /> Veredicto y Recomendaciones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.verdict.recommendations.map((rec, i) => (
                    <div key={i} className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl relative overflow-hidden">
                      <span className="absolute -top-2 -right-2 text-6xl font-black text-green-500/10">{i + 1}</span>
                      <p className="relative z-10 text-sm font-medium leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/20 text-xs font-mono uppercase tracking-[0.2em]">
          Creative Evaluation Engine v1.0 • Powered by Gemini 3 Flash
        </div>
      </footer>
    </div>
  );
}
