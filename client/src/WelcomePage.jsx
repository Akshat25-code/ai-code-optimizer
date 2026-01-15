import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// LAVISH Floating Particles Component
const LavishFloatingParticles = () => {
  const particles = Array.from({ length: 80 }, (_, i) => {
    const animationClass = `lavishFloat${i % 3}`;
    const size = 3 + Math.random() * 8;
    const colors = ['#ffd700', '#ff6b9d', '#c471ed', '#12c2e9', '#00f5ff'];
    
    return (
      <div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `linear-gradient(45deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `${animationClass} ${3 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
          filter: 'blur(1px)',
          boxShadow: `0 0 ${size * 2}px ${colors[i % colors.length]}40`
        }}
      />
    );
  });
  
  return <div className="fixed inset-0 pointer-events-none lavish-floating-particles">{particles}</div>;
};

// LAVISH 3D Card Component  
const LavishCard3D = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 100, rotateX: 30, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
    transition={{ 
      duration: 1.2, 
      delay,
      type: "spring",
      stiffness: 100,
      damping: 15
    }}
    className={`lavish-3d-perspective lavish-hover-luxury ${className}`}
    style={{ transformStyle: 'preserve-3d' }}
  >
    {children}
  </motion.div>
);

// LAVISH Animated Button
const LavishButton = ({ children, onClick, className = '', variant = 'primary' }) => {
  return (
    <motion.button
      className={`lavish-button px-8 py-4 rounded-2xl text-lg font-bold ${className}`}
      onClick={onClick}
      whileHover={{ 
        scale: 1.08,
        rotateX: 10,
        y: -8,
        boxShadow: '0 25px 50px rgba(255,215,0,0.4), 0 0 50px rgba(255,105,180,0.3)'
      }}
      whileTap={{ 
        scale: 1.02,
        rotateX: 5,
        y: -3
      }}
      style={{
        background: variant === 'primary' 
          ? 'linear-gradient(135deg, #ffd700 0%, #ff6b9d 50%, #c471ed 100%)'
          : 'linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #ffd700 100%)',
        boxShadow: '0 15px 30px rgba(255,215,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <span className="relative z-10">{children}</span>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
        style={{
          animation: 'lavishGoldShimmer 3s ease-in-out infinite',
          transform: 'translateX(-100%) skewX(-12deg)'
        }}
      />
    </motion.button>
  );
};

// LAVISH Background Animation
const LavishAnimatedBackground = () => (
  <div className="fixed inset-0 -z-10">
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          'radial-gradient(circle at 20% 50%, rgba(255,215,0,0.15) 0%, transparent 50%)',
          'radial-gradient(circle at 80% 20%, rgba(255,107,157,0.15) 0%, transparent 50%)',
          'radial-gradient(circle at 40% 80%, rgba(196,113,237,0.15) 0%, transparent 50%)',
          'radial-gradient(circle at 60% 30%, rgba(18,194,233,0.15) 0%, transparent 50%)',
          'radial-gradient(circle at 20% 50%, rgba(255,215,0,0.15) 0%, transparent 50%)'
        ]
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
    />
    
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        background: 'linear-gradient(45deg, #ffd700, #ff6b9d, #c471ed, #12c2e9)',
        backgroundSize: '400% 400%',
        animation: 'lavishRainbow 8s ease infinite'
      }}
    />
  </div>
);

// Main LAVISH Welcome Page
const WelcomePage = ({ onStartOptimizing }) => {
  const [logoAnimation, setLogoAnimation] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLogoAnimation(prev => prev + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden">
      {/* LAVISH Background Effects */}
      <LavishAnimatedBackground />
      <LavishFloatingParticles />
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        
        {/* LAVISH Header with 3D Logo */}
        <LavishCard3D delay={0.2} className="text-center mb-20">
          <div className="lavish-glass-luxury rounded-3xl p-12">
            <motion.div
              animate={{ 
                rotateY: logoAnimation * 360,
                scale: [1, 1.1, 1],
                filter: [
                  'hue-rotate(0deg) brightness(1)',
                  'hue-rotate(180deg) brightness(1.3)',
                  'hue-rotate(360deg) brightness(1)'
                ]
              }}
              transition={{ 
                rotateY: { duration: 2, ease: "easeInOut" },
                scale: { duration: 4, repeat: Infinity },
                filter: { duration: 6, repeat: Infinity }
              }}
              className="inline-block mb-8"
            >
              <div 
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #ff6b9d, #c471ed)',
                  animation: 'lavishPulse 3s ease-in-out infinite',
                  boxShadow: '0 0 50px rgba(255,215,0,0.5), 0 0 100px rgba(255,107,157,0.3)'
                }}
              >
                <motion.svg 
                  className="w-12 h-12 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  animate={{ rotateZ: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </motion.svg>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-6xl md:text-8xl font-black mb-6 lavish-text-luxury"
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.5, delay: 0.5, type: "spring", stiffness: 100 }}
            >
              AI CODE OPTIMIZER
            </motion.h1>
            
            <motion.p 
              className="text-2xl md:text-3xl text-gray-200 max-w-4xl mx-auto leading-relaxed font-medium"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.8 }}
              style={{ textShadow: '0 2px 10px rgba(255,215,0,0.3)' }}
            >
              Transform your code with LAVISH AI technology. 
              Experience luxury-grade optimization with stunning visual effects.
            </motion.p>
          </div>
        </LavishCard3D>

        {/* LAVISH Hero Section */}
        <LavishCard3D delay={0.4} className="text-center mb-24">
          <motion.div
            className="lavish-glass-luxury rounded-3xl p-16"
            style={{ 
              background: 'linear-gradient(145deg, rgba(255,215,0,0.1), rgba(255,107,157,0.1), rgba(196,113,237,0.1))',
              backdropFilter: 'blur(40px) saturate(200%)'
            }}
          >
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8">
              <span className="lavish-text-luxury">LAVISH CODE PLATFORM</span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-5xl mx-auto leading-relaxed mb-12 font-medium">
              Experience the most luxurious code optimization platform ever created. 
              Built with enterprise-level sophistication and designed for the most discerning developers.
              Every animation, every effect, crafted to perfection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <LavishButton
                variant="primary"
                onClick={onStartOptimizing}
                className="w-full sm:w-auto text-xl px-12 py-6"
              >
                ✨ START OPTIMIZING ✨
              </LavishButton>
              
              <LavishButton
                variant="secondary"
                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                className="w-full sm:w-auto text-xl px-12 py-6"
              >
                🎭 EXPLORE LAVISH FEATURES 🎭
              </LavishButton>
            </div>
          </motion.div>
        </LavishCard3D>

        {/* LAVISH Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-24">
          {[
            {
              title: "🤖 AI LUXURY ENGINE",
              description: "Advanced machine learning with LAVISH visual processing. Experience optimization like never before with stunning real-time effects.",
              icon: "🤖",
              gradient: "linear-gradient(135deg, #ffd700, #ff6b9d)",
              delay: 0.2
            },
            {
              title: "💎 PREMIUM LANGUAGES",
              description: "Support for 50+ programming languages with luxury-grade optimization strategies and beautiful syntax highlighting.",
              icon: "�", 
              gradient: "linear-gradient(135deg, #ff6b9d, #c471ed)",
              delay: 0.4
            },
            {
              title: "⚡ LIGHTNING OPTIMIZATION",
              description: "Instant code improvements with LAVISH live preview, stunning animations, and performance metrics that dazzle.",
              icon: "⚡",
              gradient: "linear-gradient(135deg, #c471ed, #12c2e9)",
              delay: 0.6
            },
            {
              title: "🔒 FORTRESS SECURITY",
              description: "Military-grade security analysis with LAVISH vulnerability scanning and premium protection protocols.",
              icon: "🔒",
              gradient: "linear-gradient(135deg, #12c2e9, #00f5ff)",
              delay: 0.8
            },
            {
              title: "📊 LUXURY ANALYTICS",
              description: "Beautiful performance metrics with LAVISH data visualization, complexity analysis, and stunning improvement charts.",
              icon: "📊",
              gradient: "linear-gradient(135deg, #00f5ff, #ffd700)",
              delay: 1.0
            },
            {
              title: "👥 ELITE COLLABORATION",
              description: "Premium team collaboration tools with LAVISH shared workflows and luxury version control integration.",
              icon: "👥",
              gradient: "linear-gradient(135deg, #ffd700, #ff6b9d)",
              delay: 1.2
            }
          ].map((feature, index) => (
            <LavishCard3D key={index} delay={feature.delay}>
              <motion.div
                className="lavish-glass-luxury rounded-2xl p-8 h-full text-center"
                style={{ 
                  background: `linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,215,0,0.05))`,
                  backdropFilter: 'blur(30px) saturate(180%)'
                }}
                whileHover={{
                  background: feature.gradient,
                  color: 'white',
                  scale: 1.05,
                  rotateY: 10,
                  rotateX: 5
                }}
                transition={{ duration: 0.4 }}
              >
                <motion.div 
                  className="text-5xl mb-6"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotateZ: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    delay: index * 0.3
                  }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-black text-white mb-6 lavish-text-luxury">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            </LavishCard3D>
          ))}
        </div>

        {/* LAVISH Final CTA */}
        <LavishCard3D delay={0.6} className="text-center">
          <motion.div 
            className="lavish-glass-luxury rounded-3xl p-16"
            style={{
              background: 'linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,107,157,0.1))',
              animation: 'lavishBreathe 6s ease-in-out infinite'
            }}
          >
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8">
              <span className="lavish-text-luxury">READY FOR LUXURY?</span>
            </h2>
            
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-12 font-medium">
              Join the elite developers who demand LAVISH experiences. 
              Transform your code with unparalleled luxury and sophistication.
            </p>
            
            <LavishButton
              variant="primary"
              onClick={onStartOptimizing}
              className="text-2xl px-16 py-8"
            >
              🚀 LAUNCH LAVISH OPTIMIZER 🚀
            </LavishButton>
          </motion.div>
        </LavishCard3D>
      </div>
    </div>
  );
};

export default WelcomePage;