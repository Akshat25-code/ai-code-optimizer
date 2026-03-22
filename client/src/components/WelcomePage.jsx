import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Zap, Target, Code2, Play, ArrowRight, Sparkles } from 'lucide-react';

const features = [
	{ icon: <Zap className="w-6 h-6" />, title: 'Hyper-Speed Execution', desc: 'Reduce architectural complexity and dramatically speed up runtime execution with deep AI-powered optimizations.' },
	{ icon: <Target className="w-6 h-6" />, title: 'Surgical Precision', desc: 'Pinpoint critical bottlenecks and obscure inefficiencies across 7 multidimensional quality metrics.' },
	{ icon: <Code2 className="w-6 h-6" />, title: 'Flawless Refactoring', desc: 'Re-architect module structure and elevate readability without altering intended behavior.' },
];

const featurePages = [
	{ icon: '🚀', title: 'Optimization Core', desc: 'Boost performance and maximum efficiency with intelligent heuristic suggestions', path: '/optimization', gradient: 'from-[#00f5d4]/20 to-[#10b981]/5', border: 'rgba(0,245,212,0.3)' },
	{ icon: '📊', title: 'Analysis Matrix', desc: 'Quality assessment across 7 dimensions with detailed granular scoring', path: '/analysis', gradient: 'from-[#00f5d4]/20 to-[#0ea5e9]/5', border: 'rgba(14,165,233,0.3)' },
	{ icon: '🐛', title: 'Anomaly Detection', desc: 'Preempt compile-time, runtime & logic errors before production shipment', path: '/bug-detection', gradient: 'from-[#ff716c]/20 to-[#f43f5e]/5', border: 'rgba(244,63,94,0.3)' },
	{ icon: '📚', title: 'Auto-Documentation', desc: 'Auto-generate comprehensive, standards-compliant specs from your codebase', path: '/documentation', gradient: 'from-[#a78bfa]/20 to-[#8b5cf6]/5', border: 'rgba(139,92,246,0.3)' },
	{ icon: '🏗️', title: 'Structural Refactoring', desc: 'Modernize structure and enforce strict design patterns systematically', path: '/refactoring', gradient: 'from-[#fbbf24]/20 to-[#f59e0b]/5', border: 'rgba(245,158,11,0.3)' },
	{ icon: '🔧', title: 'Intelligent Debugger', desc: 'AI-derived anomaly resolutions with comprehensive root cause analysis', path: '/debugging', gradient: 'from-[#10b981]/20 to-[#059669]/5', border: 'rgba(16,185,129,0.3)' },
];

const samples = [
	{
		title: 'Python: Two Sum Matrix',
		language: 'python',
		task: 'optimization',
		badge: 'Optimize',
		color: '#00f5d4',
		code: `# O(n²) version\n# Improve to O(n) using a hashmap\ndef two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return None`,
	},
	{
		title: 'JS: Edge-case Debounce',
		language: 'javascript',
		task: 'refactoring',
		badge: 'Refactor',
		color: '#fbbf24',
		code: `// Debounce with strict edge case bounds\nfunction debounce(fn, wait, immediate){\n  var timeout;\n  return function(){\n    var ctx = this, args = arguments;\n    var later = function(){\n      timeout = null;\n      if(!immediate) fn.apply(ctx, args);\n    };\n    clearTimeout(timeout);\n    timeout = setTimeout(later, wait);\n  }\n}`,
	},
	{
		title: 'C++: Vector Dedupe',
		language: 'cpp',
		task: 'analysis',
		badge: 'Analyze',
		color: '#8b5cf6',
		code: `#include <vector>\nusing namespace std;\nint removeDuplicates(vector<int>& nums){\n  int n = nums.size();\n  if(n==0) return 0;\n  int k = 0;\n  for(int i=1;i<n;i++){\n    if(nums[i]!=nums[k]){\n      k++; nums[k]=nums[i];\n    }\n  }\n  return k+1;\n}`,
	},
];

const stats = [
	{ value: '20+', label: 'Languages Supported' },
	{ value: '7.5x', label: 'Average Speedup' },
	{ value: '0-Copy', label: 'Intent Preservation' },
];

// Complex Animation variants
const staggerContainer = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.12, delayChildren: 0.1 }
	}
};

const fadeUp = {
	hidden: { opacity: 0, y: 30, scale: 0.95 },
	show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const slideInLeft = {
	hidden: { opacity: 0, x: -40 },
	show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

const WelcomePage = ({ onStart, onExample }) => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen theme-hero relative overflow-hidden bg-[var(--bg-color)]">
			{/* Epic Ambient Orbs */}
			<div className="pointer-events-none absolute -top-40 right-10 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse-glow" />
			<div className="pointer-events-none absolute bottom-0 left-[-20%] w-[1000px] h-[1000px] bg-blue-600/5 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

			<main className="max-w-[1400px] mx-auto px-6 relative z-10">
				{/* ═══ HERO SECTION ═══ */}
				<section className="pt-32 pb-24 text-center relative flex flex-col items-center justify-center min-h-[80vh]">
					{/* Glowing HUD Badge */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
						className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-10 shadow-[0_0_30px_rgba(0,245,212,0.2)]"
						style={{ background: 'var(--surface-2)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 245, 212, 0.4)' }}
					>
						<span className="relative flex h-2.5 w-2.5 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                        </span>
						Neural Engine v4 Active
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
						animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
						transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
						className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05]"
						style={{ color: 'var(--fg-color)' }}
					>
						Re-engineer code with
						<br />
						<span className="text-gradient-cyber inline-block animate-float" style={{ animationDelay: '0s' }}>absolute intent.</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="mt-8 text-muted text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light"
					>
						Deploy enterprise-grade AI algorithms to optimize vectors, resolve logical anomalies, and architect flawless systems in milliseconds.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.5 }}
						className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5"
					>
						<button
							onClick={() => (onStart ? onStart() : navigate('/optimize'))}
							className="group relative px-10 py-4 font-bold text-lg rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white overflow-hidden shadow-[0_0_40px_rgba(20,184,166,0.4)] hover:shadow-[0_0_60px_rgba(20,184,166,0.6)] transition-all duration-300 hover:scale-105"
						>
							<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
							<div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
							<span className="relative z-10 flex items-center justify-center gap-3">
								<Play className="w-5 h-5 fill-current" /> Initialize Optimizer
							</span>
						</button>
						<a href="#features" className="group px-8 py-4 font-bold text-lg rounded-2xl border-2 border-[var(--card-border)] hover:border-[var(--card-hover-border)] bg-[var(--surface-1)] text-[var(--fg-color)] transition-all duration-300 hover:bg-[var(--surface-2)] flex items-center gap-2">
							Explore Matrix <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</a>
					</motion.div>
				</section>

				{/* ═══ STATS BAR ═══ */}
				<motion.section 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className="pb-24 z-20 relative"
                >
					<div className="glass-frame p-2 relative overflow-hidden animate-stunning-glow" style={{ borderRadius: '24px' }}>
                        <div className="absolute inset-0 bg-[#050508]/80 backdrop-blur-3xl z-0" />
						<div className="relative z-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--card-border)]">
							{stats.map((s, i) => (
								<div key={s.label} className="text-center py-8 px-6 group hover:bg-[var(--surface-1)] transition-colors duration-500">
									<div className="text-4xl md:text-5xl font-black font-mono text-gradient-cyber mb-2 tracking-tight group-hover:scale-110 transition-transform duration-500 origin-bottom">{s.value}</div>
									<div className="text-sm uppercase tracking-widest font-bold text-muted">{s.label}</div>
								</div>
							))}
						</div>
					</div>
				</motion.section>

				{/* ═══ FEATURE HIGHLIGHTS ═══ */}
				<motion.section
					variants={staggerContainer}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true, margin: "-100px" }}
					className="pb-32"
				>
					<div className="grid lg:grid-cols-3 gap-8">
						{features.map((f, i) => (
							<motion.div
								key={f.title}
								variants={fadeUp}
								className="glass-frame p-8 sm:p-10 relative group overflow-hidden hover:scale-[1.02] transition-transform duration-500"
							>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-cyan)] opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity duration-700 blur-2xl" />
								<div className="w-14 h-14 rounded-2xl grid place-items-center mb-8 relative" style={{ background: 'var(--surface-2)', border: '1px solid var(--card-border)' }}>
                                    <div className="absolute inset-0 bg-[var(--accent-cyan)] opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-md rounded-2xl" />
                                    <span style={{ color: 'var(--accent-cyan)' }} className="relative z-10 group-hover:scale-110 transition-transform duration-300">{f.icon}</span>
								</div>
								<h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--fg-color)' }}>{f.title}</h3>
								<p className="text-base text-gray-400 leading-relaxed font-medium">{f.desc}</p>
							</motion.div>
						))}
					</div>
				</motion.section>

				{/* ═══ EXPLORE FEATURES ═══ */}
				<section id="features" className="pb-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-emerald-500/5 blur-[100px] pointer-events-none rounded-full" />
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="text-center mb-16 relative z-10"
					>
						<h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--fg-color)' }}>Core Subsystems</h2>
						<p className="text-xl text-muted font-light">Modular intelligent components for every development phase</p>
					</motion.div>

					<motion.div
						variants={staggerContainer}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, margin: "-50px" }}
						className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10"
					>
						{featurePages.map((f) => (
							<motion.button
								key={f.path}
								variants={fadeUp}
								onClick={() => navigate(f.path)}
								className={`glass-frame p-8 text-left group bg-gradient-to-br ${f.gradient} relative overflow-hidden transition-all duration-500 hover:-translate-y-2`}
                                style={{ border: `1px solid ${f.border}` }}
							>
                                <div className="absolute inset-0 bg-[#050508]/40 group-hover:bg-transparent transition-colors duration-500 z-0" />
								<div className="text-5xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 origin-bottom-left relative z-10 font-emoji drop-shadow-lg">{f.icon}</div>
								<div className="text-xl font-bold mb-3 relative z-10 tracking-tight" style={{ color: 'var(--fg-color)' }}>{f.title}</div>
								<div className="text-sm text-gray-300 leading-relaxed font-medium relative z-10">{f.desc}</div>
								<div className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest relative z-10 group-hover:translate-x-2 transition-transform duration-300" style={{ color: f.border.replace('0.3', '1') }}>
									Initialize <ArrowRight className="w-4 h-4" />
								</div>
							</motion.button>
						))}
					</motion.div>
				</section>

				{/* ═══ CODE EXAMPLES ═══ */}
				<section className="pb-32">
					<motion.div
						initial={{ opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						className="mb-12 flex items-end justify-between"
					>
						<div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: 'var(--fg-color)' }}>Terminal Feed</h2>
                            <p className="text-xl text-muted font-light">Pre-configured execution vectors ready for analysis</p>
                        </div>
					</motion.div>

					<motion.div
						variants={staggerContainer}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true, margin: "-100px" }}
						className="grid lg:grid-cols-3 gap-8"
					>
						{samples.map((s) => (
							<motion.div
								key={s.title}
								variants={fadeUp}
								className="glass-frame overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500"
							>
								<div className="p-5 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
									<div className="flex items-center gap-3">
										<span className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ color: s.color, backgroundColor: s.color }} />
										<div className="font-bold text-sm" style={{ color: 'var(--fg-color)' }}>{s.title}</div>
									</div>
									<span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold" style={{ border: `1px solid ${s.color}80`, color: s.color, background: `${s.color}15` }}>{s.badge}</span>
								</div>
								<div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050508]/80 pointer-events-none z-10 group-hover:opacity-0 transition-opacity duration-300" />
                                    <pre className="p-6 text-xs leading-loose overflow-hidden h-48 font-mono custom-scrollbar relative z-0" style={{ background: '#0a0a0f', color: 'var(--code-fg)' }}>
                                        {s.code}
                                    </pre>
                                </div>
								<div className="p-5 border-t border-[var(--card-border)] bg-[var(--surface-1)]">
									<button
										onClick={() => onExample ? onExample(s) : navigate('/optimize', { state: { prefill: s } })}
										className="w-full relative px-6 py-3 font-bold text-sm rounded-xl overflow-hidden group/btn text-white transition-all duration-300 shadow-[0_0_15px_currentColor]"
                                        style={{ color: s.color }}
									>
                                        <div className="absolute inset-0 opacity-20 transition-opacity duration-300 group-hover/btn:opacity-40" style={{ background: s.color }} />
                                        <div className="absolute inset-0 border border-current rounded-xl opacity-50" />
										<span className="relative z-10 flex items-center justify-center gap-2">
											<Play className="w-4 h-4 fill-current" /> Execute Sequence
										</span>
									</button>
								</div>
							</motion.div>
						))}
					</motion.div>
				</section>
			</main>

			{/* Footer */}
			<footer className="px-6 py-12 text-center relative z-10 mt-20" style={{ borderTop: '1px solid var(--card-border)', background: 'var(--surface-1)' }}>
				<div className="text-sm font-bold uppercase tracking-widest text-[var(--accent-cyan)] mb-2">Neural Code Engine v4</div>
				<p className="text-muted text-xs font-mono">Synthesizing perfection from entropy.</p>
			</footer>
		</div>
	);
};

export default WelcomePage;
