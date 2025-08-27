import { Text } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedTextProps } from '@/types/allTypes';

export function ThemedText({
  style,
  lightColor,
  darkColor,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color, flexShrink: 1 }, // Apply the color dynamically
        style,     // Allow additional custom styles
      ]}
      minimumFontScale={0.75}
      adjustsFontSizeToFit={true}
      {...rest}
    />
  );
}