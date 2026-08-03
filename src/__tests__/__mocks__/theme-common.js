import { vi } from 'vitest';

export const useColorMode = vi.fn(() => ({ colorMode: 'light', setColorMode: vi.fn() }));
export const useThemeConfig = vi.fn(() => ({}));
