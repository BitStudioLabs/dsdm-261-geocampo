import { StyleSheet } from 'react-native';

import { CADASTRO_PROPRIEDADE_THEME as T } from './constants';

export const fs = StyleSheet.create({
  fieldWrap: { marginBottom: 2 },
  label: { color: T.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 5, marginTop: 10, textTransform: 'uppercase' },
  hint: { color: T.muted, fontSize: 11, marginBottom: 4, lineHeight: 15 },
  inputBox: { backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBdr, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  inputFocused: { borderColor: T.borderFoc },
  inputError: { borderColor: T.red },
  input: { color: T.white, fontSize: 14, padding: 0, margin: 0 },
  inputMulti: { minHeight: 80 },
  errorMsg: { color: T.red, fontSize: 11, marginTop: 4 },
});

export const cs = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  chipSel: { backgroundColor: 'rgba(77,200,90,0.16)', borderColor: 'rgba(77,200,90,0.45)' },
  txt: { color: T.muted, fontSize: 12, fontWeight: '700' },
  txtSel: { color: T.white },
});

export const ss = StyleSheet.create({
  card: { backgroundColor: T.card, borderRadius: 20, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 4 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { color: T.white, fontSize: 16, fontWeight: '800' },
  hint: { color: T.muted, fontSize: 12, lineHeight: 17, marginHorizontal: 16, marginBottom: 2 },
  body: { padding: 16, paddingTop: 4 },
});

export const stp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 0 },
  item: { alignItems: 'center', position: 'relative', flexDirection: 'row', gap: 6 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: T.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  dotActive: { borderColor: T.green, backgroundColor: 'rgba(77,200,90,0.15)' },
  dotDone: { borderColor: T.green, backgroundColor: T.green },
  dotNum: { color: T.muted, fontSize: 11, fontWeight: '700' },
  dotNumActive: { color: T.green },
  lbl: { color: T.muted, fontSize: 11, fontWeight: '600' },
  lblActive: { color: T.white },
  line: { width: 28, height: 1.5, backgroundColor: T.inputBdr, marginHorizontal: 4 },
  lineDone: { backgroundColor: T.green },
});

export const mun = StyleSheet.create({
  wrap: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdown: { backgroundColor: '#0d2810', borderWidth: 1, borderColor: T.border, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemText: { color: T.white, fontSize: 13, flex: 1 },
  itemUF: { color: T.muted, fontSize: 11, fontWeight: '700' },
});

export const rs = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 28 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  title: { color: T.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: T.muted, fontSize: 13, marginTop: 2 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 8 },
  loadingCardText: { color: T.muted, fontSize: 13, fontWeight: '600' },
  sections: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(77,200,90,0.1)', borderWidth: 1.5, borderColor: 'rgba(77,200,90,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 10, marginBottom: 6 },
  gpsBtnText: { color: T.green, fontSize: 13, fontWeight: '700' },
  areasToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4 },
  areasToggleText: { color: T.muted, fontSize: 13, fontWeight: '600', flex: 1 },
  ownerSearchState: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 10 },
  ownerSearchStateText: { color: T.muted, fontSize: 12, fontWeight: '600' },
  ownerList: { marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  ownerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  ownerItemIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,200,90,0.12)' },
  ownerItemName: { color: T.white, fontSize: 13, fontWeight: '700' },
  ownerItemMeta: { color: T.muted, fontSize: 12, marginTop: 2 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  emailBadgeOk: { backgroundColor: 'rgba(77,200,90,0.1)' },
  emailBadgeNew: { backgroundColor: 'rgba(245,200,66,0.1)' },
  emailBadgeText: { fontSize: 12, fontWeight: '600' },
  feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 13, borderWidth: 1 },
  feedbackOk: { backgroundColor: T.okBg, borderColor: T.okBdr },
  feedbackErr: { backgroundColor: T.redBg, borderColor: T.redBdr },
  feedbackText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.green, borderRadius: 14, paddingVertical: 14 },
  btnPrimaryText: { color: T.bg, fontSize: 15, fontWeight: '800' },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, paddingVertical: 14 },
  btnSecondaryText: { color: T.white, fontSize: 15, fontWeight: '700' },
});
