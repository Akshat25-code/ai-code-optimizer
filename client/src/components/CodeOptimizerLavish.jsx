import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CodeOptimizer = ({ onBackToWelcome }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [task, setTask] = useState('optimization');
  const [aiProvider, setAiProvider] = useState('auto');
  const [optimizedCode, setOptimizedCode] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationCount, setOptimizationCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (selectedLanguage) => {
    if (selectedLanguage === 'other') {
      setShowCustomLanguage(true);
      setLanguage('other');
    } else {
      setShowCustomLanguage(false);
      setLanguage(selectedLanguage);
      setCustomLanguage('');
    }
  };

  const getEffectiveLanguage = () => {
    return language === 'other' ? customLanguage : language;
  };

  const handleOptimizeCode = async () => {
    if (!code.trim()) {
      alert('Please enter some code to optimize!');
      return;
    }

    if (optimizationCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    setIsOptimizing(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8004/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: getEffectiveLanguage(),
          task: task,
          provider: aiProvider === 'auto' ? null : aiProvider
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setOptimizedCode(result.optimized_code || result.result || 'No optimization result received');
      setOptimizationCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Optimization failed:', error);
      setError(`Failed to optimize code: ${error.message}`);
      setOptimizedCode(`# ${task} result for ${language}:\n${code}\n\n# AI Suggestions:\n# - Connection to backend failed\n# - Using demo response\n# - Please check your backend server`);
      setOptimizationCount(prev => prev + 1);
    } finally {
      setIsOptimizing(false);
    }
  };

  // LAVISH Floating Particles - No cursor tracking to prevent blank screens
  const LavishCodeParticles = () => {
    const particles = Array.from({ length: 25 }, (_, i) => {
      const colors = ['#ffd700', '#ff6b9d', '#c471ed', '#12c2e9'];
      const size = 2 + Math.random() * 3;
      
      return (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            background: `linear-gradient(45deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${size * 3}px ${colors[i % colors.length]}50`
          }}
          animate={{
            x: [0, Math.random() * 30 - 15, 0],
            y: [0, Math.random() * 30 - 15, 0],
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3,
          }}
        />
      );
    });
    return <div className="fixed inset-0 pointer-events-none z-10">{particles}</div>;
  };

  // LAVISH 3D Card with spring animations
  const LavishCard3D = ({ children, className = '', delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ 
        duration: 1, 
        delay,
        type: "spring",
        stiffness: 80,
        damping: 15
      }}
      whileHover={{ 
        y: -8, 
        rotateX: 2,
        scale: 1.02,
        boxShadow: '0 25px 50px rgba(255,215,0,0.25)'
      }}
      className={`lavish-3d-perspective ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );

  // Authentication Modal
  const AuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotateX: 30 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="lavish-glass-luxury rounded-3xl p-10 max-w-lg text-center"
      >
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-3xl font-black lavish-text-luxury mb-6">
          Free Trial Complete!
        </h2>
        <p className="text-gray-300 mb-8 leading-relaxed text-lg">
          You've used your 2 free {task}s. Sign up to continue with unlimited LAVISH AI features!
        </p>
        <div className="flex gap-6 justify-center">
          <motion.button
            onClick={() => setShowAuthModal(false)}
            className="px-8 py-4 rounded-2xl font-bold text-lg"
            style={{
              background: 'linear-gradient(135deg, #64748b, #475569)',
              color: 'white'
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={() => alert('Login/Signup coming soon with more LAVISH features!')}
            className="lavish-button px-8 py-4 rounded-2xl font-bold text-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up Now
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="min-h-screen relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a0033 15%, #330066 35%, #4d0080 55%, #330066 75%, #1a0033 85%, #000000 100%)'
      }}
    >
      {/* LAVISH Animated Background */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 25% 60%, rgba(255,215,0,0.12) 0%, transparent 60%)',
              'radial-gradient(circle at 75% 30%, rgba(255,107,157,0.12) 0%, transparent 60%)',
              'radial-gradient(circle at 50% 80%, rgba(196,113,237,0.12) 0%, transparent 60%)',
              'radial-gradient(circle at 30% 20%, rgba(18,194,233,0.12) 0%, transparent 60%)'
            ]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 80% 70%, rgba(255,215,0,0.08) 0%, transparent 70%)',
              'radial-gradient(circle at 20% 40%, rgba(196,113,237,0.08) 0%, transparent 70%)',
              'radial-gradient(circle at 60% 10%, rgba(18,194,233,0.08) 0%, transparent 70%)',
              'radial-gradient(circle at 40% 90%, rgba(255,107,157,0.08) 0%, transparent 70%)'
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 2 }}
        />
      </div>
      
      {/* LAVISH Floating Particles - NO cursor tracking */}
      <LavishCodeParticles />
      
      {/* Authentication Modal */}
      {showAuthModal && <AuthModal />}
      
      {/* LAVISH Header */}
      <LavishCard3D delay={0.1}>
        <header className="lavish-glass-luxury p-8 mb-8 sticky top-0 z-30 rounded-b-3xl">
          <div className="flex justify-between items-center max-w-8xl mx-auto">
            <motion.button
              className="px-8 py-4 rounded-2xl font-bold text-lg"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackToWelcome}
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,107,157,0.15))',
                border: '2px solid rgba(255,215,0,0.4)',
                color: '#ffd700'
              }}
            >
              ← Back to Welcome
            </motion.button>
            
            <div className="flex items-center gap-6">
              <motion.div 
                animate={{ rotateY: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="text-4xl lavish-text-luxury"
              >
                ⚡
              </motion.div>
              <h1 className="text-3xl font-black lavish-text-luxury">
                AI CODE OPTIMIZER PRO
              </h1>
            </div>
            
            <motion.div 
              className="px-6 py-4 rounded-2xl font-bold text-lg"
              whileHover={{ scale: 1.05 }}
              style={{
                background: 'linear-gradient(135deg, rgba(18,194,233,0.25), rgba(0,245,255,0.15))',
                border: '2px solid rgba(18,194,233,0.4)',
                color: '#12c2e9'
              }}
            >
              <span className="text-2xl mr-3">💎</span>
              Free: {2 - optimizationCount}/2 left
            </motion.div>
          </div>
        </header>
      </LavishCard3D>

      {/* LAVISH Main Content */}
      <div className="max-w-8xl mx-auto px-8 grid lg:grid-cols-2 gap-10">
        
        {/* LAVISH Input Section */}
        <LavishCard3D delay={0.3}>
          <div className="lavish-glass-luxury rounded-3xl p-10 h-full relative">
            <div 
              className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
              style={{
                background: 'linear-gradient(90deg, #ffd700, #ff6b9d, #c471ed, #12c2e9)',
                animation: 'lavishRainbow 4s ease infinite'
              }}
            />
            
            <div className="flex items-center gap-4 mb-8">
              <motion.span 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl"
              >
                ⚖️
              </motion.span>
              <h2 className="text-2xl font-black lavish-text-luxury">CODE ANALYSIS SUITE</h2>
            </div>

            {/* LAVISH Controls */}
            <div className="space-y-6 mb-8">
              <div className="flex gap-6">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="lavish-button px-6 py-3 rounded-xl font-bold flex-1 text-lg"
                >
                  <option value="python">🐍 Python</option>
                  <option value="javascript">🌟 JavaScript</option>
                  <option value="java">☕ Java</option>
                  <option value="cpp">⚡ C++</option>
                  <option value="typescript">💙 TypeScript</option>
                  <option value="go">🐹 Go</option>
                  <option value="rust">🦀 Rust</option>
                  <option value="other">✨ Other</option>
                </select>

                <select
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="lavish-button px-6 py-3 rounded-xl font-bold text-lg"
                >
                  <option value="optimization">🚀 Optimize</option>
                  <option value="analysis">🔍 Analysis</option>
                  <option value="documentation">📚 Document</option>
                  <option value="refactoring">🏗️ Refactor</option>
                </select>
              </div>

              {showCustomLanguage && (
                <motion.input
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Enter language name..."
                  className="w-full px-6 py-3 rounded-xl bg-black bg-opacity-40 border-2 border-gold border-opacity-40 text-white placeholder-gray-400 focus:border-opacity-80 outline-none font-medium text-lg"
                />
              )}

              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="lavish-button px-6 py-3 rounded-xl font-bold w-full text-lg"
              >
                <option value="auto">🎯 Auto (Best Choice)</option>
                <option value="openai">🧠 OpenAI GPT</option>
                <option value="claude">🤖 Claude</option>
                <option value="gemini">💎 Google Gemini</option>
              </select>
            </div>

            {/* Code Input */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code here...

Example:
def hello_world():
    print('Hello, LAVISH World!')

hello_world()"
              className="w-full h-80 p-6 rounded-2xl font-mono text-base resize-none outline-none"
              style={{
                background: 'linear-gradient(145deg, rgba(0,0,0,0.6), rgba(26,32,44,0.4))',
                border: '2px solid rgba(255,215,0,0.3)',
                color: '#ffffff',
                backdropFilter: 'blur(15px)'
              }}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 rounded-xl bg-red-500 bg-opacity-25 border-2 border-red-500 border-opacity-40 text-red-300 font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* LAVISH Optimize Button */}
            <motion.button
              onClick={handleOptimizeCode}
              disabled={isOptimizing}
              className="w-full mt-8 py-5 rounded-2xl font-black text-xl relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isOptimizing 
                  ? 'linear-gradient(135deg, #64748b, #475569)'
                  : 'linear-gradient(135deg, #ffd700, #ff6b9d, #c471ed)',
                color: 'white',
                border: 'none',
                cursor: isOptimizing ? 'not-allowed' : 'pointer',
                boxShadow: '0 15px 35px rgba(255,215,0,0.4)'
              }}
            >
              {isOptimizing ? (
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🤖 Processing LAVISH Magic...
                </motion.span>
              ) : (
                <span>✨ {task.charAt(0).toUpperCase() + task.slice(1)} Code</span>
              )}
              
              {!isOptimizing && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40"
                  style={{
                    animation: 'lavishGoldShimmer 4s ease-in-out infinite',
                    transform: 'translateX(-100%) skewX(-15deg)'
                  }}
                />
              )}
            </motion.button>
          </div>
        </LavishCard3D>

        {/* LAVISH Output Section */}
        <LavishCard3D delay={0.5}>
          <div className="lavish-glass-luxury rounded-3xl p-10 h-full relative">
            <div 
              className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl"
              style={{
                background: 'linear-gradient(90deg, #12c2e9, #c471ed, #ff6b9d, #ffd700)',
                animation: 'lavishRainbow 4s ease infinite reverse'
              }}
            />
            
            <div className="flex items-center gap-4 mb-8">
              <motion.span 
                animate={{ rotateZ: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl"
              >
                ⚡
              </motion.span>
              <h2 className="text-2xl font-black lavish-text-luxury">
                {task.charAt(0).toUpperCase() + task.slice(1)} Result
              </h2>
            </div>

            <div
              className="w-full h-96 p-6 rounded-2xl font-mono text-base overflow-auto"
              style={{
                background: 'linear-gradient(145deg, rgba(0,0,0,0.7), rgba(26,32,44,0.5))',
                border: '2px solid rgba(18,194,233,0.3)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {optimizedCode ? (
                <pre className="text-green-300 whitespace-pre-wrap font-medium leading-relaxed">
                  {optimizedCode}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-gray-400">
                  {isOptimizing ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.3, 1], 
                          rotateZ: [0, 180, 360],
                          rotateY: [0, 180, 360]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-8xl mb-6"
                      >
                        🤖
                      </motion.div>
                      <div className="text-2xl font-bold text-blue-400 mb-4">
                        AI is {task}ing your {getEffectiveLanguage()} code...
                      </div>
                      <div className="text-lg opacity-70">
                        LAVISH magic is happening ✨
                      </div>
                    </motion.div>
                  ) : (
                    <div>
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-8xl mb-6 opacity-60"
                      >
                        💡
                      </motion.div>
                      <div className="text-2xl font-bold mb-4">
                        {task.charAt(0).toUpperCase() + task.slice(1)} results will appear here
                      </div>
                      <div className="text-lg opacity-60">
                        Enter code and click the LAVISH button to get started
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </LavishCard3D>
      </div>

      {/* LAVISH Features Info */}
      <LavishCard3D delay={0.7} className="mt-16 mb-8">
        <div className="max-w-8xl mx-auto px-8">
          <div className="lavish-glass-luxury rounded-3xl p-12 text-center">
            <motion.h3 
              className="text-3xl font-black lavish-text-luxury mb-12"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              LAVISH AI FEATURES
            </motion.h3>
            <div className="grid md:grid-cols-4 gap-10">
              <motion.div 
                whileHover={{ scale: 1.1, y: -8 }}
                className="text-center p-6 rounded-2xl"
                style={{ background: 'rgba(255,215,0,0.1)' }}
              >
                <div className="text-5xl mb-4">🚀</div>
                <div className="font-bold lavish-text-luxury text-lg">Performance Optimization</div>
                <div className="text-gray-400 mt-2">Speed up your code with AI</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -8 }}
                className="text-center p-6 rounded-2xl"
                style={{ background: 'rgba(255,107,157,0.1)' }}
              >
                <div className="text-5xl mb-4">🔍</div>
                <div className="font-bold lavish-text-luxury text-lg">Code Analysis</div>
                <div className="text-gray-400 mt-2">Deep insights and recommendations</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -8 }}
                className="text-center p-6 rounded-2xl"
                style={{ background: 'rgba(196,113,237,0.1)' }}
              >
                <div className="text-5xl mb-4">📚</div>
                <div className="font-bold lavish-text-luxury text-lg">Smart Documentation</div>
                <div className="text-gray-400 mt-2">Auto-generate documentation</div>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1, y: -8 }}
                className="text-center p-6 rounded-2xl"
                style={{ background: 'rgba(18,194,233,0.1)' }}
              >
                <div className="text-5xl mb-4">🏗️</div>
                <div className="font-bold lavish-text-luxury text-lg">Code Refactoring</div>
                <div className="text-gray-400 mt-2">Restructure for better quality</div>
              </motion.div>
            </div>
          </div>
        </div>
      </LavishCard3D>
    </motion.div>
  );
};

export default CodeOptimizer;

export function CodeOptimizerLavish(){ return null; }