import React from 'react';
import { useCssElement } from 'react-native-css';
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import Reanimated from 'react-native-reanimated';

const cssElement = useCssElement as unknown as (
  component: React.ComponentType<any>,
  props: any,
  mapping: Record<string, string>,
) => React.ReactElement;

export type ViewProps = React.ComponentProps<typeof RNView> & { className?: string };
export const View = (props: ViewProps): React.ReactElement =>
  cssElement(RNView, props, { className: 'style' });

export type TextProps = React.ComponentProps<typeof RNText> & { className?: string };
export const Text = (props: TextProps): React.ReactElement =>
  cssElement(RNText, props, { className: 'style' });

export type PressableProps = React.ComponentProps<typeof RNPressable> & { className?: string };
export const Pressable = (props: PressableProps): React.ReactElement =>
  cssElement(RNPressable, props, { className: 'style' });

export type ScrollViewProps = React.ComponentProps<typeof RNScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};
export const ScrollView = (props: ScrollViewProps): React.ReactElement =>
  cssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });

export type TextInputProps = React.ComponentProps<typeof RNTextInput> & { className?: string };
export const TextInput = (props: TextInputProps): React.ReactElement =>
  cssElement(RNTextInput, props, { className: 'style' });

export const Animated = {
  ...Reanimated,
  View: Reanimated.createAnimatedComponent(View),
};
