/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#000000';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    aiBackgroundColor: '#222527',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: "#D1D5DB",
    inputBackgroundColor: '#f7f7f7',
    placeholderTextColor: '#c2c7ca',
    textSecondary: '#6B7280',
    mountainGreen: '#3ac0a8',
    skeletonBoxColor: '#e0e0e0',
    skeletonLoadingColor: 'rgba(255, 255, 255, 0.6)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    aiBackgroundColor: '#222527',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: "#4B5563",
    inputBackgroundColor: '#40404b',
    placeholderTextColor: '#7e7e8a',
    textSecondary: '#cecece',
    mountainGreen: '#3ac0a8',
    skeletonBoxColor: '#2a2a2e',
    skeletonLoadingColor: 'rgba(255, 255, 255, 0.15)',
  },
};
