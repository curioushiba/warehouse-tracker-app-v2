import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

// Breakpoints (Material Design 3):
//   phone: < 600dp
//   tablet: 600-839dp
//   largeTablet: >= 840dp

export type DeviceClass = 'phone' | 'tablet' | 'largeTablet';

export interface ResponsiveLayout {
  deviceClass: DeviceClass;
  isTablet: boolean;
  isLargeTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  contentMaxWidth: number;
  listColumns: number;
  cardColumns: number;
  gutterWidth: number;
  contentPadding: number;
}

/** Pure function — testable without React */
export function createResponsiveLayout(width: number, height: number): ResponsiveLayout {
  const deviceClass: DeviceClass =
    width >= 840 ? 'largeTablet' : width >= 600 ? 'tablet' : 'phone';

  const isTablet = deviceClass !== 'phone';
  const isLargeTablet = deviceClass === 'largeTablet';

  return {
    deviceClass,
    isTablet,
    isLargeTablet,
    screenWidth: width,
    screenHeight: height,
    contentMaxWidth: isLargeTablet ? 960 : isTablet ? 720 : 560,
    listColumns: isLargeTablet ? 3 : isTablet ? 2 : 1,
    cardColumns: isLargeTablet ? 4 : 3,
    gutterWidth: isTablet ? 16 : 12,
    contentPadding: isTablet ? 24 : 16,
  };
}

/** React hook wrapper */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => createResponsiveLayout(width, height), [width, height]);
}
