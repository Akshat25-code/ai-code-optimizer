import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Toast = ({ toast }) => (
    <AnimatePresence>
        {toast && (
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.3 }}
                className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
            >
                {toast.message}
            </motion.div>
        )}
    </AnimatePresence>
);

export const ProgressBar = ({ progressStep }) => (
    <AnimatePresence>
        {progressStep && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-teal-600/90 text-white shadow-md">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {progressStep === 'validating' && 'Validating input...'}
                    {progressStep === 'connecting' && 'Connecting to AI...'}
                    {progressStep === 'processing' && 'AI is thinking...'}
                    {progressStep === 'rendering' && 'Rendering results...'}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

