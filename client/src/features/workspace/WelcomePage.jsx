import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
} from 'framer-motion';
import {
  Zap, Activity, Bug, BookOpen, Layers, Wrench,
  ArrowRight, Play, ShieldCheck, FlaskConical,
} from 'lucide-react';

/* Real figures — sources in comments. Never invent metrics. */
const PROOF = [
  { value: '12/12', label: 'Sandbox escapes blocked', source: 'server/tests/test_sandbox_escape.py' },
  { value: '153', label: 'Backend checks green', source: 'pytest server/tests' },
  { value: '60', label: 'Research benchmark cases', source: 'research/dataset/seed.json' },
];

const HERO_BUGGY = [
  'def first_n(n):',
  '    out = []',
  '    for i in range(n + 1):',
  '        out.append(i)',
  '    return out',
];
const HERO_FIXED = [
  'def first_n(n):',
  '    out = []',
  '    for i in range(n):',
  '        out.append(i)',
  '    return out',
];

/* Pinned story: the same real bug, staged across scroll progress. */
const STORY_STAGES = [
  { lines: HERO_BUGGY, note: 'Submitted code: off-by-one, returns n+1 items.' },
  { lines: ['def first_n(n):', '    out = []', '    for i in range(n + 1):  # ← static flags this line', '        out.append(i)', '    return out'], note: 'Static analysis flags line 3.' },
  { lines: HERO_FIXED, note: 'AI fix applied. Sandbox runs both versions.' },
  { lines: HERO_FIXED, note: 'Outputs match. Proof recorded.', done: true },
];

const FEATURES = [
  { icon: <Zap size={22} />, title: 'Optimization', desc: 'Faster code with runtime proof, not promises.', path: '/optimization' },
  { icon: <Activity size={22} />, title: 'Analysis', desc: 'Complexity, quality and compliance scoring.', path: '/analysis' },
  { icon: <Bug size={22} />, title: 'Bug Detection', desc: 'Static scans plus AI review, ranked.', path: '/bug-detection' },
  { icon: <BookOpen size={22} />, title: 'Documentation', desc: 'Specs generated from your codebase.', path: '/documentation' },
  { icon: <Layers size={22} />, title: 'Refactoring', desc: 'Structure improvements that preserve behavior.', path: '/refactoring' },
  { icon: <Wrench size={22} />, title: 'Debugging', desc: 'Root-cause fixes with step-through traces.', path: '/debugging' },
];

const SAMPLES = [
  {
    title: 'Python: Two Sum',
    language: 'python',
    task: 'optimization',
    code: 'def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return None',
  },
  {
    title: 'JS: Debounce',
    language: 'javascript',
    task: 'refactoring',
    code: 'function debounce(fn, wait){\n  var timeout;\n  return function(){\n    var ctx = this, args = arguments;\n    clearTimeout(timeout);\n    timeout = setTimeout(function(){ fn.apply(ctx, args); }, wait);\n  }\n}',
  },
  {
    title: 'C++: Vector Dedupe',
    language: 'cpp',
    task: 'analysis',
    code: '#include <vector>\nusing namespace std;\nint removeDuplicates(vector<int>& nums){\n  int k = 0;\n  for(int i=1;i<(int)nums.size();i++){\n    if(nums[i]!=nums[k]){ k++; nums[k]=nums[i]; }\n  }\n  return k+1;\n}',
  },
];

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    if (!mq) return;
    setCoarse(mq.matches);
    const fn = (e) => setCoarse(e.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return coarse;
}

/** 3D tilting instrument with a looping buggy→fixed proof. */
function HeroInstrument() {
  const reduce = useReducedMotion();
  const coarse = useCoarsePointer();
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 260, damping: 30 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 260, damping: 30 });
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    if (reduce) {
      setFixed(true);
      return;
    }
    const t = setInterval(() => setFixed((v) => !v), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const onMove = (e) => {
    if (reduce || coarse || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  const lines = fixed ? HERO_FIXED : HERO_BUGGY;

  return (
    <div className="perspective-stage w-full max-w-xl mx-auto" style={{ perspective: '1000px' }}>
      {/* ghost layers (parallax depth, decorative) */}
      <div aria-hidden="true" className="absolute inset-x-8 top-10 bottom-[-16px] rounded-[14px] border hidden md:block" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-1)', transform: 'translateZ(-60px)', opacity: 0.6 }} />
      <div aria-hidden="true" className="absolute inset-x-16 top-20 bottom-[-32px] rounded-[14px] border hidden md:block" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-1)', transform: 'translateZ(-120px)', opacity: 0.35 }} />
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={reduce || coarse ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="instrument grain relative overflow-hidden"
      >
        <div className="gold-beam" aria-hidden="true" />
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E2607A]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8B84B]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
            <span className="ml-2 text-xs font-mono text-muted">first_n.py — live proof</span>
          </div>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
            style={fixed
              ? { color: '#3ECF8E', borderColor: 'rgba(62,207,142,.4)', background: 'rgba(62,207,142,.08)' }
              : { color: '#E8B84B', borderColor: 'rgba(232,184,75,.4)', background: 'rgba(232,184,75,.08)' }}
          >
            {fixed ? '✓ Outputs match' : '◌ Analyzing…'}
          </span>
        </div>
        <pre className="p-5 text-[13px] leading-6 font-mono overflow-x-auto min-h-[168px]" style={{ color: 'var(--code-fg)', background: 'var(--code-bg)' }}>
          {lines.map((l, i) => (
            <div key={i} className={fixed && i === 2 ? 'text-[#3ECF8E]' : !fixed && i === 2 ? 'text-[#E8B84B]' : undefined}>
              <span className="inline-block w-6 select-none opacity-40">{i + 1}</span>{l}
            </div>
          ))}
        </pre>
      </motion.div>
    </div>
  );
}

/** ONE pinned section: scrub-driven buggy→fixed morph (DESIGN.md §7b). */
function PinnedTransformation() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const wash = useTransform(scrollYProgress, [0.15, 0.85], ['0%', '100%']);

  return (
    <section ref={ref} className="relative" style={{ height: reduce ? 'auto' : '220vh' }}>
      <div className="md:sticky md:top-0 md:min-h-screen flex items-center py-24">
        <div className="max-w-3xl mx-auto px-6 w-full">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted mb-3">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-8" style={{ color: 'var(--fg-strong)' }}>
            Watch a bug become a proof.
          </h2>
          <ScrollMorph progress={scrollYProgress} wash={wash} reduced={reduce} />
        </div>
      </div>
    </section>
  );
}

function ScrollMorph({ progress, wash, reduced }) {
  const [k, setK] = useState(reduced ? STORY_STAGES.length - 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const unsub = progress.on('change', (v) => {
      setK(Math.min(STORY_STAGES.length - 1, Math.floor(v * STORY_STAGES.length)));
    });
    return unsub;
  }, [progress, reduced]);
  const stage = STORY_STAGES[k];

  return (
    <div className="instrument grain relative overflow-hidden">
      <div className="px-4 py-2.5 border-b text-xs font-mono text-muted" style={{ borderColor: 'var(--card-border)' }}>
        step {k + 1} / {STORY_STAGES.length} — {stage.done ? 'proven' : 'in progress'}
      </div>
      <div className="relative">
        <pre className="p-5 text-[13px] leading-6 font-mono overflow-x-auto" style={{ color: 'var(--code-fg)', background: 'var(--code-bg)' }}>
          {stage.lines.map((l, i) => (
            <div key={i}><span className="inline-block w-6 select-none opacity-40">{i + 1}</span>{l}</div>
          ))}
        </pre>
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ width: wash, background: 'linear-gradient(90deg, rgba(62,207,142,.14), transparent)', overflow: 'hidden' }}
          />
        )}
      </div>
      <div className="px-5 py-3 text-sm text-muted border-t" style={{ borderColor: 'var(--card-border)' }}>
        {stage.note}
      </div>
    </div>
  );
}

const WelcomePage = ({ onStart, onExample }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen theme-hero relative overflow-hidden">
      <main className="max-w-[1240px] mx-auto px-6 relative z-10">
        {/* ═══ HERO: headline + live proof ═══ */}
        <section className="pt-24 md:pt-32 pb-16 grid lg:grid-cols-2 gap-12 items-center min-h-[82vh]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
              style={{ background: 'var(--surface-1)', color: 'var(--accent-cyan)', border: '1px solid var(--card-border)' }}
            >
              <ShieldCheck size={14} /> Static analysis · AI review · Sandbox proof
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.04]"
              style={{ color: 'var(--fg-strong)' }}
            >
              Ship faster code,
              <br />
              proven correct.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-6 text-lg md:text-xl text-muted max-w-xl leading-relaxed"
            >
              Paste code, get an AI fix, and watch both versions execute in a
              sandbox. If the outputs match, it ships. If not, you see why.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <button
                onClick={() => (onStart ? onStart() : navigate('/optimize'))}
                className="btn-primary inline-flex items-center justify-center gap-3 px-10 py-4 text-lg"
              >
                <Play size={20} className="fill-current" /> Start optimizing — free
              </button>
              <a href="#how" className="px-2 py-4 text-base text-muted hover:opacity-100 underline underline-offset-8 decoration-1">
                Or see how it proves
              </a>
            </motion.div>
          </div>
          <HeroInstrument />
        </section>

        {/* ═══ PROOF STRIP (real numbers only) ═══ */}
        <section className="pb-20">
          <div className="instrument px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROOF.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl md:text-5xl font-bold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  {s.value}
                </div>
                <div className="text-sm uppercase tracking-widest font-semibold text-muted mt-2">{s.label}</div>
                <div className="text-[11px] font-mono text-muted mt-1 opacity-70">{s.source}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ PINNED TRANSFORMATION ═══ */}
        <div id="how">
          <PinnedTransformation />
        </div>

        {/* ═══ INSTRUMENT CARDS ═══ */}
        <section className="py-24">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Six instruments, one bench
            </h2>
            <p className="text-lg text-muted mt-3">Every capability below is live in this build.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.button
                key={f.path}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.35, delay: (i % 3) * 0.07 }}
                onClick={() => navigate(f.path)}
                className="instrument grain p-8 text-left group relative overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl grid place-items-center mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--card-border)', color: 'var(--accent-cyan)' }}>
                  {f.icon}
                </div>
                <h3 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--fg-strong)' }}>{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                  Open <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ═══ TRY-IT SAMPLES ═══ */}
        <section className="pb-28">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                Try it now
              </h2>
              <p className="text-lg text-muted mt-2">One click loads a real example into the optimizer.</p>
            </div>
            <FlaskConical className="text-muted hidden md:block" size={32} />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {SAMPLES.map((s) => (
              <div key={s.title} className="instrument overflow-hidden flex flex-col">
                <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--fg-strong)' }}>{s.title}</span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-mono" style={{ borderColor: 'var(--card-border)', color: 'var(--accent-cyan)' }}>
                    {s.language}
                  </span>
                </div>
                <pre className="p-5 text-xs leading-6 font-mono overflow-hidden h-44" style={{ color: 'var(--code-fg)', background: 'var(--code-bg)' }}>
                  {s.code}
                </pre>
                <div className="p-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                  <button
                    onClick={() => (onExample ? onExample(s) : navigate('/optimize', { state: { prefill: s } }))}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm"
                  >
                    <Play size={16} className="fill-current" /> Run this example
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default WelcomePage;
