import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface EmailPopupProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reportData?: {
    scores: Record<string, number>;
    level: string;
    tons: string;
    text: string;
    tips: any[];
  };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailPopup({
  show,
  onClose,
  onSuccess,
  reportData
}: EmailPopupProps) {

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (show) {
      setEmail('');
      setError('');
      setIsSubmitting(false);
      setSuccess(false);
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload: any = {
        email,
        timestamp: new Date().toISOString()
      };

      if (reportData) {
        payload.scores = reportData.scores;
        payload.level = reportData.level;
        payload.tons = reportData.tons;
        payload.text = reportData.text;
        payload.tips = reportData.tips;
      }

      const response = await fetch('/carbon-calculator/save-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Request failed');

      setSuccess(true);

      if (onSuccess) onSuccess();

      setTimeout(() => onClose(), 1500);

    } catch (error) {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <motion.div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md bg-white rounded-2xl p-8 shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">
          Get Your Eco Report
        </h2>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded mb-2"
              placeholder="Enter your email"
            />

            {error && <p className="text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white p-2 rounded"
            >
              {isSubmitting ? 'Submitting...' : 'Get Report'}
            </button>
          </form>
        ) : (
          <p className="text-green-600 text-center">
            Success! Check your email.
          </p>
        )}

      </motion.div>

    </div>
  );
}