import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { COLORS } from '../constants';
import type { UserRole } from '@/contexts/AuthContext';
import { ROLE_INFO } from '@/contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onBack: () => void;
}

const ROLES: UserRole[] = ['instrutor', 'proprietario', 'gestor'];

function RoleCard({
  role,
  index,
  isSelected,
  onSelect,
}: {
  role: UserRole;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const info = ROLE_INFO[role];
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(index * 100, withSpring(1, { damping: 15, stiffness: 100 }));
  }, [index, progress]);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1, { damping: 12 });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[localStyles.roleCard, isSelected && localStyles.roleCardSelected]}
        onPress={onSelect}
        activeOpacity={0.8}>
        <View style={[localStyles.roleIconBox, isSelected && localStyles.roleIconBoxSelected]}>
          <FontAwesome6
            name={info.icon as any}
            size={22}
            color={isSelected ? COLORS.white : COLORS.leafLight}
          />
        </View>
        <View style={localStyles.roleTextBox}>
          <Text style={[localStyles.roleTitle, isSelected && localStyles.roleTitleSelected]}>
            {info.title}
          </Text>
          <Text style={localStyles.roleDesc}>{info.description}</Text>
        </View>
        <View style={[localStyles.radioOuter, isSelected && localStyles.radioOuterSelected]}>
          {isSelected && <View style={localStyles.radioInner} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function RoleSelector({ selectedRole, onSelectRole, onBack }: RoleSelectorProps) {
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: interpolate(headerProgress.value, [0, 1], [-20, 0]) }],
  }));

  return (
    <View style={localStyles.container}>
      <Animated.View style={[localStyles.header, headerStyle]}>
        <TouchableOpacity
          style={localStyles.backBtn}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome6 name="arrow-left" size={18} color={COLORS.leafLight} />
        </TouchableOpacity>
        <View style={localStyles.headerTextBox}>
          <Text style={localStyles.headerTitle}>Selecione seu Perfil</Text>
          <Text style={localStyles.headerSubtitle}>
            Escolha como deseja acessar o sistema
          </Text>
        </View>
      </Animated.View>

      <View style={localStyles.rolesContainer}>
        {ROLES.map((role, index) => (
          <RoleCard
            key={role}
            role={role}
            index={index}
            isSelected={selectedRole === role}
            onSelect={() => onSelectRole(role)}
          />
        ))}
      </View>

      <View style={localStyles.divider}>
        <View style={localStyles.dividerLine} />
        <Text style={localStyles.dividerText}>GeoCampo</Text>
        <View style={localStyles.dividerLine} />
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(77,200,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.25)',
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textGray,
  },
  rolesContainer: {
    gap: 14,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 14,
  },
  roleCardSelected: {
    backgroundColor: 'rgba(77,200,90,0.12)',
    borderColor: 'rgba(77,200,90,0.4)',
  },
  roleIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(77,200,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxSelected: {
    backgroundColor: COLORS.stemGreen,
  },
  roleTextBox: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.offWhite,
    marginBottom: 3,
  },
  roleTitleSelected: {
    color: COLORS.leafLight,
  },
  roleDesc: {
    fontSize: 12,
    color: COLORS.textGray,
    lineHeight: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.leafLight,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.leafLight,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: COLORS.textGray,
    fontSize: 11,
    letterSpacing: 1,
  },
});
