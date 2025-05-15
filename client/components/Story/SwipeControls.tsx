import React from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';

type SwipeControlsProps = {
  pause: () => void;
  play: () => void;
  previous: () => void;
  next: () => void;
  isLongPress: boolean;
  setIsLongPress: (value: boolean) => void;
};

const SwipeControls: React.FC<SwipeControlsProps> = ({
  pause,
  play,
  previous,
  next,
  isLongPress,
  setIsLongPress,
}) => {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
      }}
    >
      <TouchableWithoutFeedback
        onLongPress={() => {
          setIsLongPress(true);
          pause();
        }}
        onPressOut={() => {
          setIsLongPress(false);
          play();
        }}
        onPress={() => {
          if (!isLongPress) previous();
        }}
      >
        <View style={{ flex: 1 }} />
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback
        onLongPress={() => {
          pause();
          setIsLongPress(true);
        }}
        onPressOut={() => {
          play();
          setIsLongPress(false);
        }}
        onPress={() => {
          if (!isLongPress) next();
        }}
      >
        <View style={{ flex: 1 }} />
      </TouchableWithoutFeedback>
    </View>
  );
};

export default SwipeControls;