import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, Sale, Product } from '@/lib/api';

type LineItem = { productId: string; productName: string; quantity: string; unitPrice: string };

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [salesRes, settingsRes] = await Promise.all([api.getSales(), api.getSettings()]);
      setSales(salesRes.sales);
      setCurrency(settingsRes.currency);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load sales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#3b82f6" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sales & Bills</Text>
            <Text style={styles.subtitle}>Create and track customer bills</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ New Bill</Text>
        </TouchableOpacity>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent Bills</Text>
          {sales.length === 0 && <Text style={styles.empty}>No bills yet.</Text>}
          {sales.map((s) => (
            <View key={s.id} style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.customer}>{s.customer}</Text>
                <Text style={styles.saleTotal}>{currency}{s.total.toFixed(2)}</Text>
              </View>
              <Text style={styles.saleDate}>{new Date(s.createdAt).toLocaleString()}</Text>
              <View style={styles.saleMeta}>
                <Text style={styles.saleMetaText}>Subtotal: {currency}{s.subtotal.toFixed(2)}</Text>
                <Text style={styles.saleMetaText}>Tax: {currency}{s.tax.toFixed(2)}</Text>
              </View>
              {s.items.map((item) => (
                <Text key={item.id} style={styles.saleItem}>
                  · {item.product.name} × {item.quantity} @ {currency}{item.unitPrice.toFixed(2)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <SaleFormModal
        visible={showForm}
        currency={currency}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </>
  );
}

function SaleFormModal({
  visible, currency, onClose, onSaved
}: { visible: boolean; currency: string; onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState('Walk-in');
  const [taxRate, setTaxRate] = useState('0');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: '', productName: '', quantity: '1', unitPrice: '' }]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const stockRes = await api.getStock();
      setProducts(stockRes.products);
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => { if (visible) loadData(); }, [visible, loadData]);

  function addLine() {
    setLineItems((l) => [...l, { productId: '', productName: '', quantity: '1', unitPrice: '' }]);
  }

  function removeLine(i: number) {
    setLineItems((l) => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, key: keyof LineItem, val: string) {
    setLineItems((l) => l.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const validItems = lineItems.filter((l) => l.productId && l.quantity && l.unitPrice);
  const subtotal = validItems.reduce((sum, l) => sum + parseFloat(l.unitPrice || '0') * parseInt(l.quantity || '0', 10), 0);
  const tax = subtotal * (parseFloat(taxRate || '0') / 100);
  const total = subtotal + tax;

  async function handleSave() {
    if (validItems.length === 0) { Alert.alert('Error', 'Add at least one line item.'); return; }
    setSaving(true);
    try {
      await api.createSale({
        customer: customer || 'Walk-in',
        taxRate: parseFloat(taxRate || '0') / 100,
        items: validItems.map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          unitPrice: parseFloat(l.unitPrice)
        }))
      });
      setCustomer('Walk-in');
      setTaxRate('0');
      setLineItems([{ productId: '', productName: '', quantity: '1', unitPrice: '' }]);
      onSaved();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Bill</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Customer</Text>
              <TextInput
                style={styles.input}
                value={customer}
                onChangeText={setCustomer}
                placeholder="Walk-in"
                placeholderTextColor="#555"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tax Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#555"
              />
            </View>

            <Text style={styles.label}>Items</Text>
            {lineItems.map((line, i) => (
              <View key={i} style={styles.lineItem}>
                <TouchableOpacity style={styles.selector} onPress={() => { setActiveLineIndex(i); setShowProductPicker(true); }}>
                  <Text style={line.productId ? styles.selectorValue : styles.selectorPlaceholder}>
                    {line.productName || 'Select product...'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.lineRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={line.quantity}
                      onChangeText={(v) => updateLine(i, 'quantity', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Unit Price ({currency})</Text>
                    <TextInput
                      style={styles.input}
                      value={line.unitPrice}
                      onChangeText={(v) => updateLine(i, 'unitPrice', v)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#555"
                    />
                  </View>
                  {lineItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeLine(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.outlineBtn} onPress={addLine}>
              <Text style={styles.outlineBtnText}>+ Add Item</Text>
            </TouchableOpacity>

            {validItems.length > 0 && (
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{currency}{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
                  <Text style={styles.totalValue}>{currency}{tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{currency}{total.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Issue Bill</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}><Text style={styles.modalClose}>Done</Text></TouchableOpacity>
          </View>
          {products.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.pickerItem}
              onPress={() => {
                if (activeLineIndex !== null) {
                  updateLine(activeLineIndex, 'productId', p.id);
                  updateLine(activeLineIndex, 'productName', p.name);
                  updateLine(activeLineIndex, 'unitPrice', p.salePrice.toFixed(2));
                }
                setShowProductPicker(false);
              }}
            >
              <Text style={styles.pickerItemText}>{p.name}</Text>
              <Text style={styles.pickerItemSub}>{p.sku} · In stock: {p.quantity} {p.unit}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  addBtn: { marginHorizontal: 16, backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  panel: { marginHorizontal: 16, backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 20 },
  panelTitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  empty: { color: '#666', fontSize: 14 },
  saleCard: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12, marginTop: 4 },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  customer: { color: '#fff', fontWeight: '600', fontSize: 15 },
  saleTotal: { color: '#22c55e', fontWeight: '700', fontSize: 16 },
  saleDate: { color: '#666', fontSize: 12, marginBottom: 4 },
  saleMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  saleMetaText: { color: '#888', fontSize: 12 },
  saleItem: { color: '#aaa', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#3b82f6', fontSize: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  input: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, fontSize: 15, color: '#fff' },
  selector: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, marginBottom: 8 },
  selectorValue: { color: '#fff', fontSize: 15 },
  selectorPlaceholder: { color: '#555', fontSize: 15 },
  lineItem: { backgroundColor: '#161616', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  lineRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  removeBtn: { padding: 8, marginLeft: 8 },
  removeBtnText: { color: '#ff9b9d', fontSize: 16 },
  outlineBtn: { borderWidth: 1, borderColor: '#3b82f6', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  outlineBtnText: { color: '#3b82f6', fontWeight: '600' },
  totals: { backgroundColor: '#161616', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#888', fontSize: 14 },
  totalValue: { color: '#fff', fontSize: 14 },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  grandTotalValue: { color: '#22c55e', fontWeight: '700', fontSize: 18 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  pickerItemText: { color: '#fff', fontSize: 15 },
  pickerItemSub: { color: '#666', fontSize: 12, marginTop: 2 }
});
