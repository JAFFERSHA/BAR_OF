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
          <Text style={styles.title}>Sales & Billing</Text>
          <Text style={styles.subtitle}>Create customer bills and update stock automatically</Text>
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
              <View style={styles.saleMeta}>
                <Text style={styles.saleDate}>{new Date(s.createdAt).toLocaleString()}</Text>
                <Text style={styles.saleBy}>by {s.user.name}</Text>
              </View>
              <View style={styles.saleBreakdown}>
                <Text style={styles.saleBreakdownText}>Subtotal: {currency}{s.subtotal.toFixed(2)}</Text>
                <Text style={styles.saleBreakdownText}>Tax: {currency}{s.tax.toFixed(2)}</Text>
                <Text style={styles.saleBreakdownText}>{s.items.length} item{s.items.length !== 1 ? 's' : ''}</Text>
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
  // Default 0.07 = 7% to match the web app
  const [taxRate, setTaxRate] = useState('0.07');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const stockRes = await api.getStock();
      setProducts(stockRes.products);
      // Pre-select first product like the web app does
      if (stockRes.products.length > 0) {
        const first = stockRes.products[0];
        setLineItems([{
          productId: first.id,
          productName: first.name,
          quantity: '1',
          unitPrice: first.salePrice.toFixed(2)
        }]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      setCustomer('Walk-in');
      setTaxRate('0.07');
      loadData();
    }
  }, [visible, loadData]);

  function addLine() {
    const first = products[0];
    setLineItems((l) => [
      ...l,
      first
        ? { productId: first.id, productName: first.name, quantity: '1', unitPrice: first.salePrice.toFixed(2) }
        : { productId: '', productName: '', quantity: '1', unitPrice: '' }
    ]);
  }

  function removeLine(i: number) {
    setLineItems((l) => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, key: keyof LineItem, val: string) {
    setLineItems((l) => l.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const validItems = lineItems.filter((l) => l.productId && l.quantity && l.unitPrice);
  const taxDecimal = parseFloat(taxRate || '0');
  const subtotal = validItems.reduce(
    (sum, l) => sum + parseFloat(l.unitPrice || '0') * parseInt(l.quantity || '0', 10),
    0
  );
  const tax = subtotal * taxDecimal;
  const total = subtotal + tax;

  async function handleSave() {
    if (validItems.length === 0) { Alert.alert('Error', 'Add at least one line item.'); return; }
    setSaving(true);
    try {
      await api.createSale({
        customer: customer || 'Walk-in',
        taxRate: taxDecimal,
        items: validItems.map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          unitPrice: parseFloat(l.unitPrice)
        }))
      });
      onSaved();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Bill</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput
                  style={styles.input}
                  value={customer}
                  onChangeText={setCustomer}
                  placeholder="Walk-in"
                  placeholderTextColor="#555"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Tax Rate (0–1)</Text>
                <TextInput
                  style={styles.input}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  keyboardType="decimal-pad"
                  placeholder="0.07"
                  placeholderTextColor="#555"
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Items</Text>
              <TouchableOpacity onPress={addLine} style={styles.addLineBtn}>
                <Text style={styles.addLineBtnText}>+ Add item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.map((line, i) => (
              <View key={i} style={styles.lineItem}>
                <View style={styles.lineItemTop}>
                  <TouchableOpacity
                    style={[styles.selector, { flex: 1 }]}
                    onPress={() => { setActiveLineIndex(i); setShowProductPicker(true); }}
                  >
                    <Text style={line.productId ? styles.selectorValue : styles.selectorPlaceholder} numberOfLines={1}>
                      {line.productName || 'Select product...'}
                    </Text>
                  </TouchableOpacity>
                  {lineItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeLine(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.lineRow}>
                  <View style={styles.lineField}>
                    <Text style={styles.lineLabel}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={line.quantity}
                      onChangeText={(v) => updateLine(i, 'quantity', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.lineField}>
                    <Text style={styles.lineLabel}>Price ({currency})</Text>
                    <TextInput
                      style={styles.input}
                      value={line.unitPrice}
                      onChangeText={(v) => updateLine(i, 'unitPrice', v)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#555"
                    />
                  </View>
                  <View style={styles.lineField}>
                    <Text style={styles.lineLabel}>Subtotal</Text>
                    <View style={styles.subtotalBox}>
                      <Text style={styles.subtotalText}>
                        {currency}{(parseFloat(line.unitPrice || '0') * parseInt(line.quantity || '0', 10)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {validItems.length > 0 && (
              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{currency}{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({(taxDecimal * 100).toFixed(0)}%)</Text>
                  <Text style={styles.totalValue}>{currency}{tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandRow]}>
                  <Text style={styles.grandLabel}>Total</Text>
                  <Text style={styles.grandValue}>{currency}{total.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Generate Bill</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Product Picker */}
      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
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
                <Text style={styles.pickerItemSub}>
                  {p.sku} · {p.unit} · In stock: {p.quantity} · Sale price: {currency}{p.salePrice.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  saleCard: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12, marginTop: 8 },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { color: '#fff', fontWeight: '600', fontSize: 15 },
  saleTotal: { color: '#22c55e', fontWeight: '700', fontSize: 16 },
  saleMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginBottom: 4 },
  saleDate: { color: '#666', fontSize: 12 },
  saleBy: { color: '#555', fontSize: 12 },
  saleBreakdown: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  saleBreakdownText: { color: '#888', fontSize: 12 },
  saleItem: { color: '#aaa', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#3b82f6', fontSize: 16 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  formField: { flex: 1 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  lineLabel: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addLineBtn: { backgroundColor: '#3b82f622', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  addLineBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  selector: {
    backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8,
    padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between'
  },
  selectorValue: { color: '#fff', fontSize: 14, flex: 1 },
  selectorPlaceholder: { color: '#555', fontSize: 14, flex: 1 },
  lineItem: { backgroundColor: '#161616', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  lineItemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  lineRow: { flexDirection: 'row', gap: 8 },
  lineField: { flex: 1 },
  removeBtn: { padding: 6, marginLeft: 6 },
  removeBtnText: { color: '#ff9b9d', fontSize: 16 },
  input: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, fontSize: 14, color: '#fff' },
  subtotalBox: { backgroundColor: '#222', borderRadius: 8, padding: 10 },
  subtotalText: { color: '#888', fontSize: 14 },
  totalsBox: { backgroundColor: '#161616', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { color: '#888', fontSize: 14 },
  totalValue: { color: '#ccc', fontSize: 14 },
  grandRow: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 8, paddingTop: 12 },
  grandLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  grandValue: { color: '#22c55e', fontWeight: '700', fontSize: 18 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  pickerItemText: { color: '#fff', fontSize: 15 },
  pickerItemSub: { color: '#666', fontSize: 12, marginTop: 2 }
});
