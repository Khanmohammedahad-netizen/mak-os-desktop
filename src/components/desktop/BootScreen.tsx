"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LINES = [
  'Initializing MAK OS Desktop v1.0...',
  'Loading system modules...',
  'Mounting CRM engine...',
  'Connecting analytics pipeline...',
  'Starting autonomous agents...',
  'System ready.',
];

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen = ({ onComplete }: BootScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'boot'>('logo');
  const [lines, setLines] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase('boot'), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'boot') return;
    let i = 0;
    const add = () => {
      setLines((p) => [...p, BOOT_LINES[i++]]);
      if (i < BOOT_LINES.length) {
        setTimeout(add, 240);
      } else {
        setTimeout(() => {
          setExiting(true);
          setTimeout(onComplete, 500);
        }, 500);
      }
    };
    const t = setTimeout(add, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#060608' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 mb-10"
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center border border-gold/25"
              style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)' }}
            >
              <span
                className="text-gold font-bold select-none"
                style={{ fontSize: '54px', fontFamily: '"Cormorant Garamond", serif', lineHeight: 1 }}
              >
                M
              </span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-text-primary tracking-[0.25em] uppercase">MAK OS</p>
              <p className="text-[10px] text-text-secondary/40 mt-1 tracking-widest uppercase">Desktop v1.0</p>
            </div>
          </motion.div>

          {/* Boot lines */}
          {phase === 'boot' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[11px] space-y-1.5 w-[280px]"
            >
              {lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={line === 'System ready.' ? 'text-green-400/60' : 'text-gold/30'}
                >
                  {line === 'System ready.' ? '✓ ' : '  '}{line}
                </motion.p>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
