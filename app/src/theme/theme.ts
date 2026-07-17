export const colors = {
  primary: '#FF6B4A',
  primaryDark: '#E5502F',
  primarySoft: '#FFE3DA',
  accent: '#8B5CF6',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceAlt: '#F1F1F3',
  border: '#E7E7EA',
  text: '#1C1C1E',
  textMuted: '#6B6B70',
  textInverse: '#FFFFFF',
  success: '#2FAE60',
  warning: '#F2A93B',
  danger: '#E14B4B',
  disabled: '#C9C9CD',
  facebook: '#1877F2',
} as const;

// Glassmorphism is the primary surface language (cards, headers, modals) —
// vivid gradients behind, frosted-glass panels on top.
export const gradients = {
  // Sunset gradient — brand button fills, hero accents.
  brand: ['#FF6B4A', '#FF4D8D', '#8B5CF6'] as const,
  // Soft peach->lavender wash used as the full-screen background instead of
  // flat white — subtle enough not to fight the glass cards on top.
  backgroundSoft: ['#FFF6F2', '#FDEFFB', '#F3EEFF'] as const,
};

export const glass = {
  background: 'rgba(255,255,255,0.55)',
  backgroundStrong: 'rgba(255,255,255,0.75)',
  border: 'rgba(255,255,255,0.6)',
  blurIntensity: 40,
};

// Neumorphism is the secondary, tactile language — buttons, switches,
// inputs, tab bar. Needs a solid (non-transparent) base tone to compute a
// believable light/dark shadow pair against, tinted toward the brand accent
// rather than plain black so it stays cohesive with the gradient palette.
export const neu = {
  base: '#F5F1FA',
  shadowLight: '#FFFFFF',
  shadowDark: 'rgba(139, 92, 246, 0.18)',
  offset: 6,
  radius: 10,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
