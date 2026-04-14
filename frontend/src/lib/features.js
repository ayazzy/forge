export const PLAN_FEATURES = {
  free:    ['pipeline'],
  creator: ['pipeline', 'trends', 'saved_topics'],
  studio:  ['pipeline', 'trends', 'saved_topics', 'one_shot'],
  pro:     ['pipeline', 'trends', 'saved_topics', 'one_shot', 'voice_clone'],
};

// Returns true if the given plan includes the feature
export function hasFeature(plan, feature) {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}

// Returns the minimum plan that unlocks a feature
export function getUpgradePlan(feature) {
  const order = ['creator', 'studio', 'pro'];
  return order.find(p => PLAN_FEATURES[p].includes(feature)) || 'studio';
}
