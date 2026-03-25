import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, Product, StockData } from '@/lib/api';

export default function StockScreen() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getStock();
      setData(result);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load stock');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const lowCount = (data?.products ?? []).filter((p) => p.quantity <= p.reorderLevel).length;
  const currency = data?.currency ?? '$';

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#3b82f6" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Stock</Text>
            <Text style={styles.subtitle}>Manage SKUs and quantities</Text>
          </View>
          <View style={styles.pillDanger}>
            <Text style={styles.pillDangerText}>Low: {lowCount}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Add Product</Text>
        </TouchableOpacity>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{data?.products.length ?? 0} SKUs</Text>
          {(data?.products ?? []).map((p: Product) => {
            const isLow = p.quantity <= p.reorderLevel;
            return (
              <View key={p.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{p.name}</Text>
                  <Text style={styles.rowSku}>{p.sku} · {p.unit}</Text>
                </View>
                <View style={[styles.qtyPill, isLow && styles.qtyPillDanger]}>
                  <Text style={[styles.qtyText, isLow && styles.qtyTextDanger]}>{p.quantity}</Text>
                </View>
                <Text style={styles.price}>{currency}{p.salePrice.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ProductFormModal
        visible={showForm}
        currency={currency}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </>
  );
}

type FormState = {
  name: string; sku: string; unit: string;
  costPrice: string; salePrice: string; quantity: string; reorderLevel: string;
};

function ProductFormModal({
  visible, currency, onClose, onSaved
}: { visible: boolean; currency: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>({
    name: '', sku: '', unit: '', costPrice: '', salePrice: '', quantity: '0', reorderLevel: '10'
  });
  const [saving, setSaving] = useState(false);

  function field(key: keyof FormState) {
    return (val: string) => setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name || !form.sku || !form.unit || !form.costPrice || !form.salePrice) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      await api.createProduct({
        name: form.name,
        sku: form.sku,
        unit: form.unit,
        costPrice: parseFloat(form.costPrice),
        salePrice: parseFloat(form.salePrice),
        quantity: parseInt(form.quantity, 10) || 0,
        reorderLevel: parseInt(form.reorderLevel, 10) || 10
      });
      setForm({ name: '', sku: '', unit: '', costPrice: '', salePrice: '', quantity: '0', reorderLevel: '10' });
      onSaved();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Product</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
        </View>

        {([
          ['Name', 'name', 'text', 'Kingfisher Premium'],
          ['SKU', 'sku', 'text', 'KF-PREM-650'],
          ['Unit', 'unit', 'text', 'bottle / can / ml'],
          [`Cost Price (${currency})`, 'costPrice', 'decimal', '0.00'],
          [`Sale Price (${currency})`, 'salePrice', 'decimal', '0.00'],
          ['Initial Quantity', 'quantity', 'numeric', '0'],
          ['Reorder Level', 'reorderLevel', 'numeric', '10']
        ] as const).map(([label, key, kbType, placeholder]) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={form[key as keyof FormState]}
              onChangeText={field(key as keyof FormState)}
              placeholder={placeholder}
              placeholderTextColor="#555"
              keyboardType={kbType === 'numeric' ? 'numeric' : kbType === 'decimal' ? 'decimal-pad' : 'default'}
            />
          </View>
        ))}

        <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Product</Text>}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingTop: 60
  },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  pillDanger: { backgroundColor: '#ff9b9d33', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pillDangerText: { color: '#ff9b9d', fontWeight: '600', fontSize: 13 },
  addBtn: { marginHorizontal: 16, backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  panel: { marginHorizontal: 16, backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 20 },
  panelTitle: { fontSize: 13, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#222' },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  rowSku: { color: '#666', fontSize: 12, marginTop: 1 },
  qtyPill: { backgroundColor: '#22c55e22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 8 },
  qtyPillDanger: { backgroundColor: '#ff9b9d33' },
  qtyText: { color: '#22c55e', fontWeight: '600', fontSize: 13 },
  qtyTextDanger: { color: '#ff9b9d' },
  price: { color: '#aaa', fontSize: 13, minWidth: 60, textAlign: 'right' },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#3b82f6', fontSize: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  input: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 15, color: '#fff' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 }
});
