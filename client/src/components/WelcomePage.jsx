import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Zap, Target, Code2, Play } from 'lucide-react';

const features = [
	{ icon: <Zap className="w-5 h-5" />, title: 'Faster Performance', desc: 'Reduce complexity and speed up execution.' },
	{ icon: <Target className="w-5 h-5" />, title: 'Precision Analysis', desc: 'Pinpoint bottlenecks and inefficiencies.' },
	{ icon: <Code2 className="w-5 h-5" />, title: 'Clean Refactors', desc: 'Improve readability without changing behavior.' },
];

const samples = [
	{
		title: 'Python: Two Sum (optimize)',
		language: 'python',
		task: 'optimization',
		code: `# O(n^2) version\n# Improve to O(n) using a hashmap\ndef two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return None`,
	},
	{
		title: 'JS: Debounce (refactor)',
		language: 'javascript',
		task: 'refactoring',
		code: `// Debounce with some edge cases\nfunction debounce(fn, wait, immediate){\n  var timeout;\n  return function(){\n    var ctx = this, args = arguments;\n    var later = function(){ timeout = null; if(!immediate) fn.apply(ctx, args); };\n    var callNow = immediate && !timeout;\n    clearTimeout(timeout);\n    timeout = setTimeout(later, wait);\n    if(callNow) fn.apply(ctx, args);\n  }\n}`,
	},
	{
		title: 'C++: Remove Duplicates (analyze)',
		language: 'cpp',
		task: 'analysis',
		code: `#include <vector>\nusing namespace std;\nint removeDuplicates(vector<int>& nums){\n  int n = nums.size();\n  if(n==0) return 0;\n  int k = 0;\n  for(int i=1;i<n;i++){\n    if(nums[i]!=nums[k]){\n      k++;\n      nums[k]=nums[i];\n    }\n  }\n  return k+1;\n}`,
	},
];

const WelcomePage = ({ onStart, onExample }) => {
	const navigate = useNavigate();
	return (
		<div className="min-h-screen theme-hero relative overflow-hidden">
			{/* soft gradient blobs */}
			<motion.div
				aria-hidden
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="pointer-events-none absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-purple-600/20 blur-3xl"
			/>
			<motion.div
				aria-hidden
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.15 }}
				className="pointer-events-none absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-blue-600/20 blur-3xl"
			/>

			{/* page header (not the global nav) */}
			<header className="relative z-10 themed-header">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 grid place-items-center">
						<Brain className="w-6 h-6" />
					</div>
					<span className="text-lg font-semibold">AI Code Optimizer</span>
				</div>
			</header>

			{/* hero */}
			<main className="max-w-7xl mx-auto px-6">
				<section className="py-20 text-center">
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="text-4xl md:text-6xl font-bold tracking-tight"
					>
						Optimize code with confidence
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="mt-5 text-muted text-lg max-w-2xl mx-auto"
					>
						Get fast, reliable AI suggestions to improve performance, readability, and maintainability — without changing
						intent.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="mt-10 flex items-center justify-center gap-3"
					>
						<button onClick={() => (onStart ? onStart() : navigate('/optimize'))} className="btn-primary flex items-center gap-2">
							<Play className="w-5 h-5" /> Start optimizing
						</button>
						<a href="#how" className="btn-secondary">
							How it works
						</a>
					</motion.div>
				</section>

				{/* features */}
				<section className="pb-10">
					<div className="grid md:grid-cols-3 gap-6">
						{features.map((f, i) => (
							<motion.div
								key={f.title}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.1 * i }}
								className="card p-6 transition-all"
							>
								<div className="w-10 h-10 rounded-lg grid place-items-center mb-3 text-purple-500" style={{ background: 'var(--card-bg)' }}>
									{f.icon}
								</div>
								<h3 className="font-semibold mb-1">{f.title}</h3>
								<p className="text-sm text-muted">{f.desc}</p>
							</motion.div>
						))}
					</div>
				</section>

				{/* examples */}
				<section className="pb-6">
					<div className="card p-6">
						<h3 className="text-xl font-bold mb-4">Quick examples</h3>
						<div className="grid md:grid-cols-3 gap-4">
							{samples.map((s) => (
								<div key={s.title} className="p-4 rounded-xl border border-theme" style={{ background: 'var(--card-bg)' }}>
									<div className="text-sm text-purple-300 mb-1">{s.language} • {s.task}</div>
									<div className="font-medium mb-3">{s.title}</div>
									<pre className="text-xs themed-code rounded-lg p-3 h-28 overflow-auto whitespace-pre-wrap">{s.code}</pre>
									<button
										onClick={() => onExample ? onExample(s) : navigate('/optimize', { state: { prefill: s } })}
										className="mt-3 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm hover:from-purple-500 hover:to-blue-500"
									>
										Try this
									</button>
								</div>
							))}
						</div>
					</div>
				</section>

							{/* quick stats */}
							<section className="pb-6">
								<div className="grid md:grid-cols-3 gap-4 text-center">
									{[
										{ k: '20+', v: 'Languages supported' },
										{ k: '7+', v: 'Task modes' },
										{ k: '0-copy', v: 'Your intent preserved' },
									].map((s) => (
										<div key={s.v} className="p-5 rounded-xl border border-theme" style={{ background: 'var(--card-bg)' }}>
											<div className="text-2xl font-bold" style={{ color: 'var(--fg-color)' }}>{s.k}</div>
											<div className="text-sm text-muted">{s.v}</div>
										</div>
									))}
								</div>
							</section>

							{/* what is it */}
							<section className="py-10">
								<div className="card p-8">
									<h2 className="text-2xl font-bold mb-4">What is AI Code Optimizer?</h2>
									<p className="text-muted leading-relaxed">
										AI Code Optimizer is your developer sidekick for faster, cleaner, and safer code. Paste any snippet—across languages—and get
										actionable recommendations: performance tweaks, bug detection, security notes, documentation hints, and clear refactor steps.
										It’s trained to keep your intent intact while improving execution and readability.
									</p>
									<div className="grid md:grid-cols-3 gap-4 mt-6">
										<div className="p-5 rounded-xl border border-theme" style={{ background: 'var(--card-bg)' }}>
											<div className="text-sm font-semibold mb-1">Multi-language</div>
											<div className="text-sm text-muted">Works with popular languages and lets you specify any other.</div>
										</div>
										<div className="p-5 rounded-xl border border-theme" style={{ background: 'var(--card-bg)' }}>
											<div className="text-sm font-semibold mb-1">Task-focused</div>
											<div className="text-sm text-muted">Optimize, analyze, explain, debug, refactor or document—your call.</div>
										</div>
										<div className="p-5 rounded-xl border border-theme" style={{ background: 'var(--card-bg)' }}>
											<div className="text-sm font-semibold mb-1">Developer-first</div>
											<div className="text-sm text-muted">Concise, trustworthy output. No fluff, no hallucinated changes.</div>
										</div>
									</div>
								</div>
							</section>

									{/* why choose us */}
									<section className="py-6">
										<div className="grid md:grid-cols-3 gap-6">
											{[{
												title: 'Performance you can feel',
												desc: 'Guided optimizations that reduce time/space complexity and remove hidden bottlenecks.'
											},{
												title: 'Readable by design',
												desc: 'Refactors prefer clarity and maintainability; we preserve your original intent.'
											},{
												title: 'Actionable outputs',
												desc: 'Code-level diffs, bullet points, and rationale so you can apply changes with confidence.'
											}].map((b) => (
												<motion.div key={b.title} initial={{opacity:0, y:12}} whileInView={{opacity:1, y:0}} viewport={{once:true, amount:0.3}} transition={{duration:0.5}} className="card p-6">
													<div className="font-semibold mb-1">{b.title}</div>
													<div className="text-sm text-muted">{b.desc}</div>
												</motion.div>
											))}
										</div>
									</section>

									{/* capabilities */}
									<section className="py-6">
										<div className="card p-8">
											<h3 className="text-xl font-bold mb-4">Capabilities</h3>
											<div className="grid md:grid-cols-2 gap-4 text-sm text-muted">
												<ul className="space-y-2 list-disc list-inside">
													<li>Algorithmic optimizations and micro-optimizations</li>
													<li>Bug detection with suggested fixes and severity</li>
													<li>Complexity insights and performance notes</li>
													<li>Idiomatic refactors following language conventions</li>
												</ul>
												<ul className="space-y-2 list-disc list-inside">
													<li>Clear code explanations for rapid onboarding</li>
													<li>Documentation stubs and examples</li>
													<li>Security considerations and edge cases</li>
													<li>Works across languages, plus a custom “Other” mode</li>
												</ul>
											</div>
										</div>
									</section>

									{/* privacy & security */}
									<section className="py-6">
										<div className="card p-8 space-y-5">
											<div>
												<h3 className="text-xl font-bold mb-3">Privacy & Security</h3>
												<p className="text-sm text-muted leading-relaxed">
													Your code is processed transiently in-memory to produce optimizations or analysis. We do not persist raw snippets unless
													you explicitly save a session. Saved sessions store only the original code, generated optimization, and metadata; you can export or delete them any time. We never sell or train on your private code.
												</p>
											</div>
											<div className="grid md:grid-cols-3 gap-4 text-xs text-muted">
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Minimal retention</div>
													<div>Unsaved requests are discarded after response generation.</div>
												</div>
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Account data</div>
													<div>We store only your name, email, optional phone (hashed), and preferences.</div>
												</div>
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Secrets hygiene</div>
													<div>Keep API keys out of code; replace with placeholders like API_KEY_HERE.</div>
												</div>
											</div>
											<div className="pt-2 text-xs text-muted">
												Planned: end‑to‑end encryption for stored sessions, organization workspaces, audit trails.
											</div>
										</div>
									</section>

									{/* about project */}
									<section className="py-6">
										<div className="card p-8 space-y-4">
											<h3 className="text-xl font-bold">About this project</h3>
											<p className="text-sm text-muted leading-relaxed">AI Code Optimizer is a focused developer tool: no chat clutter, just structured outputs. It combines static patterns, heuristics, and model guidance to surface performance wins, refactor opportunities, and reliability improvements. The interface favors clarity and deterministic formatting so you can diff and apply changes quickly.</p>
											<div className="grid md:grid-cols-4 gap-4 text-xs">
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Stack</div>
													<div className="text-muted">React + FastAPI + MongoDB</div>
												</div>
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Auth Methods</div>
													<div className="text-muted">Email/Password, Phone, Google, GitHub, Facebook, LinkedIn</div>
												</div>
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Session Control</div>
													<div className="text-muted">JWT + server-side session hashing & revocation</div>
												</div>
												<div className="p-4 rounded-lg border border-theme" style={{ background: 'var(--card-bg)' }}>
													<div className="font-semibold mb-1">Exportability</div>
													<div className="text-muted">One-click export of optimization history</div>
												</div>
											</div>
										</div>
									</section>

									{/* FAQ */}
									<section className="py-6">
										<div className="card p-8">
											<h3 className="text-xl font-bold mb-4">FAQ</h3>
											<div className="grid md:grid-cols-2 gap-6 text-sm">
												<div>
													<div className="font-medium">Does it change my code automatically?</div>
													<div className="text-muted">No. You remain in control—review suggestions and apply what you like.</div>
												</div>
												<div>
													<div className="font-medium">What if my language isn’t listed?</div>
													<div className="text-muted">Choose “Other” and type it—our prompts adapt to your input.</div>
												</div>
											</div>
										</div>
									</section>

				{/* Use cases */}
				<section className="py-10">
					<div className="card p-8">
						<h3 className="text-xl font-bold mb-4">Where it helps most</h3>
						<div className="grid md:grid-cols-3 gap-4 text-sm text-muted">
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Backend services</div>
								<div>Reduce hot‑path latency, cache smarter, tighten DB access, and remove incidental allocations.</div>
							</div>
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Frontend apps</div>
								<div>Eliminate re‑renders, split bundles, memoize selectors, and simplify state updates.</div>
							</div>
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Data pipelines</div>
								<div>Stream instead of load‑all, vectorize operations, and surface memory/sort hotspots.</div>
							</div>
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Scripting / tooling</div>
								<div>Speed up everyday scripts and CLIs with smarter IO, caching and error handling.</div>
							</div>
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Libraries / SDKs</div>
								<div>Improve API ergonomics, reduce complexity, and add rationale docs for consumers.</div>
							</div>
							<div className="p-4 rounded-lg border border-theme" style={{background:'var(--card-bg)'}}>
								<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>Competitive coding</div>
								<div>Get complexity notes and edge‑case hints to move from AC to clean, optimal AC.</div>
							</div>
						</div>
					</div>
				</section>

				{/* Optimization strategies */}
				<section className="py-6">
					<div className="card p-8">
						<h3 className="text-xl font-bold mb-4">What optimizations you’ll see</h3>
						<div className="grid md:grid-cols-2 gap-6 text-sm text-muted">
							<ul className="space-y-2 list-disc list-inside">
								<li>Algorithmic: replace O(n²) with maps/sets/heap, early exits, pruning.</li>
								<li>Memory/locality: reuse buffers, avoid copies, prefer streaming.</li>
								<li>Concurrency: batching, async boundaries, contention awareness.</li>
								<li>IO: pagination, timeouts, backoff, N+1 query detection.</li>
							</ul>
							<ul className="space-y-2 list-disc list-inside">
								<li>Readability: small functions, clear naming, dead code removal.</li>
								<li>Safety: bounds checks, null/None guards, error paths, invariants.</li>
								<li>Docs: rationale, complexity notes, and “why this is safe”.</li>
								<li>Tests: minimal cases for happy path + 1–2 edge cases.</li>
							</ul>
						</div>
					</div>
				</section>

				{/* Supported languages */}
				<section className="py-6">
					<div className="card p-8">
						<h3 className="text-xl font-bold mb-4">Supported languages</h3>
						<div className="flex flex-wrap gap-2 text-sm">
							{['Python','JavaScript','TypeScript','C++','Java','Go','Rust','C#','PHP','Ruby','Swift','Kotlin','SQL','Shell','Other'].map(l => (
								<span key={l} className="px-3 py-1 rounded-full border border-theme" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>{l}</span>
							))}
						</div>
					</div>
				</section>

				{/* Task modes detail (sequential) */}
				<section className="py-6">
					<div className="card p-8">
						<h3 className="text-xl font-bold mb-4">Task modes</h3>
						<ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted counter-list">
							{[
								{ title: 'Optimize', desc: 'Reduce time/space complexity and micro‑tune hot paths without changing behavior.' },
								{ title: 'Analyze', desc: 'Explain complexity, highlight bottlenecks, and list actionable next steps.' },
								{ title: 'Bug Detection', desc: 'Identify likely bugs, risky branches, and missing edge‑case handling with suggested fixes.' },
								{ title: 'Explain', desc: 'Plain‑English walkthrough of what the code does, key invariants, and complexity notes.' },
								{ title: 'Debugging', desc: 'Surface suspicious state transitions, error paths, and add actionable probes.' },
								{ title: 'Document', desc: 'Readable summaries, rationale, and snippet‑level comments for teammates.' },
								{ title: 'Refactor', desc: 'Reorganize for clarity: naming, function boundaries, and duplication removal.' },
							].map((item, idx) => (
								<li key={item.title} className="p-4 rounded-lg border border-theme flex gap-3" style={{background:'var(--card-bg)'}}>
									<div className="shrink-0 w-8 h-8 rounded-full grid place-items-center font-semibold" style={{background:'rgba(99,102,241,0.15)', color:'var(--fg-color)'}}>{idx+1}</div>
									<div>
										<div className="font-semibold mb-1" style={{color:'var(--fg-color)'}}>{item.title}</div>
										<div>{item.desc}</div>
									</div>
								</li>
							))}
						</ol>
					</div>
				</section>


				{/* how it works */}
				<section id="how" className="py-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.3 }}
						transition={{ duration: 0.6 }}
						className="text-2xl font-bold mb-6 text-left"
					>
						How it works
					</motion.h2>
					<div className="grid md:grid-cols-3 gap-6">
					 {[
              { step: '1', title: 'Paste code', desc: 'Drop in any snippet or file segment.' },
              { step: '2', title: 'Pick intent', desc: 'Optimize, analyze, refactor or document.' },
              { step: '3', title: 'Review & apply', desc: 'Receive concise suggestions you can trust.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.05 * i }}
                className="card p-6"
              >
                <div className="text-sm text-purple-500 mb-2">Step {s.step}</div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-muted mt-1">{s.desc}</div>
              </motion.div>
            ))}
					</div>
				</section>
			</main>

			{/* footer */}
			<footer className="px-6 py-10 border-t border-theme text-center text-muted">
				Built for developers — subtle motion, zero noise.
			</footer>
		</div>
	);
};

export default WelcomePage;
