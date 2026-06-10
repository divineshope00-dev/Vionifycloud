import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden notranslate"
      translate="no"
    >
      {/* Background Glows */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" 
      />

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tighter text-purple-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            Vionify
          </h1>
          
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
            className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent mt-4 rounded-full"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="text-zinc-500 text-sm tracking-[0.3em] uppercase font-medium"
        >
          Let your video sell for you
        </motion.p>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2 
              }}
              className="w-1.5 h-1.5 bg-purple-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
