import React from 'react';
import { motion } from 'framer-motion';

const AmbientBackground = () => (
    <>
        <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-teal-500/15 blur-3xl"
        />
        <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="pointer-events-none absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-emerald-500/15 blur-3xl"
        />
    </>
);

export default AmbientBackground;

