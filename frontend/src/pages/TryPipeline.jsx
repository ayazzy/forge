import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Stage0Research from '../components/stages/Stage0Research';
import Stage1Script from '../components/stages/Stage1Script';

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

// Minimal channel profile for guests
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

export default function TryPipeline() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup'); // setup | research | script | gate
  const [channelDesc, setChannelDesc] = useState('');
  const [stageData, setStageData] = useState({});
  const [channelProfile, setChannelProfile] = useState(null);

  // Restore guest session if exists
  useEffect(() => {
    const saved = loadGuestSession();
    if (saved?.stageData && saved?.channelProfile) {
      setStageData(saved.stageData);
      setChannelProfile(saved.channelProfile);
      setChannelDesc(saved.channelProfile.description || '');
      // Resume at furthest completed stage
      if (saved.stageData[1]) setPhase('gate');
      else if (saved.stageData[0]) setPhase('script');
      else setPhase('research');
    }
  }, []);

  const handleSetup = () => {
    if (!channelDesc.trim()) return;
    const profile = buildGuestProfile(channelDesc.trim());
    setChannelProfile(profile);
    saveGuest({ channelProfile: profile, stageData: {} });
    setPhase('research');
  };

  const handleApprove = (stage, data) => {
    const newStageData = { ...stageData, [stage]: data };
    setStageData(newStageData);
    saveGuest({ channelProfile, stageData: newStageData });
    if (stage === 0) setPhase('script');
    if (stage === 1) setPhase('gate');
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

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', color: '#fff' }}>

      {/* Minimal nav */}
      <nav style={{ borderBottom: '1px solid #1e1e1e', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', color: ACCENT, textDecoration: 'none' }}>FORGE</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {phase !== 'setup' && (
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

        {/* Setup phase */}
        {phase === 'setup' && (
          <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '40px' }}>
            <div style={{ fontSize: '11px', color: ACCENT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
              Try Forge — no account needed
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', lineHeight: '1.1', letterSpacing: '-1px', marginBottom: '12px' }}>
              Build your first video in minutes
            </h1>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.7', marginBottom: '36px' }}>
              You'll get a full research brief and script. Takes about 2 minutes. No signup required.
            </p>

            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '28px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                What's your channel about?
              </label>
              <input
                style={{ ...inputStyle, marginBottom: '8px' }}
                placeholder="e.g. History of empires and civilizations"
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetup()}
                autoFocus
              />
              <div style={{ fontSize: '11px', color: '#333', marginBottom: '20px' }}>
                This shapes the research angle and writing style. You can refine it later.
              </div>
              <button
                onClick={handleSetup}
                disabled={!channelDesc.trim()}
                style={{
                  width: '100%', background: channelDesc.trim() ? ACCENT : '#222', color: channelDesc.trim() ? '#fff' : '#444',
                  border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px',
                  fontWeight: '700', cursor: channelDesc.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                }}
              >
                Start building →
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
              {['Research brief', 'Full script', 'Hook scoring'].map((f, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#4ade80', fontWeight: '700', fontSize: '10px' }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research phase */}
        {phase === 'research' && channelProfile && (
          <Stage0Research
            onApprove={d => handleApprove(0, d)}
            saved={stageData[0]}
            data={{ channelProfile }}
            isComplete={false}
            onBackToSummary={() => {}}
          />
        )}

        {/* Script phase */}
        {phase === 'script' && channelProfile && (
          <Stage1Script
            onApprove={d => handleApprove(1, d)}
            saved={stageData[1]}
            researchData={stageData[0]}
            isComplete={false}
            onBackToSummary={() => {}}
          />
        )}

        {/* Gate phase */}
        {phase === 'gate' && (
          <div>
            {/* What they built */}
            <div style={{ background: '#0a2a1a', border: '1px solid #14532d', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', color: '#4ade80', fontWeight: '700' }}>✓</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '3px' }}>
                  {mergedData.topic || 'Your episode'} — Research + Script complete
                </div>
                <div style={{ fontSize: '12px', color: '#4ade80' }}>
                  {mergedData.analysis?.wordCount ? `${mergedData.analysis.wordCount.toLocaleString()} words · ` : ''}
                  {mergedData.analysis?.minutes != null ? `${mergedData.analysis.minutes}m ${mergedData.analysis.seconds}s estimated` : 'Script ready'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Left: what's locked */}
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Create a free account to unlock</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {[
                    { label: 'Voice narration', detail: 'AI voices assigned to each character. Download a full audio package.' },
                    { label: 'Image prompts', detail: '8 Midjourney-ready prompts at every mood shift in your script.' },
                    { label: 'Sound design', detail: 'Music cues, ambient layers, and timestamped SFX.' },
                    { label: 'YouTube metadata', detail: '3 title options, full description, tags, and chapter marks.' },
                    { label: 'Your work saved', detail: 'This research and script preserved — pick up where you left off.' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2a1515', border: '1px solid #3a1515', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: ACCENT, flexShrink: 0, marginTop: '1px' }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#ccc', marginBottom: '2px' }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.5' }}>{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/signup"
                  style={{
                    display: 'block', textAlign: 'center', background: ACCENT, color: '#fff',
                    padding: '13px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                    textDecoration: 'none', boxShadow: '0 4px 14px rgba(224,53,53,0.28)',
                  }}
                >
                  Create free account — work is saved →
                </Link>
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#333', textAlign: 'center' }}>
                  Already have an account? <Link to="/login" style={{ color: '#555', textDecoration: 'none' }}>Sign in</Link>
                </div>
              </div>

              {/* Right: script preview */}
              <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Your script</div>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.8', maxHeight: '340px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {mergedData.script?.substring(0, 800)}
                  {mergedData.script?.length > 800 && (
                    <span style={{ color: '#333' }}>…</span>
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
