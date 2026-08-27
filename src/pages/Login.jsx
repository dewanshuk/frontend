import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Login({ onLogin, isLoggingIn }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row overflow-hidden">
      {/* Left Hero Panel - Aesthetic Animated Background */}
      <div className="relative min-h-[55vh] md:w-[60%] overflow-hidden md:min-h-[100dvh]">

        {/* === BASE: soft indigo-slate gradient === */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e2d5a] via-[#2a3f7e] to-[#1a2550]" />
        {/* warm accent overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1e45]/60 via-transparent to-[#3b5bdb]/20" />

        {/* === LAYER 1: subtle fine grid === */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(148,163,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,255,0.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

        {/* === LAYER 2: soft glowing orbs === */}
        <div className="absolute w-[520px] h-[520px] rounded-full pointer-events-none orb-1"
          style={{background: 'radial-gradient(circle, rgba(99,120,255,0.28) 0%, transparent 65%)', top:'-12%', left:'-8%'}} />
        <div className="absolute w-[380px] h-[380px] rounded-full pointer-events-none orb-2"
          style={{background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 65%)', bottom:'8%', right:'-6%'}} />
        <div className="absolute w-[260px] h-[260px] rounded-full pointer-events-none orb-3"
          style={{background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%)', top:'38%', left:'28%'}} />


        {/* === LAYER 4: Large 3D floating icon illustrations === */}

        {/* Legal Document - top left */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'8%', left:'5%', '--fd':'0s', '--fdur':'5s'}}>
          <svg width="90" height="110" viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 12px 28px rgba(99,120,255,0.45))'}}>
            {/* Shadow */}
            <ellipse cx="45" cy="106" rx="28" ry="5" fill="rgba(30,45,120,0.35)"/>
            {/* Back page */}
            <rect x="18" y="8" width="58" height="76" rx="6" fill="rgba(99,120,255,0.25)" stroke="rgba(165,180,252,0.4)" strokeWidth="1"/>
            {/* Main page */}
            <rect x="12" y="4" width="58" height="76" rx="6" fill="rgba(255,255,255,0.18)" stroke="rgba(199,210,254,0.7)" strokeWidth="1.5"/>
            {/* Fold corner */}
            <path d="M54 4 L70 20 L54 20 Z" fill="rgba(165,180,252,0.35)" stroke="rgba(199,210,254,0.5)" strokeWidth="1"/>
            <path d="M54 4 L70 20" stroke="rgba(199,210,254,0.6)" strokeWidth="1.5"/>
            {/* Lines */}
            <rect x="20" y="28" width="32" height="3" rx="1.5" fill="rgba(199,210,254,0.7)"/>
            <rect x="20" y="36" width="38" height="2.5" rx="1.25" fill="rgba(165,180,252,0.5)"/>
            <rect x="20" y="43" width="34" height="2.5" rx="1.25" fill="rgba(165,180,252,0.5)"/>
            <rect x="20" y="50" width="28" height="2.5" rx="1.25" fill="rgba(165,180,252,0.4)"/>
            <rect x="20" y="57" width="36" height="2.5" rx="1.25" fill="rgba(165,180,252,0.4)"/>
            {/* Seal */}
            <circle cx="52" cy="62" r="9" fill="rgba(99,120,255,0.3)" stroke="rgba(165,180,252,0.6)" strokeWidth="1.5"/>
            <circle cx="52" cy="62" r="5" fill="rgba(165,180,252,0.4)"/>
            {/* Shine */}
            <rect x="14" y="6" width="20" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
          </svg>
        </div>

        {/* Shield / Policy - top right */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'15%', right:'6%', '--fd':'1.4s', '--fdur':'6s'}}>
          <svg width="88" height="100" viewBox="0 0 88 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 12px 28px rgba(139,92,246,0.45))'}}>
            <ellipse cx="44" cy="97" rx="24" ry="4.5" fill="rgba(30,20,80,0.35)"/>
            {/* Shield body */}
            <path d="M44 6 L76 18 L76 46 C76 66 60 82 44 90 C28 82 12 66 12 46 L12 18 Z" fill="rgba(139,92,246,0.22)" stroke="rgba(196,181,253,0.7)" strokeWidth="2"/>
            {/* Inner shield */}
            <path d="M44 14 L68 24 L68 46 C68 62 56 74 44 82 C32 74 20 62 20 46 L20 24 Z" fill="rgba(167,139,250,0.18)" stroke="rgba(196,181,253,0.45)" strokeWidth="1"/>
            {/* Checkmark */}
            <path d="M32 46 L40 54 L58 36" stroke="rgba(196,181,253,0.95)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Shine */}
            <path d="M20 22 Q44 14 68 22" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" strokeLinecap="round"/>
          </svg>
        </div>

        {/* AI Chatbot - middle left */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'48%', left:'4%', '--fd':'2.6s', '--fdur':'5.5s'}}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 12px 28px rgba(56,189,248,0.45))'}}>
            <ellipse cx="48" cy="93" rx="26" ry="5" fill="rgba(10,40,80,0.35)"/>
            {/* Bot head */}
            <rect x="14" y="18" width="68" height="52" rx="14" fill="rgba(56,189,248,0.2)" stroke="rgba(125,211,252,0.7)" strokeWidth="2"/>
            {/* Antenna */}
            <line x1="48" y1="18" x2="48" y2="8" stroke="rgba(125,211,252,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="48" cy="6" r="4" fill="rgba(56,189,248,0.5)" stroke="rgba(125,211,252,0.8)" strokeWidth="1.5"/>
            {/* Eyes */}
            <circle cx="34" cy="38" r="7" fill="rgba(56,189,248,0.35)" stroke="rgba(125,211,252,0.7)" strokeWidth="1.5"/>
            <circle cx="62" cy="38" r="7" fill="rgba(56,189,248,0.35)" stroke="rgba(125,211,252,0.7)" strokeWidth="1.5"/>
            <circle cx="34" cy="38" r="3.5" fill="rgba(125,211,252,0.9)"/>
            <circle cx="62" cy="38" r="3.5" fill="rgba(125,211,252,0.9)"/>
            {/* Mouth */}
            <path d="M32 54 Q48 64 64 54" stroke="rgba(125,211,252,0.8)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* Ears */}
            <rect x="6" y="32" width="8" height="16" rx="4" fill="rgba(56,189,248,0.3)" stroke="rgba(125,211,252,0.6)" strokeWidth="1.5"/>
            <rect x="82" y="32" width="8" height="16" rx="4" fill="rgba(56,189,248,0.3)" stroke="rgba(125,211,252,0.6)" strokeWidth="1.5"/>
            {/* Shine */}
            <rect x="18" y="20" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.12)"/>
          </svg>
        </div>

        {/* Declaration / Pen - bottom right */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'62%', right:'5%', '--fd':'0.9s', '--fdur':'6.5s'}}>
          <svg width="92" height="108" viewBox="0 0 92 108" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 12px 28px rgba(52,211,153,0.4))'}}>
            <ellipse cx="46" cy="105" rx="26" ry="5" fill="rgba(10,50,40,0.35)"/>
            {/* Clipboard */}
            <rect x="10" y="14" width="72" height="86" rx="8" fill="rgba(52,211,153,0.15)" stroke="rgba(110,231,183,0.6)" strokeWidth="1.5"/>
            {/* Clip */}
            <rect x="30" y="8" width="32" height="14" rx="7" fill="rgba(52,211,153,0.3)" stroke="rgba(110,231,183,0.7)" strokeWidth="1.5"/>
            <rect x="36" y="11" width="20" height="8" rx="4" fill="rgba(110,231,183,0.25)"/>
            {/* Lines */}
            <rect x="20" y="34" width="52" height="3" rx="1.5" fill="rgba(110,231,183,0.6)"/>
            <rect x="20" y="43" width="44" height="2.5" rx="1.25" fill="rgba(110,231,183,0.45)"/>
            <rect x="20" y="51" width="48" height="2.5" rx="1.25" fill="rgba(110,231,183,0.45)"/>
            <rect x="20" y="59" width="36" height="2.5" rx="1.25" fill="rgba(110,231,183,0.35)"/>
            {/* Checkboxes */}
            <rect x="20" y="70" width="10" height="10" rx="2" fill="rgba(52,211,153,0.3)" stroke="rgba(110,231,183,0.6)" strokeWidth="1.5"/>
            <path d="M22 75 L24 78 L29 72" stroke="rgba(110,231,183,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="20" y="84" width="10" height="10" rx="2" fill="rgba(52,211,153,0.15)" stroke="rgba(110,231,253,0.4)" strokeWidth="1.5"/>
            <rect x="36" y="72" width="28" height="2.5" rx="1.25" fill="rgba(110,231,183,0.4)"/>
            <rect x="36" y="87" width="22" height="2.5" rx="1.25" fill="rgba(110,231,183,0.3)"/>
            {/* Shine */}
            <rect x="14" y="16" width="22" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
          </svg>
        </div>

        {/* Training / Book - middle right */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'36%', right:'4%', '--fd':'3.8s', '--fdur':'4.5s'}}>
          <svg width="86" height="90" viewBox="0 0 86 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 10px 24px rgba(251,146,60,0.45))'}}>
            <ellipse cx="43" cy="87" rx="24" ry="4.5" fill="rgba(80,30,10,0.35)"/>
            {/* Back cover */}
            <rect x="20" y="8" width="52" height="68" rx="5" fill="rgba(251,146,60,0.2)" stroke="rgba(253,186,116,0.5)" strokeWidth="1"/>
            {/* Spine */}
            <rect x="14" y="6" width="12" height="72" rx="5" fill="rgba(251,146,60,0.35)" stroke="rgba(253,186,116,0.65)" strokeWidth="1.5"/>
            {/* Front cover */}
            <rect x="22" y="6" width="52" height="72" rx="5" fill="rgba(251,146,60,0.22)" stroke="rgba(253,186,116,0.7)" strokeWidth="1.5"/>
            {/* Pages edge */}
            <rect x="70" y="10" width="4" height="64" rx="2" fill="rgba(255,255,255,0.12)"/>
            {/* Lines */}
            <rect x="30" y="22" width="36" height="3" rx="1.5" fill="rgba(253,186,116,0.7)"/>
            <rect x="30" y="30" width="28" height="2.5" rx="1.25" fill="rgba(253,186,116,0.5)"/>
            <rect x="30" y="37" width="32" height="2.5" rx="1.25" fill="rgba(253,186,116,0.5)"/>
            <rect x="30" y="44" width="24" height="2.5" rx="1.25" fill="rgba(253,186,116,0.4)"/>
            {/* Bookmark */}
            <path d="M62 6 L62 28 L56 22 L50 28 L50 6 Z" fill="rgba(251,146,60,0.5)" stroke="rgba(253,186,116,0.7)" strokeWidth="1"/>
            {/* Shine */}
            <rect x="26" y="8" width="18" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
          </svg>
        </div>

        {/* Audit Checklist - bottom left */}
        <div className="absolute pointer-events-none tilt-float" style={{top:'76%', left:'12%', '--fd':'2s', '--fdur':'7s'}}>
          <svg width="84" height="90" viewBox="0 0 84 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:'drop-shadow(0 10px 24px rgba(167,139,250,0.4))'}}>
            <ellipse cx="42" cy="87" rx="22" ry="4" fill="rgba(40,20,80,0.35)"/>
            {/* Card */}
            <rect x="8" y="6" width="68" height="76" rx="8" fill="rgba(139,92,246,0.18)" stroke="rgba(196,181,253,0.6)" strokeWidth="1.5"/>
            {/* Header bar */}
            <rect x="8" y="6" width="68" height="18" rx="8" fill="rgba(139,92,246,0.3)"/>
            <rect x="8" y="16" width="68" height="8" fill="rgba(139,92,246,0.3)"/>
            <rect x="16" y="11" width="36" height="3" rx="1.5" fill="rgba(196,181,253,0.8)"/>
            {/* Rows */}
            {[0,1,2,3].map((i) => (
              <g key={i}>
                <rect x="16" y={32+i*14} width="10" height="10" rx="2" fill={i<3?'rgba(139,92,246,0.3)':'rgba(139,92,246,0.1)'} stroke="rgba(196,181,253,0.55)" strokeWidth="1.2"/>
                {i<3 && <path d={`M${18} ${37+i*14} L${21} ${40+i*14} L${25} ${34+i*14}`} stroke="rgba(196,181,253,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
                <rect x="32" y={34+i*14} width="32" height="2.5" rx="1.25" fill="rgba(196,181,253,0.4)"/>
              </g>
            ))}
            {/* Shine */}
            <rect x="12" y="8" width="20" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
          </svg>
        </div>

        {/* === LAYER 5: constellation lines === */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="1"/>
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0"/>
            </radialGradient>
          </defs>
          {/* constellation lines */}
          <line x1="120" y1="80" x2="310" y2="200" stroke="rgba(165,180,252,0.18)" strokeWidth="0.8"/>
          <line x1="310" y1="200" x2="520" y2="130" stroke="rgba(196,181,253,0.15)" strokeWidth="0.8"/>
          <line x1="520" y1="130" x2="680" y2="280" stroke="rgba(125,211,252,0.15)" strokeWidth="0.8"/>
          <line x1="680" y1="280" x2="580" y2="450" stroke="rgba(165,180,252,0.18)" strokeWidth="0.8"/>
          <line x1="580" y1="450" x2="380" y2="520" stroke="rgba(196,181,253,0.15)" strokeWidth="0.8"/>
          <line x1="380" y1="520" x2="160" y2="440" stroke="rgba(125,211,252,0.15)" strokeWidth="0.8"/>
          <line x1="160" y1="440" x2="120" y2="80" stroke="rgba(165,180,252,0.12)" strokeWidth="0.8"/>
          <line x1="310" y1="200" x2="380" y2="520" stroke="rgba(165,180,252,0.1)" strokeWidth="0.6"/>
          <line x1="520" y1="130" x2="380" y2="520" stroke="rgba(196,181,253,0.1)" strokeWidth="0.6"/>
          <line x1="200" y1="700" x2="380" y2="520" stroke="rgba(125,211,252,0.12)" strokeWidth="0.8"/>
          <line x1="200" y1="700" x2="420" y2="800" stroke="rgba(165,180,252,0.15)" strokeWidth="0.8"/>
          <line x1="420" y1="800" x2="620" y2="720" stroke="rgba(196,181,253,0.12)" strokeWidth="0.8"/>
          <line x1="620" y1="720" x2="680" y2="280" stroke="rgba(125,211,252,0.1)" strokeWidth="0.6"/>
          {/* star nodes */}
          {[[120,80],[310,200],[520,130],[680,280],[580,450],[380,520],[160,440],[200,700],[420,800],[620,720]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="2.5" fill="rgba(165,180,252,0.7)" className="star-pulse" style={{'--sd':`${i*0.4}s`}}/>
          ))}
          {/* small ambient stars */}
          {[[60,300],[740,180],[450,380],[280,650],[650,580],[100,820],[720,820]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="1.2" fill="rgba(196,181,253,0.5)" className="star-twinkle" style={{'--sd':`${i*0.6}s`}}/>
          ))}
        </svg>

        {/* === LAYER 6: floating particles === */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[{t:'12%',l:'18%',s:'4px',c:'rgba(99,102,241,0.5)',d:'0s',dur:'8s'},{t:'28%',l:'72%',s:'3px',c:'rgba(139,92,246,0.45)',d:'1.2s',dur:'11s'},{t:'55%',l:'8%',s:'5px',c:'rgba(56,189,248,0.4)',d:'2.4s',dur:'9s'},{t:'70%',l:'55%',s:'3px',c:'rgba(52,211,153,0.45)',d:'0.8s',dur:'13s'},{t:'85%',l:'30%',s:'4px',c:'rgba(167,139,250,0.4)',d:'3s',dur:'10s'},{t:'40%',l:'85%',s:'3px',c:'rgba(99,102,241,0.35)',d:'1.8s',dur:'12s'},{t:'18%',l:'45%',s:'2px',c:'rgba(56,189,248,0.35)',d:'4s',dur:'7s'},{t:'92%',l:'78%',s:'4px',c:'rgba(52,211,153,0.4)',d:'2s',dur:'14s'}].map((p,i)=>(
            <div key={i} className="absolute rounded-full particle-drift"
              style={{top:p.t,left:p.l,width:p.s,height:p.s,background:p.c,'--pd':p.d,'--pdur':p.dur}} />
          ))}
        </div>

        {/* === LOGOS — centered === */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-8 px-8">

          {/* Maruti Suzuki Logo */}
          <div className="relative animate-fade-in">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-50" style={{background:'radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)', transform:'scale(1.8)'}} />
            <div className="relative flex items-center justify-center rounded-2xl px-8 py-4 shadow-2xl"
              style={{background:'rgba(255,255,255,0.96)', boxShadow:'0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.15)'}}>
              <img
                src="/maruti-suzuki-logo.svg"
                alt="Maruti Suzuki"
                className="h-10 w-auto sm:h-12 md:h-14"
              />
            </div>
          </div>

          {/* Soft divider */}
          <div className="flex items-center gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-indigo-300/50 to-indigo-300/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.9)]" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent via-indigo-300/50 to-indigo-300/20" />
          </div>

          {/* Compliance Connect Logo */}
          <div className="flex flex-col items-center gap-3 animate-fade-in-up" style={{animationDelay:'0.3s'}}>
            <div className="relative">
              <div className="absolute inset-0 blur-2xl opacity-40" style={{background:'radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)', transform:'scale(1.8)'}} />
              <img
                src="/assets/compliance-connect-transparent-logo.svg"
                alt="Compliance Connect"
                className="relative h-16 w-auto sm:h-18 md:h-24 drop-shadow-2xl"
              />
            </div>
            <p className="text-indigo-200/65 text-xs font-light tracking-[0.3em] uppercase mt-1">One Platform. Complete Compliance.</p>
          </div>

          {/* Bottom status */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 animate-fade-in" style={{animationDelay:'0.6s'}}>
            <div className="flex items-center gap-2 text-[10px] text-indigo-200/45 tracking-widest uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="text-[10px] text-indigo-200/35 tracking-widest uppercase">v1.0.0</div>
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <aside className="relative flex w-full shrink-0 flex-col px-6 py-10 sm:px-10 md:w-[40%] md:min-h-[100dvh] md:px-12 md:py-12 overflow-hidden">

        {/* === BASE gradient: white → blue → purple → green tones === */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-[#eff6ff] to-[#f0fdf4]" />
        <div className="absolute inset-0 bg-gradient-to-tl from-[#faf5ff]/80 via-transparent to-[#ecfdf5]/60" />

        {/* === Soft colour orbs === */}
        {/* Blue orb - top right */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)'}} />
        {/* Purple orb - middle left */}
        <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)'}} />
        {/* Green orb - bottom */}
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)'}} />
        {/* Cyan accent - top left */}
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)'}} />

        {/* === Animated dot pattern - multi-colour === */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.07]">
          <div className="absolute inset-0 animate-dots-flow"
            style={{
              backgroundImage: 'radial-gradient(circle, #6366f1 2px, transparent 2px)',
              backgroundSize: '28px 28px'
            }} />
        </div>

        {/* === Decorative gradient border left edge === */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none"
          style={{background:'linear-gradient(180deg, #3b82f6, #8b5cf6, #22c55e, #3b82f6)'}} />

        {/* === Floating colour blobs === */}
        <div className="absolute top-16 right-8 w-4 h-4 rounded-full bg-blue-300/40 animate-float-gentle" />
        <div className="absolute top-36 right-16 w-2.5 h-2.5 rounded-full bg-purple-300/50 animate-float-slow" />
        <div className="absolute top-56 left-8 w-3 h-3 rounded-full bg-emerald-300/40 animate-float-delayed" />
        <div className="absolute bottom-40 right-6 w-3.5 h-3.5 rounded-full bg-blue-200/50 animate-float-gentle" />
        <div className="absolute bottom-20 left-12 w-2 h-2 rounded-full bg-violet-300/40 animate-float-slow" />

        <div className="relative flex flex-1 flex-col justify-center items-center text-center">

          {/* Shield icon — gradient ring */}
          <div className="mb-8 relative animate-fade-in">
            <div className="absolute inset-0 rounded-full scale-[1.5] animate-ping-slow"
              style={{background:'conic-gradient(from 0deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2), rgba(34,197,94,0.2), rgba(59,130,246,0.2))', borderRadius:'50%'}} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-xl animate-float-gentle"
              style={{background:'linear-gradient(135deg, #ffffff, #eff6ff)'}}>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-100"
                style={{background:'linear-gradient(135deg, #dbeafe, #f0fdf4)'}}>
                <ShieldCheck className="h-7 w-7 text-[#2563eb]" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Login heading */}
          <div className="relative">
            <h1 className="text-4xl font-bold tracking-tight animate-fade-in"
              style={{background:'linear-gradient(135deg, #1e40af, #7c3aed, #059669)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>
              Login
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-[2px] w-8 rounded-full animate-expand-left"
                style={{background:'linear-gradient(90deg, transparent, #3b82f6)'}} />
              <div className="h-2 w-2 rounded-full animate-pulse"
                style={{background:'linear-gradient(135deg, #3b82f6, #8b5cf6)'}} />
              <div className="h-[2px] w-8 rounded-full animate-expand-right"
                style={{background:'linear-gradient(270deg, transparent, #8b5cf6)'}} />
            </div>
          </div>

          {/* Welcome text */}
          <p className="mt-4 text-sm text-slate-500 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            Welcome to Compliance Connect
          </p>

          {/* SSO Button — gradient */}
          <div className="relative mt-10 w-full max-w-[320px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
              style={{background:'linear-gradient(135deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5))'}} />
            <Button
              type="button"
              size="lg"
              className={cn(
                "relative h-auto w-full gap-3 rounded-2xl px-8 py-5",
                "text-base font-semibold text-white",
                "hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
                "shadow-lg border-0",
              )}
              style={{background:'linear-gradient(135deg, #2563eb, #7c3aed)'}}
              onClick={() => onLogin?.()}
              disabled={isLoggingIn}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <LogIn className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              </div>
              {isLoggingIn ? "Signing in..." : "Login via SSO"}
            </Button>
          </div>

          {/* Secure badge */}
          <div className="mt-6 flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-200" />
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Secure Connection</span>
            </div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-200" />
          </div>

          {/* Security card — gradient border + fill */}
          <div
            className="mt-8 w-full max-w-[320px] rounded-2xl p-[1.5px] animate-fade-in-up shadow-lg"
            style={{background:'linear-gradient(135deg, #3b82f6, #8b5cf6, #22c55e)', animationDelay:'0.5s'}}
          >
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{background:'linear-gradient(135deg, #f0f9ff, #faf5ff, #f0fdf4)'}}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner"
                style={{background:'linear-gradient(135deg, #dbeafe, #ede9fe)'}}>
                <ShieldCheck className="h-5 w-5 text-[#2563eb]" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-slate-800">Your security is our priority</p>
                <p className="mt-0.5 text-xs text-slate-500">Secure. Reliable. Always.</p>
              </div>
            </div>
          </div>

          {/* Animated dot wave — multi-colour */}
          <div className="mt-5 w-full max-w-[320px] overflow-hidden" style={{height:'52px'}}>
            <svg width="100%" height="52" viewBox="0 0 320 52">
              {Array.from({length: 14}, (_, col) =>
                Array.from({length: 3}, (_, row) => {
                  const colors = ['#3b82f6','#8b5cf6','#22c55e'];
                  return (
                    <circle
                      key={`${col}-${row}`}
                      cx={col * 23 + 12}
                      cy={row * 17 + 9}
                      r="3"
                      fill={colors[row]}
                      className="dot-ripple"
                      style={{'--d': `${(col * 0.1 + row * 0.18).toFixed(2)}s`}}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </div>
      </aside>

      {/* CSS Animations */}
      <style>{`
        /* ── Morphing orbs ── */
        .orb-1 { animation: orb-morph-1 16s ease-in-out infinite; }
        .orb-2 { animation: orb-morph-2 20s ease-in-out infinite; }
        .orb-3 { animation: orb-morph-3 13s ease-in-out infinite; }
        @keyframes orb-morph-1 {
          0%,100% { transform: translate(0,0) scale(1);    border-radius:50%; }
          30%     { transform: translate(40px,30px) scale(1.1); border-radius:60% 40% 55% 45%; }
          60%     { transform: translate(20px,-20px) scale(0.95); border-radius:45% 55% 40% 60%; }
        }
        @keyframes orb-morph-2 {
          0%,100% { transform: translate(0,0) scale(1);    border-radius:50%; }
          40%     { transform: translate(-35px,-40px) scale(1.08); border-radius:55% 45% 60% 40%; }
          70%     { transform: translate(15px,25px) scale(1.04); border-radius:40% 60% 45% 55%; }
        }
        @keyframes orb-morph-3 {
          0%,100% { transform: translate(0,0) scale(1);    border-radius:50%; }
          33%     { transform: translate(22px,-28px) scale(1.12); border-radius:50% 50% 60% 40%; }
          66%     { transform: translate(-20px,20px) scale(0.92); border-radius:40% 60% 50% 50%; }
        }

/* ── Tilt-float icons ── */
        .tilt-float {
          animation: tilt-float-anim ease-in-out infinite;
          animation-duration: var(--fdur, 6s);
          animation-delay: var(--fd, 0s);
          position: absolute;
        }
        @keyframes tilt-float-anim {
          0%   { transform: translateY(0px)   rotate(0deg)   scale(1); }
          20%  { transform: translateY(-18px) rotate(2deg)   scale(1.04); }
          45%  { transform: translateY(-28px) rotate(-1.5deg) scale(1.06); }
          70%  { transform: translateY(-16px) rotate(1deg)   scale(1.03); }
          100% { transform: translateY(0px)   rotate(0deg)   scale(1); }
        }

        /* ── Constellation star pulse ── */
        .star-pulse {
          animation: star-pulse-anim 4s ease-in-out infinite;
          animation-delay: var(--sd, 0s);
        }
        @keyframes star-pulse-anim {
          0%,100% { r: 2.5; opacity: 0.7; }
          50%     { r: 4;   opacity: 1; filter: drop-shadow(0 0 4px rgba(165,180,252,0.9)); }
        }
        .star-twinkle {
          animation: star-twinkle-anim 3s ease-in-out infinite;
          animation-delay: var(--sd, 0s);
        }
        @keyframes star-twinkle-anim {
          0%,100% { opacity: 0.2; }
          50%     { opacity: 0.8; }
        }

        /* ── Particle drift ── */
        .particle-drift {
          animation: particle-drift-anim var(--pdur, 10s) ease-in-out infinite;
          animation-delay: var(--pd, 0s);
        }
        @keyframes particle-drift-anim {
          0%   { transform: translate(0, 0) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          30%  { transform: translate(18px, -30px) scale(1.3); }
          55%  { transform: translate(-12px, -55px) scale(0.8); opacity: 0.7; }
          80%  { transform: translate(8px, -80px) scale(1.1); opacity: 0.3; }
          100% { transform: translate(0, -110px) scale(0.5); opacity: 0; }
        }

        /* ── Shared ── */
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(25px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-20px); }
        }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(16px); }
        }
        .animate-float-delayed { animation: float-delayed 13s ease-in-out infinite; animation-delay: 2s; }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .animate-float-gentle { animation: float-gentle 4s ease-in-out infinite; }

        @keyframes expand-left {
          from { width: 0; opacity: 0; }
          to   { width: 2rem; opacity: 1; }
        }
        .animate-expand-left { animation: expand-left 0.5s ease-out 0.4s forwards; width: 0; }

        @keyframes expand-right {
          from { width: 0; opacity: 0; }
          to   { width: 2rem; opacity: 1; }
        }
        .animate-expand-right { animation: expand-right 0.5s ease-out 0.4s forwards; width: 0; }

        @keyframes ping-slow {
          0%   { transform: scale(1);    opacity: 0.3; }
          50%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1);    opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 3s ease-in-out infinite; }

        @keyframes dots-flow {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(6px, -6px); }
          50%  { transform: translate(11px, 0px); }
          75%  { transform: translate(6px, 6px); }
          100% { transform: translate(0, 0); }
        }
        .animate-dots-flow { animation: dots-flow 4s ease-in-out infinite; }

        @keyframes dot-ripple-anim {
          0%   { opacity: 0.07; r: 3; }
          50%  { opacity: 0.5;  r: 4.5; }
          100% { opacity: 0.07; r: 3; }
        }
        .dot-ripple {
          animation: dot-ripple-anim 2s ease-in-out infinite;
          animation-delay: var(--d);
        }
      `}</style>
    </div>
  );
}

export default Login;
