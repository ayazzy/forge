import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a1a', padding: '0 40px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '2px', color: '#e03535' }}>FORGE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>Pricing</a>
          <Link to="/login" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>Sign in</Link>
          <Link to="/signup" style={{
            background: '#e03535', color: '#fff', padding: '8px 20px',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600',
          }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 40px 80px', background: '#111',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: '20px', padding: '6px 16px', marginBottom: '32px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e03535' }} />
          <span style={{ fontSize: '12px', color: '#888' }}>AI-powered video production pipeline</span>
        </div>

        <h1 style={{
          fontSize: '64px', fontWeight: '800', color: '#fff',
          lineHeight: '1.1', marginBottom: '24px', maxWidth: '800px',
          letterSpacing: '-1px',
        }}>
          Your AI production team for YouTube channels
        </h1>

        <p style={{ fontSize: '20px', color: '#888', marginBottom: '48px', maxWidth: '520px', lineHeight: '1.6' }}>
          From idea to upload-ready in one sitting. Research, script, voiceover, images, sound design, and metadata — all in one place.
        </p>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '64px' }}>
          <Link to="/signup" style={{
            background: '#e03535', color: '#fff', padding: '14px 32px',
            borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: '700',
          }}>
            Start for free →
          </Link>
          <Link to="/login" style={{
            background: 'transparent', color: '#888', padding: '14px 32px',
            borderRadius: '10px', textDecoration: 'none', fontSize: '15px', border: '1px solid #333',
          }}>
            Sign in
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', color: '#555', fontSize: '13px' }}>
          {['✓ No credit card required', '✓ Set up in 2 minutes', '✓ Works for any niche'].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section style={{ padding: '100px 40px', background: '#0d0d0d', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', color: '#e03535', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: '600' }}>
            The problem
          </div>
          <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', marginBottom: '16px', lineHeight: '1.2' }}>
            Making videos is painful and fragmented
          </h2>
          <p style={{ fontSize: '17px', color: '#888', marginBottom: '64px', lineHeight: '1.7' }}>
            Most creators juggle 6 different tools, lose hours to context switching, and still end up with inconsistent output. The process kills momentum before a video ever gets made.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { icon: '⏱', title: 'Hours wasted per video', desc: 'Research, scripting, voiceover, images, editing — each in a different tool with no connection between them.' },
              { icon: '🔀', title: 'Constant context switching', desc: 'Copy-pasting between Claude, ElevenLabs, Midjourney, Suno, CapCut. Every switch breaks your flow.' },
              { icon: '📉', title: 'Inconsistent output', desc: 'Without a system, every video starts from scratch. Quality varies, style drifts, momentum dies.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #222',
                borderRadius: '12px', padding: '28px', textAlign: 'left',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{item.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section style={{ padding: '100px 40px', background: '#111', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', color: '#e03535', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: '600' }}>
            The solution
          </div>
          <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', marginBottom: '16px', lineHeight: '1.2' }}>
            One pipeline. Every stage. Done.
          </h2>
          <p style={{ fontSize: '17px', color: '#888', marginBottom: '64px', lineHeight: '1.7' }}>
            Forge is built around how faceless channels actually work. Describe your channel once. Forge configures itself to your niche, tone, and style — then runs the full production pipeline for every video you make.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { stage: '01', label: 'Research', desc: 'Deep topic research brief in seconds' },
              { stage: '02', label: 'Story', desc: 'Full script written in your channel voice' },
              { stage: '03', label: 'Narration', desc: 'AI voiceover with multiple voice options' },
              { stage: '04', label: 'Sound', desc: 'Complete sound design plan with cues' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #222',
                borderRadius: '12px', padding: '24px', textAlign: 'left',
              }}>
                <div style={{ fontSize: '11px', color: '#e03535', fontWeight: '700', marginBottom: '12px', letterSpacing: '1px' }}>{item.stage}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { stage: '05', label: 'Visuals', desc: 'Image prompts for every key moment' },
              { stage: '06', label: 'Assembly', desc: 'Timeline view with everything mapped' },
              { stage: '07', label: 'Thumbnail', desc: '3 thumbnail concepts ready to produce' },
              { stage: '08', label: 'Publish', desc: 'YouTube titles, tags, chapters, description' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #222',
                borderRadius: '12px', padding: '24px', textAlign: 'left',
              }}>
                <div style={{ fontSize: '11px', color: '#e03535', fontWeight: '700', marginBottom: '12px', letterSpacing: '1px' }}>{item.stage}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 40px', background: '#0d0d0d' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '12px', color: '#e03535', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: '600' }}>
              Features
            </div>
            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', lineHeight: '1.2' }}>
              Everything your channel needs
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { icon: '🎯', title: 'Custom channel templates', desc: 'Describe your channel once. Forge generates a custom AI template for your niche, tone, and style. Every video starts perfectly configured.' },
              { icon: '✍️', title: 'Hook scoring & retention analysis', desc: 'Score your opening hook on 5 dimensions. Find the 3 moments most likely to lose viewers before they drop off.' },
              { icon: '🎙️', title: 'Multi-voice narration', desc: 'Generate voiceover for every segment of your script. Multiple voices, adjustable settings, download as ZIP.' },
              { icon: '🖼️', title: 'Intelligent image prompts', desc: "Forge detects mood shifts in your script and generates image prompts at exactly the right moments — in your channel's visual style." },
              { icon: '🎵', title: 'Sound design plans', desc: 'Complete music bed, ambient layer, and sound effect plan with timestamps. Ready to hand to any audio tool.' },
              { icon: '📊', title: 'YouTube-ready metadata', desc: '3 title options, full description, tags, and chapter timestamps — all generated from your script.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #222',
                borderRadius: '12px', padding: '28px', display: 'flex', gap: '16px',
              }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 40px', background: '#111', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ fontSize: '12px', color: '#e03535', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', fontWeight: '600' }}>
            Pricing
          </div>
          <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', marginBottom: '16px', lineHeight: '1.2' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: '17px', color: '#888', marginBottom: '64px' }}>
            Start free. Scale when you're ready.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              {
                name: 'Starter', price: '$9', period: '/month',
                desc: 'For creators getting started',
                features: ['Full 8-stage pipeline', 'Bring your own API keys', 'Unlimited episodes', 'Custom channel template', 'Email support'],
                cta: 'Get started', highlighted: false,
              },
              {
                name: 'Pro', price: '$49', period: '/month',
                desc: 'For serious creators',
                features: ['Everything in Starter', 'Hosted Claude + Ideogram APIs', 'No API keys needed', 'Trend research page', 'Priority support'],
                cta: 'Start Pro', highlighted: true,
              },
              {
                name: 'Studio', price: '$99', period: '/month',
                desc: 'For power creators',
                features: ['Everything in Pro', 'Hosted ElevenLabs API', 'In-app music generation', 'Higher usage limits', 'Team seats (coming soon)'],
                cta: 'Start Studio', highlighted: false,
              },
            ].map((plan, i) => (
              <div key={i} style={{
                background: plan.highlighted ? '#1a0a0a' : '#1a1a1a',
                border: `1px solid ${plan.highlighted ? '#e03535' : '#222'}`,
                borderRadius: '12px', padding: '32px', textAlign: 'left', position: 'relative',
              }}>
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: '#e03535', color: '#fff', fontSize: '11px', fontWeight: '700',
                    padding: '4px 16px', borderRadius: '20px', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#888', marginBottom: '8px' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '42px', fontWeight: '800', color: '#fff' }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: '#555' }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>{plan.desc}</div>
                <div style={{ borderTop: '1px solid #222', paddingTop: '24px', marginBottom: '24px' }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#0a2a1a', border: '1px solid #14532d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '9px', color: '#4ade80' }}>✓</span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#888' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/signup" style={{
                  display: 'block', textAlign: 'center',
                  background: plan.highlighted ? '#e03535' : '#222',
                  color: '#fff', padding: '12px 24px', borderRadius: '8px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                  border: plan.highlighted ? 'none' : '1px solid #333',
                }}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '100px 40px', background: '#0d0d0d', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '800', color: '#fff', marginBottom: '16px', lineHeight: '1.2' }}>
            Start making videos faster
          </h2>
          <p style={{ fontSize: '17px', color: '#888', marginBottom: '40px', lineHeight: '1.6' }}>
            Join creators who've replaced hours of fragmented production work with one focused pipeline.
          </p>
          <Link to="/signup" style={{
            background: '#e03535', color: '#fff', padding: '16px 40px',
            borderRadius: '10px', textDecoration: 'none', fontSize: '16px',
            fontWeight: '700', display: 'inline-block',
          }}>
            Get started free →
          </Link>
          <div style={{ marginTop: '24px', fontSize: '13px', color: '#555' }}>
            No credit card required · Set up in 2 minutes
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#111', borderTop: '1px solid #1a1a1a', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '2px', color: '#e03535', marginBottom: '16px' }}>FORGE</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '24px' }}>
          {[
            { label: 'Features', href: '#features' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Sign in', href: '/login' },
            { label: 'Sign up', href: '/signup' },
          ].map(item => (
            item.href.startsWith('#')
              ? <a key={item.label} href={item.href} style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item.label}</a>
              : <Link key={item.label} to={item.href} style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item.label}</Link>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#333' }}>© 2026 Forge. All rights reserved.</div>
      </footer>

    </div>
  );
}
