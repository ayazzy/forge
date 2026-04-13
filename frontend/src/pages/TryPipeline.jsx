import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Stage0Research from '../components/stages/Stage0Research';
import Stage1Script from '../components/stages/Stage1Script';
import { claude, claudeStream } from '../lib/api';
import { analyzeScript } from '../lib/analysis';

const ACCENT = '#e03535';
const GUEST_KEY = 'forge_guest_session';

function saveGuest(data) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(data)); } catch {}
}

export function loadGuestSession() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || 'null'); } catch { return null; }
}

export function clearGuestSession() {
  try { localStorage.removeItem(GUEST_KEY); } catch {}
}

function buildGuestProfile(channelDesc) {
  return {
    channel_name: 'Your Channel',
    description: channelDesc,
    tone: 'neutral_educational',
    video_length: 12,
    prompt_config: {
      researchPrompt: `Research this topic thoroughly for a YouTube channel focused on: ${channelDesc}.`,
      scriptPrompt: `Write in an engaging, informative style suited for: ${channelDesc}.`,
      targetWordCount: 1500,
    },
  };
}

const STEP_LABELS = {
  research: 'Researching your topic',
  script: 'Writing your script',
  hook: 'Scoring the hook',
  titles: 'Generating YouTube titles',
  voices: 'Building voice cast',
  images: 'Creating image prompts',
};

function StepRow({ stepKey, status }) {
  const label = STEP_LABELS[stepKey];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1e1e1e' }}>
      <div style={{ width: '20px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {status === 'done' && <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '700' }}>✓</span>}
        {status === 'loading' && (
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #333', borderTopColor: '#888', animation: 'spin 0.7s linear infinite' }} />
        )}
        {(!status || status === 'waiting') && <span style={{ color: '#2a2a2a', fontSize: '13px' }}>○</span>}
      </div>
      <span style={{
        fontSize: '13px',
        color: status === 'done' ? '#ccc' : status === 'loading' ? '#fff' : '#333',
        fontWeight: status === 'loading' ? '600' : '400',
      }}>
        {label}
        {status === 'loading' && <span style={{ color: '#555' }}>…</span>}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', color: '#444', fontSize: '12px' }}>
      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #333', borderTopColor: '#666', animation: 'spin 0.7s linear infinite' }} />
      Generating…
    </div>
  );
}

export default function TryPipeline() {
  // phase: setup | research | script | oneshot | gate
  const [phase, setPhase] = useState('setup');
  const [channelDesc, setChannelDesc] = useState('');
  const [stageData, setStageData] = useState({});
  const [channelProfile, setChannelProfile] = useState(null);
  const [gateTab, setGateTab] = useState('titles');

  // Gate content (generated in gate phase or one-shot)
  const [titles, setTitles] = useState(null);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [voices, setVoices] = useState(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [imagePrompts, setImagePrompts] = useState(null);
  const [loadingImages, setLoadingImages] = useState(false);

  // One-shot state
  const [oneShotTopic, setOneShotTopic] = useState('');
  const [oneShotCtx, setOneShotCtx] = useState('');
  const [oneShotRunning, setOneShotRunning] = useState(false);
  const [oneShotSteps, setOneShotSteps] = useState({});
  const [oneShotScript, setOneShotScript] = useState('');

  const setStep = (key, status) => setOneShotSteps(prev => ({ ...prev, [key]: status }));

  // Restore guest session on mount
  useEffect(() => {
    const saved = loadGuestSession();
    if (saved?.stageData && saved?.channelProfile) {
      setStageData(saved.stageData);
      setChannelProfile(saved.channelProfile);
      setChannelDesc(saved.channelProfile.description || '');
      if (saved.stageData[1]) {
        setPhase('gate');
        // Use cached gate content if available — skip regenerating
        if (saved.gateContent?.titles) {
          setTitles(saved.gateContent.titles);
          setVoices(saved.gateContent.voices || null);
          setImagePrompts(saved.gateContent.imagePrompts || null);
        } else {
          generateGateContent(saved.stageData[1], saved.channelProfile);
        }
      } else if (saved.stageData[0]) setPhase('script');
      else setPhase('research');
    }
  }, []);

  // Auto-save gate content to localStorage whenever it updates
  useEffect(() => {
    if (phase !== 'gate') return;
    if (!titles && !voices && !imagePrompts) return;
    const session = loadGuestSession();
    if (session) {
      saveGuest({ ...session, gateContent: { titles, voices, imagePrompts } });
    }
  }, [titles, voices, imagePrompts, phase]);

  const generateGateContent = async (scriptData, profile) => {
    const topic = scriptData?.topic || '';
    const script = scriptData?.script || '';
    if (!script) return;
    setLoadingTitles(true);
    setLoadingVoices(true);
    setLoadingImages(true);
    runTitles(topic, script, profile).finally(() => setLoadingTitles(false));
    runVoices(script).finally(() => setLoadingVoices(false));
    runImages(topic, script).finally(() => setLoadingImages(false));
  };

  const runTitles = async (topic, script, profile) => {
    const raw = await claude(`Generate 3 compelling YouTube video titles for this video. Make them specific, curiosity-driven, and optimized for clicks. Avoid generic titles.
Channel focus: ${profile?.description || ''}
Topic: ${topic}
Script opening: "${script.substring(0, 400)}"
Return ONLY valid JSON: {"titles":[{"title":"string","angle":"one sentence on why this title works"}]}`, 600);
    let parsed = null;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = { error: true }; }
    setTitles(parsed);
    return parsed;
  };

  const runVoices = async (script) => {
    const raw = await claude(`Analyze this script and identify the distinct narrator and any character voices. Most scripts have 1 narrator + 0-2 quoted figures.
Script: "${script.substring(0, 2500)}"
Return ONLY valid JSON: {"characters":[{"name":"string","role":"string","voiceStyle":"e.g. deep authoritative male, warm female narrator","sampleLine":"exact quote from the script, max 25 words"}]}
Identify 1-3 voices only. sampleLine must be a verbatim excerpt from the script above.`, 600);
    let parsed = null;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = { error: true }; }
    setVoices(parsed);
    return parsed;
  };

  const runImages = async (topic, script) => {
    const raw = await claude(`Generate 4 Midjourney image prompts for the most visually striking moments in this script. Each prompt should be cinematic and production-ready.
Topic: ${topic}
Script: "${script.substring(0, 2000)}"
Return ONLY valid JSON: {"prompts":[{"scene":"2-4 word scene label","prompt":"full Midjourney prompt with camera angle, lighting, mood, art style — no people's faces"}]}`, 800);
    let parsed = null;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = { error: true }; }
    setImagePrompts(parsed);
    return parsed;
  };

  const handleSetup = (mode) => {
    if (!channelDesc.trim()) return;
    const profile = buildGuestProfile(channelDesc.trim());
    setChannelProfile(profile);
    saveGuest({ channelProfile: profile, stageData: {} });
    setPhase(mode === 'oneshot' ? 'oneshot' : 'research');
  };

  const handleApprove = (stage, data) => {
    const newStageData = { ...stageData, [stage]: data };
    setStageData(newStageData);
    saveGuest({ channelProfile, stageData: newStageData });
    if (stage === 0) setPhase('script');
    if (stage === 1) {
      setPhase('gate');
      generateGateContent(data, channelProfile);
    }
  };

  const runOneShot = async () => {
    if (!oneShotTopic.trim() || oneShotRunning) return;
    setOneShotRunning(true);
    setOneShotScript('');
    setOneShotSteps({});

    try {
      // Step 1: Research
      setStep('research', 'loading');
      const researchRaw = await claude(`You are a researcher for a YouTube channel focused on: ${channelDesc}.

Research this topic thoroughly and return a structured brief a content creator can use.

Topic: ${oneShotTopic}
${oneShotCtx ? `Additional context: ${oneShotCtx}` : ''}

Return ONLY valid JSON:
{
  "coreConcept": "The central idea or angle for this video (1-2 sentences)",
  "context": "Key background information the viewer needs",
  "mainSubject": { "name": "string", "role": "string", "angle": "string" },
  "keyFacts": [{ "fact": "string", "why": "string" }],
  "authenticDetails": ["string"],
  "avoidCliches": ["string"]
}`, 2000);
      let research = null;
      try { research = JSON.parse(researchRaw.replace(/```json|```/g, '').trim()); } catch {}
      setStep('research', 'done');

      const researchText = research ? `TOPIC: ${oneShotTopic}\nCORE CONCEPT: ${research.coreConcept || ''}\nCONTEXT: ${research.context || ''}\nKEY FACTS:\n${(research.keyFacts || []).map(f => `• ${f.fact} — ${f.why}`).join('\n')}` : '';

      // Step 2: Script (streaming)
      setStep('script', 'loading');
      const scriptPrompt = `You are the writer for a YouTube channel focused on: ${channelDesc}.

Write an engaging, informative narration script of approximately 1500 words.
Topic: ${oneShotTopic}
${oneShotCtx ? `Additional context: ${oneShotCtx}` : ''}
${researchText ? `Research brief:\n${researchText}` : ''}

CRITICAL — Opening hook requirements:
- Intrigue: Start mid-action or with a statement that demands the viewer continue
- Specificity: Use concrete names, dates, numbers — no vague generalities
- Stakes: Establish immediately that something important hangs in the balance
- Voice: Be distinctive and confident, not generic
- Pacing: Short punchy sentences that pull the reader forward

Return ONLY the script. No headers, no stage directions, pure narration prose.`;

      let fullScript = '';
      await claudeStream(scriptPrompt, (chunk) => {
        fullScript += chunk;
        setOneShotScript(fullScript);
      }, 4000);
      setStep('script', 'done');

      const analysis = analyzeScript(fullScript);

      // Save stage data
      const newStageData = {
        0: { topic: oneShotTopic, context: oneShotCtx, research, researchText },
        1: { topic: oneShotTopic, ctx: oneShotCtx, script: fullScript, analysis },
      };
      setStageData(newStageData);
      saveGuest({ channelProfile, stageData: newStageData });

      // Step 3: Hook score, titles, voices, images — all parallel
      setStep('hook', 'loading');
      setStep('titles', 'loading');
      setStep('voices', 'loading');
      setStep('images', 'loading');
      setLoadingTitles(true);
      setLoadingVoices(true);
      setLoadingImages(true);

      const firstPara = fullScript.trim().split(/\n\n/)[0] || '';

      // Collect results so we can persist them before transitioning
      let generatedTitles = null, generatedVoices = null, generatedImages = null;

      await Promise.all([
        claude(`You are a YouTube retention expert. Score this opening hook.
Hook: "${firstPara}"
Return ONLY valid JSON: {"overall":7,"dimensions":{"intrigue":{"score":8,"note":"..."},"specificity":{"score":7,"note":"..."},"stakes":{"score":6,"note":"..."},"voice":{"score":8,"note":"..."},"pacing":{"score":7,"note":"..."}},"rewrite":"improved version","whyBetter":"one sentence"}`, 800)
          .then(() => setStep('hook', 'done'))
          .catch(() => setStep('hook', 'done')),

        runTitles(oneShotTopic, fullScript, channelProfile)
          .then((t) => { generatedTitles = t; setStep('titles', 'done'); setLoadingTitles(false); }),

        runVoices(fullScript)
          .then((v) => { generatedVoices = v; setStep('voices', 'done'); setLoadingVoices(false); }),

        runImages(oneShotTopic, fullScript)
          .then((img) => { generatedImages = img; setStep('images', 'done'); setLoadingImages(false); }),
      ]);

      // Persist gate content alongside stage data so refresh doesn't re-generate
      saveGuest({ channelProfile, stageData: newStageData, gateContent: { titles: generatedTitles, voices: generatedVoices, imagePrompts: generatedImages } });

      setPhase('gate');
    } catch (e) {
      console.error('One-shot error:', e);
    } finally {
      setOneShotRunning(false);
    }
  };

  const mergedData = {
    ...Object.values(stageData).reduce((acc, d) => ({ ...acc, ...d }), {}),
    channelProfile,
  };

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px',
    padding: '12px 16px', fontSize: '15px', color: '#fff', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const GATE_TABS = [
    { key: 'titles', label: 'Titles', loading: loadingTitles },
    { key: 'voices', label: 'Voice Cast', loading: loadingVoices },
    { key: 'visuals', label: 'Image Prompts', loading: loadingImages },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', color: '#fff' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1e1e1e', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', color: ACCENT, textDecoration: 'none' }}>FORGE</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {(phase === 'research' || phase === 'script' || phase === 'gate') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Research', 'Script'].map((label, i) => {
                const done = stageData[i];
                const active = (phase === 'research' && i === 0) || (phase === 'script' && i === 1) || (phase === 'gate' && i === 1);
                return (
                  <div key={i} style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600',
                    background: done ? 'rgba(74,222,128,0.1)' : active ? 'rgba(224,53,53,0.12)' : 'transparent',
                    color: done ? '#4ade80' : active ? ACCENT : '#333',
                  }}>
                    {done ? '✓ ' : ''}{label}
                  </div>
                );
              })}
            </div>
          )}
          <Link to="/login" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>Sign in</Link>
          <Link to="/signup" style={{ background: ACCENT, color: '#fff', padding: '7px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            Create account
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
            <div style={{ fontSize: '11px', color: ACCENT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Try Forge — no account needed
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', lineHeight: '1.1', letterSpacing: '-1px', marginBottom: '12px' }}>
              Build your first video in minutes
            </h1>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.7', marginBottom: '36px' }}>
              No signup required. Choose how you want to build.
            </p>

            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                What's your channel about?
              </label>
              <input
                style={{ ...inputStyle }}
                placeholder="e.g. History of empires and civilizations"
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && channelDesc.trim() && handleSetup('oneshot')}
                autoFocus
              />
            </div>

            {/* Two paths */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* One shot */}
              <button
                onClick={() => handleSetup('oneshot')}
                disabled={!channelDesc.trim()}
                style={{
                  background: channelDesc.trim() ? ACCENT : '#1a1a1a',
                  border: `1px solid ${channelDesc.trim() ? ACCENT : '#222'}`,
                  borderRadius: '12px', padding: '20px', cursor: channelDesc.trim() ? 'pointer' : 'not-allowed',
                  textAlign: 'left', color: channelDesc.trim() ? '#fff' : '#333', fontFamily: 'inherit',
                  boxShadow: channelDesc.trim() ? '0 4px 20px rgba(224,53,53,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.8 }}>
                  One Shot
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
                  Generate everything at once →
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.5' }}>
                  Enter a topic. Forge writes the research, script, titles, voice cast, and image prompts automatically.
                </div>
              </button>

              {/* Step by step */}
              <button
                onClick={() => handleSetup('stepbystep')}
                disabled={!channelDesc.trim()}
                style={{
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  borderRadius: '12px', padding: '20px', cursor: channelDesc.trim() ? 'pointer' : 'not-allowed',
                  textAlign: 'left', color: channelDesc.trim() ? '#ccc' : '#333', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', color: '#555' }}>
                  Step by Step
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
                  Guide me through it →
                </div>
                <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.5' }}>
                  Research first, then script. Approve each stage before moving on.
                </div>
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {['Research brief', 'Full script', 'Titles + voices + visuals'].map((f, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#4ade80', fontWeight: '700', fontSize: '10px' }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP-BY-STEP: RESEARCH ── */}
        {phase === 'research' && channelProfile && (
          <Stage0Research
            onApprove={d => handleApprove(0, d)}
            saved={stageData[0]}
            data={{ channelProfile }}
            isComplete={false}
            onBackToSummary={() => {}}
          />
        )}

        {/* ── STEP-BY-STEP: SCRIPT ── */}
        {phase === 'script' && channelProfile && (
          <Stage1Script
            onApprove={d => handleApprove(1, d)}
            saved={stageData[1]}
            researchData={{ ...stageData[0], channelProfile }}
            isComplete={false}
            onBackToSummary={() => {}}
          />
        )}

        {/* ── ONE SHOT ── */}
        {phase === 'oneshot' && (
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', color: ACCENT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>One Shot Mode</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>What's your video about?</div>
            </div>

            {!oneShotRunning ? (
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Topic</label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. The fall of Constantinople, 1453"
                      value={oneShotTopic}
                      onChange={e => setOneShotTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && oneShotTopic.trim() && runOneShot()}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                      Additional Context <span style={{ color: '#333', textTransform: 'none', fontWeight: '400' }}>(optional)</span>
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. Focus on the last Byzantine emperor, avoid battle-by-battle recaps"
                      value={oneShotCtx}
                      onChange={e => setOneShotCtx(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={runOneShot}
                    disabled={!oneShotTopic.trim()}
                    style={{
                      background: oneShotTopic.trim() ? ACCENT : '#222',
                      color: oneShotTopic.trim() ? '#fff' : '#444',
                      border: 'none', borderRadius: '8px', padding: '14px', fontSize: '14px',
                      fontWeight: '700', cursor: oneShotTopic.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', marginTop: '4px',
                    }}
                  >
                    Generate everything →
                  </button>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #222' }}>
                  <div style={{ fontSize: '11px', color: '#333', marginBottom: '8px' }}>Forge will generate:</div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {['Research brief', 'Full script', 'Hook score', 'YouTube titles', 'Voice cast', 'Image prompts'].map(s => (
                      <div key={s} style={{ fontSize: '11px', color: '#444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#2a2a2a' }}>○</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
                {/* Progress tracker */}
                <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{oneShotTopic}</div>
                  <div style={{ fontSize: '11px', color: '#444', marginBottom: '16px' }}>Generating your production package</div>
                  {Object.keys(STEP_LABELS).map(key => (
                    <StepRow key={key} stepKey={key} status={oneShotSteps[key]} />
                  ))}
                </div>

                {/* Live script preview */}
                <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Script</div>
                  {oneShotScript ? (
                    <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.9', whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'auto' }}>
                      {oneShotScript}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#333', fontStyle: 'italic' }}>
                      {oneShotSteps.research === 'done' ? 'Writing script…' : 'Researching topic…'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GATE ── */}
        {phase === 'gate' && (
          <div>
            {/* Header banner */}
            <div style={{ background: '#0a2a1a', border: '1px solid #14532d', borderRadius: '12px', padding: '20px 28px', marginBottom: '28px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '22px', color: '#4ade80' }}>✓</span>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '3px' }}>
                    {mergedData.topic || 'Your episode'} — production package ready
                  </div>
                  <div style={{ fontSize: '12px', color: '#4ade80' }}>
                    {mergedData.analysis?.wordCount ? `${mergedData.analysis.wordCount.toLocaleString()} words · ` : ''}
                    {mergedData.analysis?.minutes != null ? `${mergedData.analysis.minutes}m ${mergedData.analysis.seconds}s · ` : ''}
                    Titles, voice cast &amp; image prompts generated
                  </div>
                  <div style={{ fontSize: '11px', color: '#2d6a4f', marginTop: '4px' }}>
                    ⚡ You just used One Shot Mode — available on Studio &amp; Pro plans
                  </div>
                </div>
              </div>
              <Link
                to="/signup?redirect=/pricing"
                style={{ background: ACCENT, color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(224,53,53,0.3)' }}
              >
                Start free trial →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>

              {/* Left: CTA */}
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '24px', position: 'sticky', top: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Forge built your full production package.</div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px', lineHeight: '1.6' }}>Sign up to produce it — narration, sound design, visuals, and metadata.</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'Research brief', done: true },
                    { label: 'Full script', done: true },
                    { label: 'YouTube titles', done: true },
                    { label: 'Voice cast', done: true },
                    { label: 'Image prompts', done: true },
                    { label: 'Voice narration (audio)', done: false },
                    { label: 'Sound design', done: false },
                    { label: 'Assembly guide', done: false },
                    { label: 'Thumbnail concepts', done: false },
                    { label: 'Full YouTube metadata', done: false },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: item.done ? '#4ade80' : '#333', width: '12px' }}>{item.done ? '✓' : '○'}</span>
                      <span style={{ fontSize: '12px', color: item.done ? '#ccc' : '#444' }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/signup?redirect=/pricing"
                  style={{
                    display: 'block', textAlign: 'center', background: ACCENT, color: '#fff',
                    padding: '13px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                    textDecoration: 'none', boxShadow: '0 4px 14px rgba(224,53,53,0.28)',
                    marginBottom: '10px',
                  }}
                >
                  Start your free trial →
                </Link>
                <div style={{ fontSize: '11px', color: '#333', textAlign: 'center' }}>
                  7 days free · work is saved · no commitment
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#333', textAlign: 'center' }}>
                  Already have an account? <Link to="/login?redirect=/pricing" style={{ color: '#555', textDecoration: 'none' }}>Sign in</Link>
                </div>
              </div>

              {/* Right: generated output tabs */}
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
                  {GATE_TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setGateTab(t.key)}
                      style={{
                        flex: 1, padding: '14px 16px', background: 'transparent', border: 'none',
                        borderBottom: gateTab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                        color: gateTab === t.key ? '#fff' : '#444',
                        fontSize: '12px', fontWeight: gateTab === t.key ? '700' : '400',
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      {t.label}
                      {t.loading && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid #444', borderTopColor: '#888', animation: 'spin 0.7s linear infinite' }} />
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '24px' }}>

                  {gateTab === 'titles' && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', marginBottom: '16px' }}>3 title options generated — optimized for clicks and search.</div>
                      {loadingTitles && <Spinner />}
                      {titles?.error && <div style={{ fontSize: '12px', color: '#555' }}>Could not generate titles.</div>}
                      {titles && !titles.error && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(titles.titles || []).map((t, i) => (
                            <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '6px', lineHeight: '1.4' }}>{t.title}</div>
                              <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.5' }}>{t.angle}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: '20px', padding: '14px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Also included with your account</div>
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.7' }}>Full YouTube description · tags · chapter marks with timestamps · A/B thumbnail concepts</div>
                      </div>
                    </div>
                  )}

                  {gateTab === 'voices' && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', marginBottom: '16px' }}>Forge identified the voices in your script and assigned AI voice profiles to each.</div>
                      {loadingVoices && <Spinner />}
                      {voices?.error && <div style={{ fontSize: '12px', color: '#555' }}>Could not generate voice cast.</div>}
                      {voices && !voices.error && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(voices.characters || []).map((c, i) => (
                            <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>{c.name}</div>
                                  <div style={{ fontSize: '11px', color: '#555' }}>{c.role}</div>
                                </div>
                                <div style={{ fontSize: '11px', color: ACCENT, background: 'rgba(224,53,53,0.08)', border: '1px solid rgba(224,53,53,0.15)', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                  {c.voiceStyle}
                                </div>
                              </div>
                              {c.sampleLine && (
                                <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', lineHeight: '1.6', borderLeft: '2px solid #2a2a2a', paddingLeft: '12px' }}>
                                  "{c.sampleLine}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: '20px', padding: '14px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>With your account</div>
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.7' }}>Generate full narration audio · download per-character audio files · custom voice settings per character</div>
                      </div>
                    </div>
                  )}

                  {gateTab === 'visuals' && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', marginBottom: '16px' }}>4 Midjourney-ready image prompts for the most cinematic moments in your script.</div>
                      {loadingImages && <Spinner />}
                      {imagePrompts?.error && <div style={{ fontSize: '12px', color: '#555' }}>Could not generate image prompts.</div>}
                      {imagePrompts && !imagePrompts.error && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(imagePrompts.prompts || []).map((p, i) => (
                            <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 16px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{p.scene}</div>
                              <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.6', fontFamily: 'monospace' }}>{p.prompt}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: '20px', padding: '14px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>With your account</div>
                        <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.7' }}>8 prompts total · one per mood shift · linked to script timestamps · thumbnail concepts</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
