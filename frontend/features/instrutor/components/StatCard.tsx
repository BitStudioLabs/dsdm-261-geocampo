import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string | number;
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function StatCard({
  children,
  containerStyle,
  icon,
  iconColor,
  iconWrapStyle,
  label,
  labelStyle,
  value,
  valueStyle,
}: StatCardProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.iconWrap, iconWrapStyle]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, valueStyle]}>{value}</Text>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
  },
});
