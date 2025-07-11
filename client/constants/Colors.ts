/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#000000';
const tintColorDark = '#fff';
const mountainGreen = '#15b8a7' // or '#3ac0a8'?

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
    mountainGreen: mountainGreen,
    skeletonBoxColor: '#e0e0e0',
    skeletonLoadingColor: 'rgba(255, 255, 255, 0.6)',
    buttonBackgroundColor: 'rgba(255, 255, 255, 0.1)', // for light gray tint on dark background
    tabBarInactiveColor: '#c2c7ca',
    popUpMessageBackgroundColor: '#c2c7ca',
    calendarBorderColor: '#c2c7ca',
    specialRed: '#ef4444',
    blurOverlayColor: 'rgba(255,255,255,0.3)',
    storyCardBlurOverlay: 'rgba(0,0,0,0.3)',
    cardColorsGradientOne: 'rgba(201, 201, 201, 0.9)',
    cardColorsGradientTwo: 'rgba(185, 185, 185, 0.9)',
    textThird: '#525252',
    maybeStatusColor: '#FFB347',
    eventCardBackgroundColor: 'rgba(222, 221, 221, 0.51)',
    card: '#f7f7f7',
    eventCardCategoryColor: 'rgba(146, 146, 146, 0.2)',
    eventCardCategoryBorderColor: 'rgba(146, 146, 146, 0.3)',
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
    mountainGreen: mountainGreen,
    skeletonBoxColor: '#2a2a2e',
    skeletonLoadingColor: 'rgba(255, 255, 255, 0.15)',
    buttonBackgroundColor: 'rgba(0, 0, 0, 0.1)', // dark gray tint, better for light backgrounds
    tabBarInactiveColor: '#40404b',
    popUpMessageBackgroundColor: '#40404b',
    calendarBorderColor: '#40404b',
    specialRed: '#ef4444',
    blurOverlayColor: 'rgba(0,0,0,0.3)',
    storyCardBlurOverlay: 'rgba(255,255,255,0.3)',
    cardColorsGradientOne: 'rgba(66, 65, 77, 0.9)',
    cardColorsGradientTwo: 'rgba(46, 45, 57, 0.9)',
    textThird: '#A1A1AA',
    maybeStatusColor: '#FFB347',
    eventCardBackgroundColor: 'rgba(51, 51, 51, 0.5)',
    card: '#222527',
    eventCardCategoryColor: 'rgba(255, 255, 255, 0.2)',
    eventCardCategoryBorderColor: 'rgba(255, 255, 255, 0.3)',
  },
};
