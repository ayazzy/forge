import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateChannelTemplate } from '../lib/api';

const ACCENT = '#e03535';

const TONES = [
  { value: 'dark_serious', label: 'Dark & Serious', description: 'Cinematic, weighty, makes viewers think deeply' },
  { value: 'neutral_educational', label: 'Neutral & Educational', description: 'Clear, informative, teaches and informs' },
  { value: 'light_entertaining', label: 'Light & Entertaining', description: 'Fun, accessible, enjoyable to watch' },
];

const LENGTHS = [
  { value: 8, label: '8 minutes', description: '~1,000 words — short form' },
  { value: 12, label: '12 minutes', description: '~1,500 words — standard' },
  { value: 15, label: '15 minutes', description: '~2,000 words — long form' },
  { value: 20, label: '20 minutes', description: '~2,600 words — deep dive' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    channel_name: '',
    description: '',
    tone: '',
    video_length: 15,
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.channel_name.trim().length > 0;
    if (step === 2) return form.description.trim().length > 20;
    if (step === 3) return form.tone.length > 0;
    if (step === 4) return form.video_length > 0;
    return true;
  };

  const handleFinish = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateChannelTemplate(form);
      navigate('/dashboard');
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
    maxWidth: '540px',
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
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚙️</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
            Setting up {form.channel_name}...
          </div>
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '32px' }}>
            Forge is generating a custom production template for your channel. This takes about 10 seconds.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {[
              'Analysing your channel description',
              'Generating research approach',
              'Crafting script style guide',
              'Configuring visual aesthetic',
              'Building mood palette',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#555' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', marginBottom: '32px', color: ACCENT }}>FORGE</div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: s <= step ? ACCENT : '#2a2a2a',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
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
              style={{ ...sharedInputStyle, fontSize: '14px', minHeight: '140px', lineHeight: '1.6', resize: 'vertical' }}
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
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: form.tone === t.value ? '600' : '400', marginBottom: '2px' }}>{t.label}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{t.description}</div>
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
            {LENGTHS.map(l => (
              <div key={l.value} style={optionStyle(form.video_length === l.value)} onClick={() => update('video_length', l.value)}>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: form.video_length === l.value ? '600' : '400', marginBottom: '2px' }}>{l.label}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{l.description}</div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#2a1515', border: '1px solid #3a1515', borderRadius: '6px', fontSize: '12px', color: '#e03535' }}>
            {error}
          </div>
        )}

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

        {step > 1 && (
          <div
            style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#444', cursor: 'pointer' }}
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </div>
        )}

      </div>
    </div>
  );
}
