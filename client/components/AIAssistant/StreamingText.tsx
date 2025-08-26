import Animated, { FadeIn } from 'react-native-reanimated';

export const StreamingText = ({ text }: { text: string }) => {
    return (
      <Animated.Text
        entering={FadeIn.duration(300)}
        style={{ fontSize: 16, color: 'white', lineHeight: 22 }}
      >
        {text}
      </Animated.Text>
    );
  };