import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateChannelTemplate, importChannelFromUrl, getChannelProfile } from '../lib/api';

const ACCENT = '#e03535';

const TONES = [
  { value: 'dark_serious', label: 'Dark & Serious', description: 'Cinematic, weighty, makes viewers think deeply' },
  { value: 'investigative', label: 'Investigative & Journalistic', description: 'Research-driven, exposes truth, builds tension through evidence' },
  { value: 'narrative_storytelling', label: 'Narrative & Storytelling', description: 'Character-driven, immersive, pulls viewers into the story' },
  { value: 'neutral_educational', label: 'Neutral & Educational', description: 'Clear, informative, teaches and informs' },
  { value: 'inspirational', label: 'Inspirational & Motivational', description: 'Uplifting, empowering, drives viewers to take action' },
  { value: 'light_entertaining', label: 'Light & Entertaining', description: 'Fun, accessible, enjoyable to watch' },
  { value: 'conversational', label: 'Conversational & Personal', description: 'Authentic, relatable, feels like talking to a friend' },
  { value: 'custom', label: 'Custom — describe your own', description: 'Write your own tone description for Forge to follow' },
];

const LENGTHS = [
  { value: 5, label: '5 minutes', description: '~650 words — quick & punchy' },
  { value: 8, label: '8 minutes', description: '~1,000 words — short form' },
  { value: 12, label: '12 minutes', description: '~1,500 words — standard' },
  { value: 15, label: '15 minutes', description: '~2,000 words — long form' },
  { value: 20, label: '20 minutes', description: '~2,600 words — deep dive' },
  { value: 30, label: '30 minutes', description: '~3,900 words — documentary style' },
  { value: 0, label: 'Custom', description: 'Enter your own target length' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  // step 0 = import choice, step 1-4 = manual steps
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    channel_name: '',
    description: '',
    tone: '',
    video_length: 15,
  });

  // Import state
  const [channelUrl, setChannelUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importConfidence, setImportConfidence] = useState(null);
  const [importedSubscribers, setImportedSubscribers] = useState(null);
  const [importedTone, setImportedTone] = useState(null);
  const [customTone, setCustomTone] = useState('');
  const [importedVideoLength, setImportedVideoLength] = useState(null);
  const [customLength, setCustomLength] = useState('');

  // Returning users who are already configured skip onboarding
  useEffect(() => {
    getChannelProfile().then(profile => {
      if (profile?.is_configured) navigate('/dashboard', { replace: true });
    }).catch(() => {});
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.channel_name.trim().length > 0;
    if (step === 2) return form.description.trim().length > 20;
    if (step === 3) return form.tone.length > 0 && (form.tone !== 'custom' || customTone.trim().length > 10);
    if (step === 4) return form.video_length !== null && (form.video_length > 0 || (customLength.trim() && parseInt(customLength) > 0));
    return true;
  };

  const handleImport = async () => {
    const url = channelUrl.trim();
    if (!url) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await importChannelFromUrl(url);
      setForm({
        channel_name: result.channel_name || '',
        description: result.description || '',
        tone: result.tone || '',
        video_length: result.video_length || 15,
      });
      setImportConfidence(result.confidence || 'high');
      setImportedSubscribers(result.subscribers || null);
      setImportedTone(result.tone || null);
      setImportedVideoLength(result.video_length || null);
      setStep(1);
    } catch (e) {
      setImportError(e.message || 'Could not analyze channel. Check the URL and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleFinish = async () => {
    setGenerating(true);
    setError(null);
    try {
      const payload = {
        ...form,
        tone: form.tone === 'custom' ? customTone.trim() : form.tone,
        video_length: form.video_length === 0 ? parseInt(customLength) : form.video_length,
      };
      await generateChannelTemplate(payload);
      navigate('/pricing');
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setGenerating(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    background: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
    padding: '32px',
  };

  const cardStyle = {
    background: '#1a1a1a',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '48px',
    width: '100%',
    maxWidth: '680px',
  };

  const optionStyle = (selected) => ({
    border: `1.5px solid ${selected ? ACCENT : '#2a2a2a'}`,
    borderRadius: '8px',
    padding: '14px 18px',
    cursor: 'pointer',
    background: selected ? '#2a1515' : '#222',
    marginBottom: '8px',
    transition: 'all 0.15s ease',
  });

  const btnStyle = (disabled) => ({
    background: disabled ? '#2a2a2a' : ACCENT,
    color: disabled ? '#444' : '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
    marginTop: '24px',
    fontFamily: 'inherit',
  });

  const sharedInputStyle = {
    width: '100%',
    background: '#222',
    border: '1.5px solid #2a2a2a',
    borderRadius: '8px',
    padding: '14px 16px',
    fontSize: '15px',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  if (generating) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>

          {/* Progress bar */}
          <div style={{ height: '2px', background: '#222', borderRadius: '1px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: ACCENT,
              borderRadius: '1px',
              animation: 'progressFill 12s ease-in-out forwards',
            }} />
          </div>

          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
            Setting up {form.channel_name}
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '32px' }}>
            Building your custom production template...
          </div>

          {/* Animated steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {[
              'Analysing your channel description',
              'Generating research approach',
              'Crafting your script style guide',
              'Configuring visual aesthetic',
              'Building your mood palette',
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: 0,
                  animation: `fadeInStep 0.5s ease forwards ${i * 1.8}s`,
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#444',
                    animation: `dotPulse 1s ease infinite ${i * 1.8}s`,
                  }} />
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>{item}</div>
              </div>
            ))}
          </div>

          <style>{`
            @keyframes progressFill {
              from { width: 0%; }
              to { width: 95%; }
            }
            @keyframes fadeInStep {
              from { opacity: 0; transform: translateX(-8px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes dotPulse {
              0%, 100% { background: #e03535; opacity: 1; }
              50% { background: #e03535; opacity: 0.4; }
            }
          `}</style>

        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', marginBottom: '32px', color: ACCENT }}>FORGE</div>

        {step > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                flex: 1, height: '3px', borderRadius: '2px',
                background: s <= step ? ACCENT : '#2a2a2a',
                transition: 'background 0.3s ease',
              }} />
            ))}
          </div>
        )}

        {step === 0 && (
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Welcome to Forge
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '32px' }}>
              Do you have an existing YouTube channel?
            </div>

            {/* Import option */}
            <div
              style={{
                border: '1.5px solid #2a2a2a',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '12px',
                cursor: 'pointer',
                background: '#1e1e1e',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                Yes — import my channel
              </div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                Paste your YouTube URL and Forge will auto-fill your channel profile.
              </div>
              <div style={{ fontSize: '11px', color: '#444', marginBottom: '16px' }}>
                Tip: sign in with the Google account linked to your YouTube channel.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ ...sharedInputStyle, flex: 1, fontSize: '13px', padding: '10px 14px' }}
                  placeholder="https://youtube.com/@YourChannel"
                  value={channelUrl}
                  onChange={e => setChannelUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && channelUrl.trim() && !importing && handleImport()}
                  onClick={e => e.stopPropagation()}
                />
                <button
                  onClick={e => { e.stopPropagation(); handleImport(); }}
                  disabled={!channelUrl.trim() || importing}
                  style={{
                    background: channelUrl.trim() && !importing ? ACCENT : '#2a2a2a',
                    color: channelUrl.trim() && !importing ? '#fff' : '#444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: channelUrl.trim() && !importing ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {importing ? 'Analyzing…' : 'Import →'}
                </button>
              </div>
              {importError && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#e03535', padding: '8px 12px', background: '#2a1515', borderRadius: '6px', border: '1px solid #3a1515' }}>
                  {importError}
                </div>
              )}
            </div>

            {/* Manual option */}
            <div
              onClick={() => setStep(1)}
              style={{
                border: '1.5px solid #2a2a2a',
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                background: '#1e1e1e',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                No — I'll set up manually
              </div>
              <div style={{ fontSize: '12px', color: '#555' }}>
                Answer a few questions about your channel style and niche.
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            {importConfidence && (
              <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>✓</span>
                <div>
                  <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: '600' }}>
                    Channel found{importedSubscribers ? ` · ${importedSubscribers.toLocaleString()} subscribers` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>
                    Review the fields below and edit anything that needs adjusting.
                  </div>
                </div>
              </div>
            )}
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              What's your channel called?
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>
              Forge will use this to personalise your entire production pipeline.
            </div>
            <input
              autoFocus
              style={sharedInputStyle}
              placeholder="e.g. Unraveled, The Vault, Dark Chapters..."
              value={form.channel_name}
              onChange={e => update('channel_name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canProceed() && setStep(2)}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Describe your channel
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>
              What do you make videos about? Who watches them? What makes your channel different? The more specific you are, the better Forge will understand your style.
            </div>
            <textarea
              autoFocus
              style={{ ...sharedInputStyle, fontSize: '14px', minHeight: '200px', lineHeight: '1.6', resize: 'vertical' }}
              placeholder="e.g. I make dark cinematic history videos about ordinary people caught inside empires and systems. My audience loves deeply researched, serious content about how historical forces shaped individual lives."
              value={form.description}
              onChange={e => update('description', e.target.value)}
            />
            <div style={{ fontSize: '11px', color: form.description.length < 20 ? '#444' : '#4ade80', marginTop: '6px' }}>
              {form.description.length < 20 ? 'Write at least a couple of sentences for best results' : '✓ Good — Forge has enough to work with'}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              What's your channel tone?
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>
              Forge will write every script in this register.
            </div>
            {TONES.map(t => (
              <div key={t.value} style={optionStyle(form.tone === t.value)} onClick={() => update('tone', t.value)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: form.tone === t.value ? '600' : '400' }}>{t.label}</div>
                  {importedTone === t.value && (
                    <div style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', padding: '1px 6px', fontWeight: '600', flexShrink: 0 }}>
                      Suggested by Forge
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#555' }}>{t.description}</div>
                {t.value === 'custom' && form.tone === 'custom' && (
                  <textarea
                    autoFocus
                    style={{ ...sharedInputStyle, fontSize: '13px', minHeight: '80px', lineHeight: '1.6', resize: 'vertical', marginTop: '12px' }}
                    placeholder="e.g. Dry and analytical with unexpected moments of dark humour. Clinical but never cold."
                    value={customTone}
                    onChange={e => { e.stopPropagation(); setCustomTone(e.target.value); }}
                    onClick={e => e.stopPropagation()}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              How long are your videos?
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>
              Forge will target this length for every script it writes.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {LENGTHS.map(l => (
                <div key={l.value} style={optionStyle(form.video_length === l.value)} onClick={() => update('video_length', l.value)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: form.video_length === l.value ? '600' : '400' }}>{l.label}</div>
                    {importedVideoLength === l.value && l.value !== 0 && (
                      <div style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', padding: '1px 6px', fontWeight: '600', flexShrink: 0 }}>
                        Suggested
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{l.description}</div>
                  {l.value === 0 && form.video_length === 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        max="30"
                        style={{ ...sharedInputStyle, fontSize: '13px', padding: '8px 12px' }}
                        placeholder="e.g. 25"
                        value={customLength}
                        onChange={e => { e.stopPropagation(); setCustomLength(Math.min(30, Math.max(1, parseInt(e.target.value) || 0)).toString()); }}
                        onClick={e => e.stopPropagation()}
                      />
                      <div style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>Max 30 minutes</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#2a1515', border: '1px solid #3a1515', borderRadius: '6px', fontSize: '12px', color: '#e03535' }}>
            {error}
          </div>
        )}

        {step >= 1 && (
          <button
            style={btnStyle(!canProceed())}
            disabled={!canProceed()}
            onClick={() => {
              if (step < 4) setStep(step + 1);
              else handleFinish();
            }}
          >
            {step < 4 ? 'Continue →' : 'Generate My Channel Template →'}
          </button>
        )}

        {step >= 1 && (
          <div
            style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#444', cursor: 'pointer' }}
            onClick={() => {
              if (step === 1) { setStep(0); setImportConfidence(null); }
              else setStep(step - 1);
            }}
          >
            ← Back
          </div>
        )}

      </div>
    </div>
  );
}
