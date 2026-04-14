import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function AnimateIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

const C = {
  bg: '#ffffff',
  bgMuted: '#f8f8f7',
  surface: '#f4f4f5',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',
  text: '#0f0f0f',
  textSub: '#71717a',
  textMuted: '#a1a1aa',
  red: '#e03535',
  redSoft: 'rgba(224,53,53,0.07)',
  redMid: 'rgba(224,53,53,0.13)',
};

function MacbookFrame({ src, children }) {
  return (
    <div style={{ position:'relative', width:'100%' }}>
      {/* Lid */}
      <div style={{
        background:'linear-gradient(145deg, #323232, #1e1e1e)',
        borderRadius:'16px 16px 0 0',
        padding:'12px 12px 6px',
        border:'1px solid rgba(255,255,255,0.1)',
        boxShadow:'0 40px 100px rgba(0,0,0,0.32), 0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Camera */}
        <div style={{ width:'6px',height:'6px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',margin:'0 auto 8px' }} />
        {/* Screen */}
        <div style={{ background:'#000',borderRadius:'6px',overflow:'hidden', ...(src ? { aspectRatio:'16/10' } : {}) }}>
          {src
            ? <img src={src} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center' }} />
            : children
          }
        </div>
      </div>
      {/* Base */}
      <div style={{
        background:'linear-gradient(180deg,#2e2e2e,#262626)',
        height:'16px',
        borderRadius:'0 0 3px 3px',
        border:'1px solid rgba(255,255,255,0.07)',
        borderTop:'none',
        display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        <div style={{ width:'52px',height:'6px',background:'rgba(255,255,255,0.04)',borderRadius:'2px' }} />
      </div>
      {/* Shadow */}
      <div style={{ height:'3px',background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.14),transparent)',borderRadius:'0 0 8px 8px' }} />
    </div>
  );
}

function PipelineMockup() {
  const stages = [
    { label: 'Research', done: true },
    { label: 'Script', done: true },
    { label: 'Narration', active: true },
    { label: 'Sound' }, { label: 'Visuals' },
    { label: 'Assembly' }, { label: 'Thumbnail' }, { label: 'Publish' },
  ];
  return (
    <div style={{
      background: '#1a1a1a', borderRadius: '14px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
    }}>
      <div style={{ background: '#111', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '7px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['#ff5f56','#ffbd2e','#27c93f'].map((c,i) => <div key={i} style={{ width:'9px',height:'9px',borderRadius:'50%',background:c,opacity:0.6 }} />)}
        <div style={{ flex:1,margin:'0 10px',height:'18px',background:'#1e1e1e',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:'9px',color:'#3a3a3a',fontFamily:'monospace' }}>tryforge.studio</span>
        </div>
      </div>
      <div style={{ display:'flex',height:'340px' }}>
        <div style={{ width:'112px',background:'#111',borderRight:'1px solid rgba(255,255,255,0.05)',padding:'14px 0',flexShrink:0 }}>
          <div style={{ fontSize:'9px',fontWeight:'800',color:'#e03535',letterSpacing:'2px',padding:'0 12px',marginBottom:'18px' }}>FORGE</div>
          {['Dashboard','Pipeline','Trends','Settings'].map((item,i) => (
            <div key={i} style={{ fontSize:'11px',padding:'7px 12px',color:i===1?'#f0f0f0':'#2a2a2a',fontWeight:i===1?'600':'400',borderLeft:i===1?'2px solid #e03535':'2px solid transparent',background:i===1?'rgba(224,53,53,0.07)':'transparent' }}>{item}</div>
          ))}
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          <div style={{ background:'#111',padding:'8px 12px',display:'flex',alignItems:'center',gap:'3px',borderBottom:'1px solid rgba(255,255,255,0.05)',overflow:'hidden' }}>
            {stages.map((s,i) => (
              <div key={i} style={{ fontSize:'8px',padding:'3px 8px',borderRadius:'5px',whiteSpace:'nowrap',background:s.done?'rgba(74,222,128,0.1)':s.active?'rgba(224,53,53,0.12)':'transparent',color:s.done?'#4ade80':s.active?'#e03535':'#252525',fontWeight:s.active?'700':'500' }}>
                {s.done?'✓ ':s.active?'→ ':''}{s.label}
              </div>
            ))}
          </div>
          <div style={{ flex:1,padding:'14px',overflow:'hidden' }}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:'#f0f0f0',marginBottom:'2px' }}>Narration</div>
            <div style={{ fontSize:'9px',color:'#484848',marginBottom:'12px' }}>Rise and Fall of the Roman Empire · 2 voices</div>
            {[
              { voice:'NARRATOR',color:'#818cf8',text:'In 68 AD, the man who had terrified an empire sat trembling in a villa outside Rome, listening for hoofbeats.' },
              { voice:'NERO',color:'#e03535',text:'"What an artist dies in me!" Every ally had turned. The Senate had declared him an enemy of the state.' },
              { voice:'NARRATOR',color:'#818cf8',text:'He had reigned for fourteen years. He would be dead before sunrise.' },
            ].map((seg,i) => (
              <div key={i} style={{ background:'#111',borderRadius:'6px',padding:'7px 10px',marginBottom:'5px',border:'1px solid rgba(255,255,255,0.04)',borderLeft:`2px solid ${seg.color}` }}>
                <div style={{ fontSize:'7px',color:seg.color,fontWeight:'800',marginBottom:'3px',letterSpacing:'0.8px' }}>{seg.voice}</div>
                <div style={{ fontSize:'8px',color:'#585858',lineHeight:'1.5' }}>{seg.text}</div>
              </div>
            ))}
            <div style={{ display:'flex',gap:'5px',marginTop:'10px' }}>
              <div style={{ flex:1,background:'#e03535',borderRadius:'5px',padding:'7px',textAlign:'center' }}>
                <span style={{ fontSize:'8px',color:'#fff',fontWeight:'700' }}>▶ Generate narration</span>
              </div>
              <div style={{ background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'5px',padding:'7px 10px' }}>
                <span style={{ fontSize:'8px',color:'#383838' }}>↓ All</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendsMockup() {
  const items = [
    { topic:'Why the Roman Empire really fell',level:'Low',color:'#4ade80',ratio:'14.2x',why:'Small channels consistently outperform their size here. High search volume, low big-channel saturation.' },
    { topic:'The assassination that changed the Cold War',level:'Low',color:'#4ade80',ratio:'11.8x',why:'Evergreen history content with strong signal. Viewers complete these at higher rates.' },
  ];
  return (
    <div style={{ background:'#1a1a1a',borderRadius:'14px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 32px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1)' }}>
      <div style={{ background:'#111',padding:'10px 14px',display:'flex',alignItems:'center',gap:'8px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        {['#ff5f56','#ffbd2e','#27c93f'].map((c,i) => <div key={i} style={{ width:'9px',height:'9px',borderRadius:'50%',background:c,opacity:0.6 }} />)}
        <span style={{ fontSize:'9px',color:'#363636',marginLeft:'4px',fontFamily:'monospace' }}>tryforge.studio/trends</span>
      </div>
      <div style={{ padding:'16px',display:'flex',gap:'10px' }}>
        {items.map((c,i) => (
          <div key={i} style={{ flex:1,background:'#111',borderRadius:'8px',padding:'12px',border:'1px solid rgba(255,255,255,0.05)',borderLeft:`3px solid ${c.color}` }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px' }}>
              <div style={{ fontSize:'10px',fontWeight:'700',color:'#f0f0f0',lineHeight:'1.4',flex:1,marginRight:'6px' }}>{c.topic}</div>
              <div style={{ fontSize:'8px',fontWeight:'700',padding:'2px 6px',borderRadius:'20px',background:`${c.color}18`,color:c.color,whiteSpace:'nowrap' }}>{c.level}</div>
            </div>
            <div style={{ background:'#1a1a1a',borderRadius:'5px',padding:'8px',marginBottom:'8px' }}>
              <div style={{ fontSize:'7px',color:'#333',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px',fontWeight:'600' }}>Why this works</div>
              <div style={{ fontSize:'8px',color:'#585858',lineHeight:'1.5' }}>{c.why}</div>
            </div>
            <div style={{ display:'flex',gap:'5px',alignItems:'center' }}>
              <div style={{ background:'rgba(129,140,248,0.1)',border:'1px solid rgba(129,140,248,0.2)',borderRadius:'5px',padding:'5px 10px' }}>
                <span style={{ fontSize:'11px',fontWeight:'700',color:'#818cf8' }}>{c.ratio}</span>
              </div>
              <div style={{ flex:1,background:'#e03535',borderRadius:'5px',padding:'5px',textAlign:'center' }}>
                <span style={{ fontSize:'8px',color:'#fff',fontWeight:'600' }}>Use in pipeline →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIPELINE_STAGES = [
  { label:'Research',  desc:'Channel analysis, topic validation, and source gathering. Competitive intelligence built in.' },
  { label:'Script',    desc:'Full structured narration with hook scoring across 5 dimensions and retention risk markers.' },
  { label:'Narration', desc:'Assign AI voices to each character. Download a complete numbered audio package in one click.' },
  { label:'Sound',     desc:'Music cues, ambient layers, and timestamped sound effects generated from your script.' },
  { label:'Visuals',   desc:'Midjourney-ready image prompts at every mood shift, tuned to your channel visual style.' },
  { label:'Assembly',  desc:'Full timeline — audio segments, matched images, and cues in one view. DaVinci Resolve export.' },
  { label:'Thumbnail', desc:'Three thumbnail concepts: image-led, text-led, emotion-led. Each with a Midjourney prompt.' },
  { label:'Publish',   desc:'3 title options, full description, searchable tags, and chapter timestamps from your script.' },
];

function InteractivePipeline() {
  const [ref, visible] = useScrollReveal(0.1);
  const [active, setActive] = useState(2);

  return (
    <div ref={ref}>
      {/* Track + nodes */}
      <div style={{ position:'relative', paddingBottom:'8px' }}>
        {/* Base track */}
        <div style={{ position:'absolute',top:'19px',left:'2.5%',right:'2.5%',height:'1px',background:C.border,zIndex:0 }} />
        {/* Progress track */}
        <div style={{
          position:'absolute',top:'19px',left:'2.5%',
          width: visible ? `${(active / 7) * 95}%` : '0%',
          height:'1px',background:`linear-gradient(90deg,${C.red},rgba(224,53,53,0.3))`,
          zIndex:0,
          transition:'width 0.8s ease 0.4s',
        }} />

        {/* Nodes */}
        <div style={{ display:'flex',position:'relative',zIndex:1 }}>
          {PIPELINE_STAGES.map((s, i) => (
            <div
              key={i}
              style={{
                flex:1,display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease ${i * 55}ms, transform 0.4s ease ${i * 55}ms`,
              }}
              onClick={() => setActive(i)}
            >
              <div className={`stage-node${i === active ? ' stage-active' : ''}`} style={{
                width:'38px',height:'38px',borderRadius:'50%',
                background: i === active ? C.redSoft : i < active ? 'rgba(22,163,74,0.06)' : C.bg,
                border:`1.5px solid ${i === active ? C.red : i < active ? 'rgba(22,163,74,0.35)' : C.border}`,
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {i < active
                  ? <span style={{ fontSize:'11px',color:'#16a34a',fontWeight:'800' }}>✓</span>
                  : <span style={{ fontSize:'9px',color:i===active?C.red:C.textMuted,fontWeight:'700',fontFamily:'monospace' }}>{String(i+1).padStart(2,'0')}</span>
                }
              </div>
              <div style={{ fontSize:'9px',color:i===active?C.red:C.textSub,fontWeight:i===active?'700':'500',marginTop:'7px',textAlign:'center',whiteSpace:'nowrap' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active stage description */}
      <div style={{
        marginTop:'16px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:'10px',
        padding:'14px 18px',display:'flex',gap:'12px',alignItems:'flex-start',
        boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
        transition:'all 0.2s ease',
      }}>
        <div style={{ width:'26px',height:'26px',borderRadius:'7px',flexShrink:0,background:C.redSoft,border:`1px solid ${C.redMid}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:'9px',fontWeight:'800',color:C.red,fontFamily:'monospace' }}>{String(active+1).padStart(2,'0')}</span>
        </div>
        <div>
          <div style={{ fontSize:'13px',fontWeight:'700',color:C.text,marginBottom:'3px' }}>{PIPELINE_STAGES[active].label}</div>
          <div style={{ fontSize:'12px',color:C.textSub,lineHeight:'1.65' }}>{PIPELINE_STAGES[active].desc}</div>
        </div>
        <div style={{ marginLeft:'auto',fontSize:'10px',color:C.textMuted,whiteSpace:'nowrap',alignSelf:'center' }}>
          {active + 1} of 8
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a href={href} style={{ fontSize:'14px',color:hovered?C.text:C.textSub,textDecoration:'none',transition:'color 0.15s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
    </a>
  );
}

const NICHES = ['History','Finance','True Crime','Health','Tech Reviews','Travel','Documentary','Science','Sports'];

const TESTIMONIALS = [
  { quote:"I went from 8 hours per video to a complete production package in one sitting. Script, audio, images — everything in one place.", name:'Marcus T.', channel:'History · 42K subs' },
  { quote:"The trend research changed my strategy. I found a topic perfectly sized for my channel and it became my highest-viewed video.", name:'Sarah K.', channel:'Finance · 28K subs' },
  { quote:"My channel sounds like it has a full production team. The voiceover quality matched exactly to my channel style is genuinely impressive.", name:'James R.', channel:'True crime · 67K subs' },
];

const FEATURES = [
  { title:'⚡ One Shot Mode', desc:'Type a topic — Forge runs research, script, titles, voice cast, and image prompts in one automated run. No clicks between stages.', highlight: true },
  { title:'Custom channel templates', desc:'Describe your channel once. Forge builds a production template tuned to your niche, tone, and style. Every video starts native.' },
  { title:'Hook scoring & retention', desc:'Score your opening hook across 5 dimensions. Find the 3 moments in your script most likely to lose viewers before you record.' },
  { title:'Multi-voice narration', desc:'Assign different AI voices to each script character. Download a complete audio package in one click.' },
  { title:'Intelligent image prompts', desc:'Forge detects mood shifts and generates image prompts at exactly the right moments — matched to your channel visual style.' },
  { title:'Sound design plan', desc:'Music bed, ambient layer, and timestamped sound effects generated from your script. A complete brief ready to use.' },
  { title:'YouTube-ready metadata', desc:'3 title options, a full description, searchable tags, and chapter markers — all written from your actual script content.' },
];

export default function Landing() {
  return (
    <div style={{ background:C.bg, fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", sans-serif', color:C.text }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }

        .card-lift {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          cursor: default;
        }
        .card-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
          border-color: rgba(0,0,0,0.14) !important;
        }

        .btn-red {
          transition: filter 0.15s, transform 0.15s, box-shadow 0.15s;
          display: inline-block;
        }
        .btn-red:hover {
          filter: brightness(1.07);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(224,53,53,0.38) !important;
        }

        .btn-outline {
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          display: inline-block;
        }
        .btn-outline:hover {
          background: #f4f4f5 !important;
          color: #0f0f0f !important;
          border-color: rgba(0,0,0,0.15) !important;
        }

        .pricing-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .pricing-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.1) !important;
        }

        .t-card {
          transition: border-color 0.2s;
        }
        .t-card:hover {
          border-color: rgba(224,53,53,0.28) !important;
        }

        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(224,53,53,0.45); }
          70%  { box-shadow: 0 0 0 9px rgba(224,53,53,0); }
          100% { box-shadow: 0 0 0 0 rgba(224,53,53,0); }
        }
        .stage-node {
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          cursor: pointer;
        }
        .stage-node:hover {
          transform: translateY(-3px) scale(1.08) !important;
          border-color: rgba(224,53,53,0.45) !important;
        }
        .stage-active {
          animation: pulse-ring 2.2s ease-out infinite;
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${C.border}`, padding:'0 48px', height:'56px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ fontSize:'13px',fontWeight:'800',letterSpacing:'2px',color:C.red }}>FORGE</div>
        <div style={{ display:'flex',alignItems:'center',gap:'36px' }}>
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#trends">Trends</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <Link to="/login" style={{ fontSize:'14px',color:C.textSub }}>Sign in</Link>
          <Link to="/try" className="btn-red" style={{ background:C.red,color:'#fff',padding:'8px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',boxShadow:'0 4px 16px rgba(224,53,53,0.35)' }}>
            Try it free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position:'relative',overflow:'hidden',background:C.bg }}>
        {/* Gradient mesh */}
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',
          background:`radial-gradient(ellipse at 72% 40%, rgba(224,53,53,0.09) 0%, transparent 55%),
                      radial-gradient(ellipse at 18% 80%, rgba(251,146,60,0.05) 0%, transparent 50%)`,
        }} />
        <div style={{ maxWidth:'1200px',margin:'0 auto',padding:'104px 48px 80px',display:'flex',alignItems:'center',gap:'72px',position:'relative' }}>
          {/* Left */}
          <div style={{ flex:'0 0 500px' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:'7px',background:C.redSoft,border:`1px solid ${C.redMid}`,borderRadius:'20px',padding:'5px 12px',marginBottom:'28px' }}>
              <div style={{ width:'5px',height:'5px',borderRadius:'50%',background:C.red }} />
              <span style={{ fontSize:'12px',color:C.red,fontWeight:'600' }}>AI-powered video production</span>
            </div>

            <h1 style={{ fontSize:'62px',fontWeight:'800',color:C.text,lineHeight:'1.05',marginBottom:'20px',letterSpacing:'-2.5px' }}>
              Your AI<br />production team<br />for YouTube
            </h1>

            <p style={{ fontSize:'18px',color:C.textSub,marginTop:'20px',marginBottom:'32px',lineHeight:'1.75',maxWidth:'420px' }}>
              Forge replaces the 5-tool scramble — research, script, voiceover, images, sound, and metadata — all in one pipeline built around your channel's voice.
            </p>

            <div style={{ display:'flex',gap:'12px',alignItems:'center',marginBottom:'36px' }}>
              <Link to="/try" className="btn-red" style={{ background:C.red,color:'#fff',padding:'13px 28px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',boxShadow:'0 4px 14px rgba(224,53,53,0.28)' }}>
                Try it free →
              </Link>
              <a href="#how-it-works" className="btn-outline" style={{ color:C.textSub,padding:'13px 22px',borderRadius:'10px',fontSize:'15px',border:`1px solid ${C.border}`,background:'transparent' }}>
                See how it works
              </a>
            </div>

            <div style={{ display:'flex',flexDirection:'column',gap:'9px' }}>
              {[
                '8 production stages — research through metadata',
                'Works for any niche: history, finance, true crime, tech',
                'Complete package in one sitting',
              ].map((item, i) => (
                <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:'9px' }}>
                  <span style={{ color:C.red,fontSize:'13px',marginTop:'1px',flexShrink:0,fontWeight:'700' }}>✓</span>
                  <span style={{ fontSize:'14px',color:C.textSub }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:'20px',display:'inline-flex',alignItems:'center',gap:'9px',background:'rgba(224,53,53,0.06)',border:`1px solid rgba(224,53,53,0.18)`,borderRadius:'10px',padding:'10px 16px' }}>
              <span style={{ fontSize:'16px',lineHeight:1 }}>⚡</span>
              <div>
                <div style={{ fontSize:'12px',fontWeight:'700',color:C.red,marginBottom:'1px' }}>One Shot Mode</div>
                <div style={{ fontSize:'12px',color:C.textSub }}>Type a topic. Get research, script, titles, voices, and image prompts — all at once.</div>
              </div>
            </div>
          </div>

          {/* Right — product mockup */}
          <div style={{ flex:1,minWidth:0 }}>
            <PipelineMockup />
          </div>
        </div>
      </section>

      {/* Niche strip */}
      <div style={{ borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,padding:'14px 48px',background:C.bgMuted }}>
        <div style={{ maxWidth:'960px',margin:'0 auto',display:'flex',alignItems:'center',gap:'0',flexWrap:'wrap' }}>
          <span style={{ fontSize:'11px',color:C.textMuted,fontWeight:'500',marginRight:'20px',letterSpacing:'0.5px',textTransform:'uppercase',whiteSpace:'nowrap' }}>Built for</span>
          {NICHES.map((niche, i) => (
            <span key={i} style={{ fontSize:'13px',color:C.textSub,fontWeight:'500',padding:'2px 0' }}>
              {niche}{i < NICHES.length - 1 && <span style={{ color:C.textMuted,margin:'0 10px' }}>·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Problem */}
      <section style={{ padding:'80px 48px',background:C.bg }}>
        <div style={{ maxWidth:'960px',margin:'0 auto' }}>
          <AnimateIn style={{ maxWidth:'580px',marginBottom:'48px' }}>
            <div style={{ fontSize:'11px',color:C.red,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'14px',fontWeight:'700' }}>The problem</div>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,lineHeight:'1.15',letterSpacing:'-1px',marginBottom:'14px' }}>
              Making YouTube videos is painful and fragmented
            </h2>
            <p style={{ fontSize:'16px',color:C.textSub,lineHeight:'1.7' }}>
              Most creators juggle 5–6 different tools, lose hours to context switching, and end up with inconsistent output.
            </p>
          </AnimateIn>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'16px' }}>
            {[
              { num:'01',title:'Hours wasted per video',desc:'Research, scripting, voiceover, images, editing — each step in a different tool with no connection between them.' },
              { num:'02',title:'Constant context switching',desc:'Every tool switch breaks your flow. Five tabs, five workflows, one video. Momentum dies before you hit record.' },
              { num:'03',title:'Inconsistent output',desc:'Without a system, every video starts from scratch. Tone drifts, quality varies, publish day keeps getting pushed.' },
            ].map((item,i) => (
              <AnimateIn key={i} delay={i * 80}>
                <div className="card-lift" style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'28px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize:'11px',color:C.red,fontWeight:'700',letterSpacing:'1px',marginBottom:'16px',opacity:0.8 }}>{item.num}</div>
                  <div style={{ fontSize:'15px',fontWeight:'700',color:C.text,marginBottom:'8px',lineHeight:'1.3' }}>{item.title}</div>
                  <div style={{ fontSize:'13px',color:C.textSub,lineHeight:'1.7' }}>{item.desc}</div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding:'80px 48px',background:C.bgMuted,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'960px',margin:'0 auto' }}>
          <AnimateIn style={{ textAlign:'center',marginBottom:'48px' }}>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,lineHeight:'1.1',letterSpacing:'-1px',marginBottom:'12px' }}>
              From blank page to publish-ready.<br />In one sitting.
            </h2>
            <p style={{ fontSize:'15px',color:C.textSub,maxWidth:'440px',margin:'0 auto',lineHeight:'1.7' }}>
              Eight stages, each building on the last. Run them one at a time or all at once.
            </p>
          </AnimateIn>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'16px',marginBottom:'36px' }}>
            {[
              { num:'01',title:'Describe your channel',desc:'Write a few sentences about your niche, tone, and style. Forge builds a custom template — every video starts native to your voice.' },
              { num:'02',title:'Pick a topic',desc:"Use Trends to find what's actually working in your niche — real YouTube data — or bring your own idea and validate in seconds." },
              { num:'03',title:'Run the pipeline',desc:'Walk away with your script, audio, images, thumbnail concepts, and metadata. A complete production package, ready to edit.' },
            ].map((item,i) => (
              <AnimateIn key={i} delay={i * 80}>
                <div className="card-lift" style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'28px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize:'28px',fontWeight:'900',color:'rgba(224,53,53,0.22)',lineHeight:'1',marginBottom:'16px',letterSpacing:'-1px' }}>{item.num}</div>
                  <div style={{ fontSize:'15px',fontWeight:'700',color:C.text,marginBottom:'8px',lineHeight:'1.3' }}>{item.title}</div>
                  <div style={{ fontSize:'13px',color:C.textSub,lineHeight:'1.7' }}>{item.desc}</div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <InteractivePipeline />
        </div>
      </section>

      {/* One Shot Mode */}
      <section style={{ padding:'80px 48px',background:C.bg,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'960px',margin:'0 auto' }}>
          <AnimateIn style={{ textAlign:'center',marginBottom:'52px' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:'7px',background:'rgba(224,53,53,0.07)',border:`1px solid rgba(224,53,53,0.18)`,borderRadius:'20px',padding:'5px 14px',marginBottom:'20px' }}>
              <span style={{ fontSize:'13px' }}>⚡</span>
              <span style={{ fontSize:'12px',color:C.red,fontWeight:'700',letterSpacing:'0.5px' }}>ONE SHOT MODE</span>
            </div>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,lineHeight:'1.1',letterSpacing:'-1px',marginBottom:'12px' }}>
              One topic. Full production package.
            </h2>
            <p style={{ fontSize:'15px',color:C.textSub,maxWidth:'480px',margin:'0 auto',lineHeight:'1.7' }}>
              Skip the eight clicks. Type a topic, hit go — Forge runs research, script, titles, voice cast, and image prompts in parallel. Available on Studio and Pro.
            </p>
          </AnimateIn>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px' }}>
            {/* Step by step */}
            <AnimateIn>
              <div style={{ background:C.bgMuted,border:`1px solid ${C.border}`,borderRadius:'14px',padding:'28px',height:'100%' }}>
                <div style={{ fontSize:'11px',fontWeight:'700',color:C.textMuted,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'20px' }}>Step by step</div>
                <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
                  {['Enter topic','Run research','Generate script','Pick voices','Generate image prompts','Review titles & metadata'].map((step, i) => (
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                      <div style={{ width:'22px',height:'22px',borderRadius:'50%',border:`1.5px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <span style={{ fontSize:'9px',fontWeight:'700',color:C.textMuted,fontFamily:'monospace' }}>{String(i+1).padStart(2,'0')}</span>
                      </div>
                      <span style={{ fontSize:'13px',color:C.textSub }}>{step}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:'24px',paddingTop:'20px',borderTop:`1px solid ${C.border}`,fontSize:'12px',color:C.textMuted }}>
                  6 stages · multiple sessions
                </div>
              </div>
            </AnimateIn>

            {/* One Shot */}
            <AnimateIn delay={80}>
              <div style={{ background:'#fff',border:`1.5px solid rgba(224,53,53,0.3)`,borderRadius:'14px',padding:'28px',boxShadow:'0 8px 32px rgba(224,53,53,0.08)',height:'100%',position:'relative' }}>
                <div style={{ position:'absolute',top:'-1px',left:'50%',transform:'translateX(-50%)',background:C.red,color:'#fff',fontSize:'10px',fontWeight:'800',padding:'3px 14px',borderRadius:'20px',letterSpacing:'0.5px',whiteSpace:'nowrap' }}>STUDIO & PRO</div>
                <div style={{ fontSize:'11px',fontWeight:'700',color:C.red,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'20px' }}>⚡ One Shot</div>
                <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                    <div style={{ width:'22px',height:'22px',borderRadius:'50%',background:'rgba(224,53,53,0.1)',border:`1.5px solid rgba(224,53,53,0.3)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <span style={{ fontSize:'9px',fontWeight:'700',color:C.red,fontFamily:'monospace' }}>01</span>
                    </div>
                    <span style={{ fontSize:'13px',color:C.text,fontWeight:'600' }}>Enter a topic</span>
                  </div>
                  <div style={{ marginLeft:'11px',borderLeft:`2px dashed rgba(224,53,53,0.2)`,paddingLeft:'20px',paddingBottom:'4px' }}>
                    <div style={{ fontSize:'11px',color:C.textMuted,marginBottom:'8px' }}>Forge runs in parallel →</div>
                    {['Research brief','Full script','3 title options','Voice cast','Image prompts'].map((item, i) => (
                      <div key={i} style={{ display:'flex',alignItems:'center',gap:'7px',marginBottom:'5px' }}>
                        <span style={{ fontSize:'11px',color:'#16a34a',fontWeight:'700',flexShrink:0 }}>✓</span>
                        <span style={{ fontSize:'12px',color:C.textSub }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop:'20px',paddingTop:'20px',borderTop:`1px solid rgba(224,53,53,0.1)`,fontSize:'12px',color:C.red,fontWeight:'600' }}>
                  Everything above · one click
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Trend Research */}
      <section id="trends" style={{ padding:'80px 48px',background:C.bg,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'1100px',margin:'0 auto',display:'flex',gap:'72px',alignItems:'center' }}>
          <AnimateIn style={{ flex:1,minWidth:0 }}>
            <MacbookFrame>
              <TrendsMockup />
            </MacbookFrame>
          </AnimateIn>
          <AnimateIn delay={100} style={{ flex:'0 0 400px' }}>
            <div style={{ fontSize:'11px',color:C.red,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'16px',fontWeight:'700' }}>Trend research</div>
            <h2 style={{ fontSize:'34px',fontWeight:'800',color:C.text,marginBottom:'16px',lineHeight:'1.2',letterSpacing:'-0.8px' }}>
              Find what's working before you script
            </h2>
            <p style={{ fontSize:'15px',color:C.textSub,marginBottom:'28px',lineHeight:'1.75' }}>
              Most trend tools show you what's popular. Forge shows you what's <strong style={{ color:C.text,fontWeight:'600' }}>achievable</strong> — the views-to-subscriber ratio surfaces topics where small channels dramatically outperform their size.
            </p>
            <div style={{ display:'flex',flexDirection:'column',gap:'11px',marginBottom:'32px' }}>
              {['Real YouTube data — not trend guesses','Competition level for every topic','One click to launch the pipeline'].map((item,i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:'9px' }}>
                  <span style={{ color:'#16a34a',fontSize:'13px',flexShrink:0,fontWeight:'700' }}>✓</span>
                  <span style={{ fontSize:'14px',color:C.textSub }}>{item}</span>
                </div>
              ))}
            </div>
            <Link to="/signup" className="btn-red" style={{ background:C.red,color:'#fff',padding:'12px 24px',borderRadius:'8px',fontSize:'14px',fontWeight:'700',boxShadow:'0 4px 14px rgba(224,53,53,0.22)' }}>
              Explore trends →
            </Link>
          </AnimateIn>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,background:C.bgMuted }}>
        <div style={{ maxWidth:'960px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4, 1fr)' }}>
          {[
            { stat:'< 2 hrs', label:'From blank page to complete production package' },
            { stat:'14.2x',   label:'Average ratio on AI-discovered topics in your niche' },
            { stat:'8 stages',label:'Research through metadata — zero tool switching' },
            { stat:'1 pipeline',label:'Script, audio, images, sound, thumbnail, metadata' },
          ].map((s,i) => (
            <AnimateIn key={i} delay={i * 60}>
              <div style={{ padding:'36px 28px',textAlign:'center',borderRight:i<3?`1px solid ${C.border}`:'none' }}>
                <div style={{ fontSize:'34px',fontWeight:'800',color:C.red,marginBottom:'8px',letterSpacing:'-1px' }}>{s.stat}</div>
                <div style={{ fontSize:'12px',color:C.textMuted,lineHeight:'1.6',maxWidth:'140px',margin:'0 auto' }}>{s.label}</div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding:'80px 48px',background:C.bg }}>
        <div style={{ maxWidth:'960px',margin:'0 auto' }}>
          <AnimateIn style={{ textAlign:'center',marginBottom:'48px' }}>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,marginBottom:'12px',letterSpacing:'-1px' }}>Everything your channel needs</h2>
            <p style={{ fontSize:'15px',color:C.textSub }}>Eight stages of production, fully integrated.</p>
          </AnimateIn>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'12px' }}>
            {FEATURES.map((f,i) => (
              <AnimateIn key={i} delay={i * 60} style={i === 0 ? { gridColumn: '1 / -1' } : {}}>
                <div className="card-lift" style={{ background: f.highlight ? 'rgba(224,53,53,0.03)' : C.bg, border:`1px solid ${f.highlight ? 'rgba(224,53,53,0.25)' : C.border}`,borderRadius:'12px',padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display: f.highlight ? 'flex' : 'block', alignItems: 'center', gap: f.highlight ? '24px' : 0, minHeight: f.highlight ? 'auto' : '160px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'10px',flexShrink: 0 }}>
                    <div style={{ width:'28px',height:'28px',borderRadius:'7px',background:C.redSoft,border:`1px solid ${C.redMid}`,display:'flex',alignItems:'center',justifyContent:'center', marginBottom: f.highlight ? 0 : '14px' }}>
                      <span style={{ fontSize:'10px',fontWeight:'800',color:C.red }}>{f.highlight ? '⚡' : String(i).padStart(2,'0')}</span>
                    </div>
                    {f.highlight && <div style={{ fontSize:'14px',fontWeight:'700',color:C.text }}>{f.title}</div>}
                  </div>
                  {!f.highlight && <div style={{ fontSize:'14px',fontWeight:'700',color:C.text,marginBottom:'6px' }}>{f.title}</div>}
                  <div style={{ fontSize:'13px',color:C.textSub,lineHeight:'1.65' }}>{f.desc}</div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Output Package */}
      <section style={{ padding:'80px 48px',background:C.bgMuted,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'1100px',margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:'52px' }}>
            <div style={{ fontSize:'11px',color:C.red,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'14px',fontWeight:'700' }}>The output</div>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,marginBottom:'12px',letterSpacing:'-1px' }}>What you walk away with</h2>
            <p style={{ fontSize:'15px',color:C.textSub,maxWidth:'460px',margin:'0 auto',lineHeight:'1.7' }}>
              Every stage produces a real file. One click exports the complete package — ready to open in your editor.
            </p>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'32px',alignItems:'center' }}>
            {/* Left: file tree mockup */}
            <div style={{ background:'#1a1a1a',borderRadius:'14px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}>
              <div style={{ background:'#111',padding:'10px 14px',display:'flex',alignItems:'center',gap:'7px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {['#ff5f56','#ffbd2e','#27c93f'].map((c,i) => <div key={i} style={{ width:'9px',height:'9px',borderRadius:'50%',background:c,opacity:0.6 }} />)}
                <span style={{ fontSize:'10px',color:'#3a3a3a',marginLeft:'8px',fontFamily:'monospace' }}>ep01_roman_empire/</span>
                <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:'5px',background:'rgba(22,163,74,0.12)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:'4px',padding:'2px 8px' }}>
                  <div style={{ width:'5px',height:'5px',borderRadius:'50%',background:'#16a34a' }} />
                  <span style={{ fontSize:'9px',color:'#16a34a',fontWeight:'700' }}>Ready</span>
                </div>
              </div>
              <div style={{ padding:'16px 18px',fontFamily:'monospace' }}>
                {[
                  { pre:'',        name:'ep01_roman_empire/',    detail:'',                      color:'#818cf8' },
                  { pre:'├── ',    name:'script.txt',            detail:'2,847 words',            color:'#f0f0f0' },
                  { pre:'├── ',    name:'research_notes.txt',    detail:'sources + timeline',     color:'#f0f0f0' },
                  { pre:'├── ',    name:'narration/',            detail:'14 segments',            color:'#818cf8' },
                  { pre:'│   ├── ',name:'seg01_narrator.mp3',    detail:'0:14 · NARRATOR',        color:'#4ade80' },
                  { pre:'│   ├── ',name:'seg02_nero.mp3',        detail:'0:09 · NERO',            color:'#e03535' },
                  { pre:'│   └── ',name:'+12 more segments',     detail:'',                       color:'#383838' },
                  { pre:'├── ',    name:'image_prompts.txt',     detail:'8 Midjourney prompts',   color:'#f0f0f0' },
                  { pre:'├── ',    name:'sound_design.txt',      detail:'6 cues · 12 effects',   color:'#f0f0f0' },
                  { pre:'├── ',    name:'metadata.txt',          detail:'title · tags · chapters',color:'#f0f0f0' },
                  { pre:'└── ',    name:'assembly_guide.txt',    detail:'DaVinci Resolve ready',  color:'#f0f0f0' },
                ].map((f,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'baseline',padding:'3px 0' }}>
                    <span style={{ fontSize:'11px',color:'#2a2a2a',flexShrink:0,whiteSpace:'pre' }}>{f.pre}</span>
                    <span style={{ fontSize:'11px',color:f.color,flex:1 }}>{f.name}</span>
                    {f.detail && <span style={{ fontSize:'10px',color:'#383838',marginLeft:'12px',whiteSpace:'nowrap' }}>{f.detail}</span>}
                  </div>
                ))}
                <div style={{ marginTop:'14px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ background:'#e03535',borderRadius:'6px',padding:'8px',textAlign:'center' }}>
                    <span style={{ fontSize:'11px',color:'#fff',fontWeight:'700' }}>↓ Download complete package</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: artifact cards */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
              {[
                { label:'Script',         detail:'Full narration with hook scores, retention flags, and character voice assignments.' },
                { label:'Audio',          detail:'Numbered MP3s per segment, each rendered in your channel\'s assigned voice.' },
                { label:'Image Prompts',  detail:'Midjourney-ready prompts at mood-shift moments, matched to your visual style.' },
                { label:'Sound Design',   detail:'Music cues, ambient shifts, and timestamped SFX placements from your script.' },
                { label:'Metadata',       detail:'3 title options, full description, searchable tags, and chapter timestamps.' },
                { label:'Assembly Guide', detail:'Segment order, file names, and cue positions formatted for DaVinci Resolve.' },
              ].map((a,i) => (
                <div key={i} className="card-lift" style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:'10px',padding:'18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width:'24px',height:'24px',borderRadius:'6px',background:C.redSoft,border:`1px solid ${C.redMid}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'10px' }}>
                    <span style={{ fontSize:'9px',fontWeight:'800',color:C.red }}>{String(i+1).padStart(2,'0')}</span>
                  </div>
                  <div style={{ fontSize:'13px',fontWeight:'700',color:C.text,marginBottom:'5px' }}>{a.label}</div>
                  <div style={{ fontSize:'11px',color:C.textSub,lineHeight:'1.6' }}>{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding:'80px 48px',background:C.bg,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'1000px',margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:'48px' }}>
            <h2 style={{ fontSize:'34px',fontWeight:'800',color:C.text,letterSpacing:'-1px' }}>Creators love it</h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'16px' }}>
            {TESTIMONIALS.map((t,i) => (
              <div key={i} className="t-card" style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:'15px',color:C.textSub,lineHeight:'1.8',marginBottom:'20px',fontStyle:'italic' }}>"{t.quote}"</div>
                <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                  <div style={{ width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,background:C.redSoft,border:`1px solid ${C.redMid}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:'12px',color:C.red,fontWeight:'700' }}>{t.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:'13px',color:C.text,fontWeight:'600' }}>{t.name}</div>
                    <div style={{ fontSize:'11px',color:C.textMuted }}>{t.channel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding:'80px 48px',background:C.bg,borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'960px',margin:'0 auto' }}>
          <AnimateIn style={{ textAlign:'center',marginBottom:'48px' }}>
            <h2 style={{ fontSize:'38px',fontWeight:'800',color:C.text,marginBottom:'12px',letterSpacing:'-1px' }}>Simple pricing</h2>
            <p style={{ fontSize:'15px',color:C.textSub }}>7-day free trial on all plans. No credit card required to start.</p>
          </AnimateIn>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'16px',alignItems:'stretch' }}>
            {[
              { name:'Creator',price:'$49',period:'/mo',desc:'For creators getting started',features:['5 episodes/month','Full 8-stage pipeline','Hosted AI — no keys needed','Trend research'],cta:'Start free trial →',highlighted:false },
              { name:'Studio',price:'$99',period:'/mo',desc:'For serious creators',features:['11 episodes/month','Full 8-stage pipeline','Hosted AI — no keys needed','Trend research','Priority support'],oneShot:true,cta:'Start free trial →',highlighted:true },
              { name:'Pro',price:'$179',period:'/mo',desc:'For daily creators',features:['30 episodes/month','Full 8-stage pipeline','Hosted AI — no keys needed','Trend research','Priority support'],oneShot:true,cta:'Start free trial →',highlighted:false },
            ].map((plan,i) => (
              <AnimateIn key={i} delay={i * 80}>
              <div className="pricing-card" style={{ background:C.bg,border:`1px solid ${plan.highlighted?C.red:C.border}`,borderRadius:'12px',padding:'32px 28px',position:'relative',boxShadow:plan.highlighted?'0 8px 32px rgba(224,53,53,0.1)':'0 1px 4px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column',height:'100%' }}>
                {plan.highlighted && (
                  <div style={{ position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',background:C.red,color:'#fff',fontSize:'10px',fontWeight:'800',padding:'3px 14px',borderRadius:'20px',letterSpacing:'1px',whiteSpace:'nowrap' }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize:'13px',color:C.textSub,fontWeight:'600',marginBottom:'12px' }}>{plan.name}</div>
                <div style={{ display:'flex',alignItems:'baseline',gap:'3px',marginBottom:'6px' }}>
                  <span style={{ fontSize:'40px',fontWeight:'800',color:C.text,letterSpacing:'-2px' }}>{plan.price}</span>
                  <span style={{ fontSize:'14px',color:C.textMuted }}>{plan.period}</span>
                </div>
                <div style={{ fontSize:'13px',color:C.textSub,marginBottom:'24px' }}>{plan.desc}</div>
                {plan.oneShot && (
                  <div style={{ background:'rgba(224,53,53,0.05)',border:`1px solid rgba(224,53,53,0.18)`,borderRadius:'8px',padding:'10px 12px',display:'flex',alignItems:'flex-start',gap:'8px',marginBottom:'4px' }}>
                    <span style={{ fontSize:'13px',lineHeight:1,marginTop:'1px',flexShrink:0 }}>⚡</span>
                    <div>
                      <div style={{ fontSize:'12px',fontWeight:'700',color:C.red,marginBottom:'2px' }}>One Shot Mode</div>
                      <div style={{ fontSize:'11px',color:C.textSub,lineHeight:'1.4' }}>Full pipeline from a single topic — research, script, titles, voices, and image prompts in one go.</div>
                    </div>
                  </div>
                )}
                <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:'20px',marginBottom:'24px',display:'flex',flexDirection:'column',gap:'10px',flex:1 }}>
                  {plan.features.map((f,j) => (
                    <div key={j} style={{ display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:j===0?C.text:C.textSub,fontWeight:j===0?'600':'400' }}>
                      <span style={{ color:'#16a34a',fontSize:'12px',flexShrink:0,fontWeight:'700' }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <Link to="/try" className={plan.highlighted?'btn-red':'btn-outline'} style={{ display:'block',textAlign:'center',background:plan.highlighted?C.red:'transparent',color:plan.highlighted?'#fff':C.textSub,padding:'12px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:'600',border:plan.highlighted?'none':`1px solid ${C.border}`,boxShadow:plan.highlighted?'0 4px 14px rgba(224,53,53,0.22)':'none' }}>
                  {plan.cta}
                </Link>
              </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding:'80px 48px',background:C.bgMuted,borderTop:`1px solid ${C.border}`,textAlign:'center' }}>
        <div style={{ maxWidth:'520px',margin:'0 auto' }}>
          <h2 style={{ fontSize:'40px',fontWeight:'800',color:C.text,marginBottom:'14px',lineHeight:'1.1',letterSpacing:'-1.5px' }}>Build your next video with Forge</h2>
          <p style={{ fontSize:'16px',color:C.textSub,marginBottom:'32px',lineHeight:'1.7' }}>
            Stop switching tools. Stop losing hours. One pipeline, every stage, built around your channel.
          </p>
          <Link to="/try" className="btn-red" style={{ background:C.red,color:'#fff',padding:'14px 40px',borderRadius:'10px',fontSize:'16px',fontWeight:'700',boxShadow:'0 6px 24px rgba(224,53,53,0.28)' }}>
            Try it free →
          </Link>
          <div style={{ marginTop:'14px',fontSize:'12px',color:C.textMuted }}>
            Set up in under 2 minutes · No credit card required to explore
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:C.bg,borderTop:`1px solid ${C.border}`,padding:'32px 48px' }}>
        <div style={{ maxWidth:'960px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div style={{ fontSize:'13px',fontWeight:'800',letterSpacing:'2px',color:C.red }}>FORGE</div>
          <div style={{ display:'flex',gap:'28px' }}>
            {[{label:'How it works',href:'#how-it-works'},{label:'Trends',href:'#trends'},{label:'Pricing',href:'#pricing'},{label:'Sign in',href:'/login'}].map(item => (
              item.href.startsWith('#')
                ? <a key={item.label} href={item.href} style={{ fontSize:'13px',color:C.textMuted }}>{item.label}</a>
                : <Link key={item.label} to={item.href} style={{ fontSize:'13px',color:C.textMuted }}>{item.label}</Link>
            ))}
          </div>
          <div style={{ fontSize:'12px',color:C.textMuted }}>© 2026 Forge</div>
        </div>
      </footer>
    </div>
  );
}
