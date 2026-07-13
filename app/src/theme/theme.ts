export const colors = {
  primary: '#FF6B4A',
  primaryDark: '#E5502F',
  primarySoft: '#FFE3DA',
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
} as const;

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
