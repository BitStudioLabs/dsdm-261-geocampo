import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';

type PageLink = number | '...';

type PaginationControlsProps = {
  page: number;
  pageLinks: PageLink[];
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
  totalPages: number;
  visibleItems: number;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onPageSizeChange: (size: number) => void;
};

export function PaginationControls({
  page,
  pageLinks,
  pageSize,
  pageSizeOptions,
  totalItems,
  totalPages,
  visibleItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const firstVisibleItem = (page - 1) * pageSize + 1;
  const lastVisibleItem = (page - 1) * pageSize + visibleItems;

  return (
    <>
      <View style={styles.paginationToolbar}>
        <Text style={styles.paginationText}>
          {`Mostrando ${firstVisibleItem} a ${lastVisibleItem} de ${totalItems}`}
        </Text>
        <View style={styles.pageSizeControls}>
          {pageSizeOptions.map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.pageSizeButton, pageSize === size && styles.pageSizeButtonActive]}
              onPress={() => onPageSizeChange(size)}
              activeOpacity={0.85}>
              <Text style={[styles.pageSizeText, pageSize === size && styles.pageSizeTextActive]}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.pageNumberRow}>
        <TouchableOpacity
          style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
          onPress={() => onPageChange(1)}
          disabled={page === 1}
          activeOpacity={0.85}>
          <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>1a</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
          onPress={() => onPageChange((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          activeOpacity={0.85}>
          <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>Anterior</Text>
        </TouchableOpacity>

        {pageLinks.map((pageNumber, index) =>
          pageNumber === '...' ? (
            <Text key={`dots-${index}`} style={styles.pageDots}>...</Text>
          ) : (
            <TouchableOpacity
              key={pageNumber}
              style={[styles.pageNumberButton, pageNumber === page && styles.pageNumberButtonActive]}
              onPress={() => onPageChange(pageNumber)}
              activeOpacity={0.85}>
              <Text style={[styles.pageNumberText, pageNumber === page && styles.pageNumberTextActive]}>{pageNumber}</Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
          onPress={() => onPageChange((current) => Math.min(totalPages, current + 1))}
          disabled={page === totalPages}
          activeOpacity={0.85}>
          <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Proxima</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageNavButton, page === totalPages && styles.pageNavButtonDisabled]}
          onPress={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          activeOpacity={0.85}>
          <Text style={[styles.pageNavText, page === totalPages && styles.pageNavTextDisabled]}>Ultima</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  paginationToolbar: { marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  paginationText: { color: THEME.textSoft, fontSize: 12, flex: 1 },
  pageSizeControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageSizeButton: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: THEME.lineStrong },
  pageSizeButtonActive: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary },
  pageSizeText: { color: THEME.textMuted, fontSize: 11, fontWeight: '800' },
  pageSizeTextActive: { color: '#fff' },
  pageNumberRow: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pageNavButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.lineStrong, backgroundColor: 'rgba(255,255,255,0.06)' },
  pageNavButtonDisabled: { opacity: 0.4 },
  pageNavText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pageNavTextDisabled: { color: 'rgba(255,255,255,0.5)' },
  pageNumberButton: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: THEME.lineStrong, backgroundColor: 'rgba(255,255,255,0.06)' },
  pageNumberButtonActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  pageNumberText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pageNumberTextActive: { color: THEME.page },
  pageDots: { color: THEME.textMuted, fontSize: 11, paddingVertical: 6, paddingHorizontal: 8 },
});
