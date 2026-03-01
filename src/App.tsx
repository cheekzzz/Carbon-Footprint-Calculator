/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import EmailPopup from './EmailPopup';
import { 
  Leaf, 
  Zap, 
  Car, 
  Utensils, 
  ShoppingBag, 
  Monitor, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { getEcoTips } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = 'energy' | 'transport' | 'food' | 'lifestyle' | 'digital';

interface Question {
  id: string;
  category: Category;
  label: string;
  options: { label: string; value: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'energy_use',
    category: 'energy',
    label: 'Household electricity use',
    options: [
      { label: 'Low (Efficient appliances, mindful usage)', value: 1 },
      { label: 'Moderate (Standard usage)', value: 2 },
      { label: 'High (Many devices, always on)', value: 3 },
    ],
  },
  {
    id: 'energy_source',
    category: 'energy',
    label: 'Primary energy source',
    options: [
      { label: 'Mostly renewable (Solar, Wind)', value: 1 },
      { label: 'Mixed / Unsure', value: 2 },
      { label: 'Mostly fossil-based', value: 3 },
    ],
  },
  {
    id: 'transport_mode',
    category: 'transport',
    label: 'Main daily transport',
    options: [
      { label: 'Walking / Cycling', value: 1 },
      { label: 'Public Transport', value: 2 },
      { label: 'Personal Vehicle', value: 3 },
    ],
  },
  {
    id: 'flights',
    category: 'transport',
    label: 'Flights per year',
    options: [
      { label: 'None', value: 1 },
      { label: '1–2 flights', value: 2 },
      { label: '3+ flights', value: 3 },
    ],
  },
  {
    id: 'diet',
    category: 'food',
    label: 'Your typical diet',
    options: [
      { label: 'Mostly plant-based', value: 1 },
      { label: 'Mixed / Vegetarian', value: 2 },
      { label: 'Meat-heavy', value: 3 },
    ],
  },
  {
    id: 'food_waste',
    category: 'food',
    label: 'Food waste habits',
    options: [
      { label: 'Very little waste', value: 1 },
      { label: 'Some waste', value: 2 },
      { label: 'Frequent waste', value: 3 },
    ],
  },
  {
    id: 'shopping',
    category: 'lifestyle',
    label: 'Shopping habits',
    options: [
      { label: 'Rare / Intentional', value: 1 },
      { label: 'Occasional', value: 2 },
      { label: 'Frequent / Fast fashion', value: 3 },
    ],
  },
  {
    id: 'electronics',
    category: 'lifestyle',
    label: 'Electronics replacement',
    options: [
      { label: 'Use as long as possible', value: 1 },
      { label: 'Every few years', value: 2 },
      { label: 'Frequent upgrades', value: 3 },
    ],
  },
  {
    id: 'screen_time',
    category: 'digital',
    label: 'Daily screen usage',
    options: [
      { label: 'Low (< 3 hours)', value: 1 },
      { label: 'Moderate (3–6 hours)', value: 2 },
      { label: 'High (> 6 hours)', value: 3 },
    ],
  },
  {
    id: 'energy_saving',
    category: 'digital',
    label: 'Energy-saving habits',
    options: [
      { label: 'Always mindful', value: 1 },
      { label: 'Sometimes', value: 2 },
      { label: 'Rarely', value: 3 },
    ],
  },
];

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  energy: <Zap className="w-5 h-5" />,
  transport: <Car className="w-5 h-5" />,
  food: <Utensils className="w-5 h-5" />,
  lifestyle: <ShoppingBag className="w-5 h-5" />,
  digital: <Monitor className="w-5 h-5" />,
};

interface Tip {
  title: string;
  description: string;
  impact: string;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<{
    scores: Record<Category, number>;
    level: string;
    tons: string;
    text: string;
    weightedScore: number;
  } | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  // state to control the email popup modal
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  
  // handlers for opening/closing the email popup
  const openEmailPopup = () => setShowEmailPopup(true);
  const closeEmailPopup = () => setShowEmailPopup(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  const handleAnswer = (value: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      calculateResults({ ...answers, [currentQuestion.id]: value });
    }
  };

  const calculateResults = async (finalAnswers: Record<string, number>) => {
    const scores: Record<Category, number> = {
      energy: 0,
      transport: 0,
      food: 0,
      lifestyle: 0,
      digital: 0,
    };

    QUESTIONS.forEach(q => {
      scores[q.category] += finalAnswers[q.id] || 0;
    });

    const weighted =
      scores.energy * 1.2 +
      scores.transport * 1.5 +
      scores.food * 1.2 +
      scores.lifestyle * 1 +
      scores.digital * 0.6;

    let level = "";
    let tons = "";
    let text = "";

    if (weighted < 12) {
      level = "Low-Impact Lifestyle";
      tons = "1.5–3 tons CO2/year";
      text = "Your choices are significantly more sustainable than the average. Keep leading the way!";
    } else if (weighted < 18) {
      level = "Moderate-Impact Lifestyle";
      tons = "3–6 tons CO2/year";
      text = "You're aligned with global averages, but there's room for meaningful improvement.";
    } else {
      level = "High-Impact Lifestyle";
      tons = "6–10+ tons CO2/year";
      text = "Your footprint is above average. Small changes in key areas can make a massive difference.";
    }

    setResults({ scores, level, tons, text, weightedScore: weighted });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1b7f5a', '#66d9a8', '#f5f5f0']
    });

    setIsGeneratingTips(true);
    const ecoTips = await getEcoTips(scores, level);
    setTips(ecoTips);
    setIsGeneratingTips(false);
  };

  const downloadCard = async () => {
    if (cardRef.current) {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = 'my-carbon-profile.png';
      link.href = dataUrl;
      link.click();
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
    setTips([]);
  };

  // generate a downloadable report (JSON) containing scores and tips
  const generateReportDownload = () => {
    if (!results) return;
    const payload = {
      scores: results.scores,
      level: results.level,
      tons: results.tons,
      text: results.text,
      tips,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eco-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-eco-green rounded-full flex items-center justify-center text-white shadow-lg">
            <Leaf className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-eco-green">Earthlyours</h1>
        </div>
        <p className="text-eco-dark/60 max-w-md mx-auto">
          Measure your lifestyle impact and discover where meaningful change begins.
        </p>
      </motion.header>

      <main className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white rounded-3xl shadow-2xl shadow-eco-green/5 p-8 md:p-12 border border-black/5"
            >
              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-eco-green/50">
                    Step {step + 1} of {totalSteps}
                  </span>
                  <span className="text-sm font-medium text-eco-green">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-eco-green/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-eco-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  />
                </div>
              </div>

              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-eco-green/10 text-eco-green rounded-xl">
                    {CATEGORY_ICONS[currentQuestion.category]}
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-eco-green/60">
                    {currentQuestion.category}
                  </h2>
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-medium text-eco-dark leading-tight">
                  {currentQuestion.label}
                </h3>
              </div>

              <div className="grid gap-4">
                {currentQuestion.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option.value)}
                    className="group flex items-center justify-between p-5 rounded-2xl border border-black/5 bg-eco-light/30 hover:bg-eco-green hover:text-white transition-all duration-300 text-left"
                  >
                    <span className="font-medium">{option.label}</span>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>

              <div className="mt-12 flex justify-between items-center">
                <button
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 text-sm font-semibold text-eco-dark/40 hover:text-eco-green disabled:opacity-0 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i === step ? "w-4 bg-eco-green" : "bg-eco-green/20"
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Profile Card */}
              <div 
                ref={cardRef}
                className="relative overflow-hidden bg-eco-dark rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl"
              >
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-eco-green/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-eco-green/10 blur-[100px] -ml-32 -mb-32 rounded-full" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-5 h-5 text-eco-green" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Earthlyours Profile</span>
                      </div>
                      <h2 className="text-4xl font-serif font-medium">{results.level}</h2>
                    </div>
                    <div className="text-right">
                      <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-white/40 mb-1">Estimated Footprint</span>
                      <span className="text-2xl font-serif text-eco-green">{results.tons}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                    {(Object.entries(results.scores) as [Category, number][]).map(([cat, score]) => (
                      <div key={cat} className="space-y-2">
                        <div className="flex items-center gap-2 text-white/40">
                          {CATEGORY_ICONS[cat]}
                          <span className="text-[0.6rem] font-bold uppercase tracking-wider">{cat}</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(score / 6) * 100}%` }}
                            className="h-full bg-eco-green"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <p className="text-sm text-white/60 max-w-xs text-center md:text-left italic">
                      "{results.text}"
                    </p>
                    <div className="text-center md:text-right">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/30 mb-2">earthlyours.com</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                        <CheckCircle2 className="w-4 h-4 text-eco-green" />
                        <span className="text-[0.7rem] font-medium">Verified Awareness</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Footprint Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Comparative Footprint</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md",
                        results.weightedScore < 15 ? "bg-eco-green/20 text-eco-green" : "bg-red-500/20 text-red-400"
                      )}>
                        {results.weightedScore < 15 ? "Below Average" : "Above Average"}
                      </span>
                    </div>
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      {/* Average Marker Line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-20" />
                      
                      {/* User Progress */}
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((results.weightedScore / 30) * 100, 100)}%` }}
                        className={cn(
                          "h-full transition-colors duration-1000",
                          results.weightedScore < 15 ? "bg-eco-green" : "bg-orange-500"
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-[0.5rem] font-bold uppercase tracking-tighter text-white/20">
                      <span>Minimal</span>
                      <span className="text-white/40">Global Average</span>
                      <span>High Impact</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Tips */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-serif font-medium text-eco-dark">Personalized Eco-Insights</h3>
                  {isGeneratingTips && (
                    <div className="flex items-center gap-2 text-xs text-eco-green font-medium animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      AI Analyzing...
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  {tips.length > 0 ? (
                    tips.map((tip, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-black/5 flex gap-4 items-start shadow-sm"
                      >
                        <div className={cn(
                          "p-3 rounded-2xl shrink-0",
                          tip.impact === 'High' ? "bg-red-50 text-red-500" : 
                          tip.impact === 'Medium' ? "bg-orange-50 text-orange-500" : 
                          "bg-blue-50 text-blue-500"
                        )}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-eco-dark">{tip.title}</h4>
                            <span className={cn(
                              "text-[0.6rem] font-bold uppercase px-2 py-0.5 rounded-full",
                              tip.impact === 'High' ? "bg-red-100 text-red-600" : 
                              tip.impact === 'Medium' ? "bg-orange-100 text-orange-600" : 
                              "bg-blue-100 text-blue-600"
                            )}>
                              {tip.impact} Impact
                            </span>
                          </div>
                          <p className="text-sm text-eco-dark/60 leading-relaxed">{tip.description}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : !isGeneratingTips && (
                    <div className="text-center py-8 text-eco-dark/40 italic text-sm">
                      Generating your custom action plan...
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={openEmailPopup}
                  className="flex-1 flex items-center justify-center gap-2 bg-eco-green text-white py-4 rounded-2xl font-bold shadow-lg shadow-eco-green/20 hover:bg-eco-green/90 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download My Eco Report
                </button>
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-eco-dark py-4 rounded-2xl font-bold border border-black/5 hover:bg-eco-light transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Recalculate
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-16 text-center text-eco-dark/30 text-xs font-medium tracking-widest uppercase">
        &copy; {new Date().getFullYear()} Earthlyours &bull; Awareness &rarr; Action &rarr; Impact
      </footer>

      {/* email popup modal */}
      <EmailPopup
        show={showEmailPopup}
        onClose={closeEmailPopup}
        onSuccess={generateReportDownload}
        reportData={results ? { scores: results.scores, level: results.level, tons: results.tons, text: results.text, tips } : undefined}
      />
    </div>
  );
}
