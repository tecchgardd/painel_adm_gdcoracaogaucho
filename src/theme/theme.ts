import { Platform } from 'react-native';

export const theme = {
  colors: {
    red: '#C62828',
    redDark: '#8E1616',
    green: '#2E7D32',
    yellow: '#F9A825',
    black: '#111111',
    dark: '#1A1A1A',
    card: '#202020',
    cardAlt: '#171717',
    text: '#F5F5F5',
    muted: '#9CA3AF',
    border: '#333333',
    white: '#F5F5F5'
  },
  layout: {
    mobileMaxWidth: 430,
    adminMaxWidth: 900,
    modalMaxWidth: 480
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22
  }
};

export const colors = theme.colors;
export const isWeb = Platform.OS === 'web';
export const isDesktopWidth = (width: number) => isWeb && width >= 768;
export const isMobileWidth = (width: number) => width < 768;
export const isDesktop = isDesktopWidth;
export const isMobile = isMobileWidth;
