import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const contentMaxWidth = isMobile ? width : isTablet ? 768 : 1180;
  const numColumns = isMobile ? 1 : isTablet ? 2 : 3;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    contentMaxWidth,
    numColumns
  };
}
