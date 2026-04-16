import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type EmptyStateCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  containerStyle?: StyleProp<ViewStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  showIconWrap?: boolean;
};

export function EmptyStateCard({
  containerStyle,
  description,
  descriptionStyle,
  icon,
  iconColor,
  iconWrapStyle,
  showIconWrap = true,
  title,
  titleStyle,
}: EmptyStateCardProps) {
  const iconNode = <Ionicons name={icon} size={24} color={iconColor} />;

  return (
    <View style={[styles.container, containerStyle]}>
      {showIconWrap ? <View style={[styles.iconWrap, iconWrapStyle]}>{iconNode}</View> : iconNode}
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      <Text style={[styles.description, descriptionStyle]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
