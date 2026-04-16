import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type FeedbackCardProps = {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function FeedbackCard({
  containerStyle,
  icon = 'alert-circle-outline',
  iconColor,
  text,
  textStyle,
}: FeedbackCardProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
