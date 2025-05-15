import { View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedViewProps } from '@/types/allTypes';

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
