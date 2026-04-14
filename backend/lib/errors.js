export function safeError(e, fallback = 'Something went wrong. Please try again.') {
  console.error('[Forge Error]', e);
  const safeMessages = {
    'prompt required': 'Prompt is required.',
    'Invalid plan': 'Invalid plan selected.',
    'Invalid pack': 'Invalid pack selected.',
    'No billing account found': 'No billing account found.',
    'Episode limit reached': 'Episode limit reached.',
    'Episode not found': 'Episode not found.',
  };
  return safeMessages[e.message] || fallback;
}
