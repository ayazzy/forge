import { Link } from 'react-router-dom';
import { getUpgradePlan } from '../../lib/features';

const PLAN_NAMES = { creator: 'Creator', studio: 'Studio', pro: 'Pro' };

const FEATURE_LABELS = {
  one_shot: 'One Shot Mode',
  voice_clone: 'Voice Cloning',
};

export default function UpgradePrompt({ feature, onClose, style = {} }) {
  const requiredPlan = getUpgradePlan(feature);
  const planName = PLAN_NAMES[requiredPlan] || 'Studio';
  const featureLabel = FEATURE_LABELS[feature] || feature;

  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid rgba(224,53,53,0.25)',
      borderRadius: '10px',
      padding: '16px 18px',
      ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{featureLabel}</div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: '1' }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px', lineHeight: '1.5' }}>
        {featureLabel} is available on the {planName} plan and above.
      </div>
      <Link
        to="/pricing"
        style={{
          display: 'inline-block',
          background: '#e03535',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '600',
          padding: '8px 14px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Upgrade to {planName} →
      </Link>
    </div>
  );
}
