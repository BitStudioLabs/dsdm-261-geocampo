import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type LoadingStateProps = {
  color: string;
  text: string;
  size?: 'small' | 'large';
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function LoadingState({ color, containerStyle, size = 'small', text, textStyle }: LoadingStateProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator color={color} size={size} />
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  text: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
});
