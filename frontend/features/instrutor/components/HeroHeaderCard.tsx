import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type HeroHeaderCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  containerStyle?: StyleProp<ViewStyle>;
  copyStyle?: StyleProp<ViewStyle>;
  eyebrowStyle?: StyleProp<TextStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  metricStyle?: StyleProp<ViewStyle>;
  metricLabelStyle?: StyleProp<TextStyle>;
  metricValueStyle?: StyleProp<TextStyle>;
};

export function HeroHeaderCard({
  containerStyle,
  copyStyle,
  description,
  descriptionStyle,
  eyebrow,
  eyebrowStyle,
  metricLabel,
  metricLabelStyle,
  metricStyle,
  metricValue,
  metricValueStyle,
  title,
  titleStyle,
}: HeroHeaderCardProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.copy, copyStyle]}>
        <Text style={[styles.eyebrow, eyebrowStyle]}>{eyebrow}</Text>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        <Text style={[styles.description, descriptionStyle]}>{description}</Text>
      </View>

      <View style={[styles.metric, metricStyle]}>
        <Text style={[styles.metricLabel, metricLabelStyle]}>{metricLabel}</Text>
        <Text style={[styles.metricValue, metricValueStyle]}>{metricValue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  metric: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
});
