import { ThemeContext } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';

export const StreamingText = ({ text, themeColors }: { text: string, themeColors: any }) => {
    return (
      <Animated.Text
        entering={FadeIn.duration(300)}
        style={{ fontSize: 16, color: themeColors.text, lineHeight: 22 }}
      >
        {text}
      </Animated.Text>
    );
  };