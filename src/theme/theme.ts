import { Platform } from 'react-native';

export const theme = {
  colors: {
    red: '#D8322F',
    redDark: '#641B1B',
    green: '#2F8A3A',
    yellow: '#D79B21',
    amber: '#D79B21',
    gold: '#D4A62A',
    goldAccent: '#C8902B',
    goldAccentDark: '#6F4F1D',
    blue: '#3D82C7',
    info: '#16738A',
    infoBg: '#102D34',
    infoText: '#C6F4FF',
    black: '#08090A',
    dark: '#121315',
    card: '#191A1D',
    cardAlt: '#15161A',
    text: '#F7F3EA',
    muted: '#9B9DA6',
    border: '#2B2C31',
    white: '#F7F3EA'
  },
  font: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold'
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
