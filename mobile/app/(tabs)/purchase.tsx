import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, Purchase, Product, Supplier } from '@/lib/api';

type LineItem = { productId: string; productName: string; quantity: string; costPrice: string };

export default function PurchaseScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [purchasesRes, settingsRes] = await Promise.all([
        api.getPurchases(),
        api.getSettings()
      ]);
      setPurchases(purchasesRes.purchases);
      setCurrency(settingsRes.currency);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load purchases');
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
          <Text style={styles.title}>Purchases</Text>
          <Text style={styles.subtitle}>Log stock intake and update inventory</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ New Purchase</Text>
        </TouchableOpacity>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent Purchases</Text>
          {purchases.length === 0 && <Text style={styles.empty}>No purchases yet.</Text>}
          {purchases.map((p) => (
            <View key={p.id} style={styles.purchaseCard}>
              <View style={styles.purchaseHeader}>
                <Text style={styles.supplierName}>{p.supplier.name}</Text>
                <Text style={styles.purchaseTotal}>{currency}{p.total.toFixed(2)}</Text>
              </View>
              <View style={styles.purchaseMeta}>
                <Text style={styles.purchaseDate}>{new Date(p.createdAt).toLocaleString()}</Text>
                <Text style={styles.purchaseBy}>by {p.user.name}</Text>
              </View>
              <Text style={styles.purchaseItemCount}>{p.items.length} item{p.items.length !== 1 ? 's' : ''}</Text>
              {p.items.map((item) => (
                <Text key={item.id} style={styles.purchaseItem}>
                  · {item.product.name} × {item.quantity} @ {currency}{item.costPrice.toFixed(2)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <PurchaseFormModal
        visible={showForm}
        currency={currency}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </>
  );
}

function PurchaseFormModal({
  visible, currency, onClose, onSaved
}: { visible: boolean; currency: string; onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [supRes, stockRes] = await Promise.all([api.getSuppliers(), api.getStock()]);
      setSuppliers(supRes.suppliers);
      setProducts(stockRes.products);
      // Pre-select first product like the web app does
      if (stockRes.products.length > 0) {
        const first = stockRes.products[0];
        setLineItems([{
          productId: first.id,
          productName: first.name,
          quantity: '1',
          costPrice: first.costPrice.toFixed(2)
        }]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load suppliers/products');
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      setSupplierId('');
      setNewSupplierName('');
      loadData();
    }
  }, [visible, loadData]);

  function addLine() {
    const first = products[0];
    setLineItems((l) => [
      ...l,
      first
        ? { productId: first.id, productName: first.name, quantity: '1', costPrice: first.costPrice.toFixed(2) }
        : { productId: '', productName: '', quantity: '1', costPrice: '' }
    ]);
  }

  function removeLine(i: number) {
    setLineItems((l) => l.filter((_, idx) => idx !== i));
  }

  function updateLine(i: number, key: keyof LineItem, val: string) {
    setLineItems((l) => l.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  async function handleAddSupplier() {
    if (!newSupplierName.trim()) return;
    setAddingSupplier(true);
    try {
      const { supplier } = await api.createSupplier({ name: newSupplierName.trim() });
      setSuppliers((s) => [...s, supplier]);
      setSupplierId(supplier.id);
      setNewSupplierName('');
      setShowSupplierPicker(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add supplier');
    } finally {
      setAddingSupplier(false);
    }
  }

  const validItems = lineItems.filter((l) => l.productId && l.quantity && l.costPrice);
  const runningTotal = validItems.reduce(
    (sum, l) => sum + parseFloat(l.costPrice || '0') * parseInt(l.quantity || '0', 10),
    0
  );

  async function handleSave() {
    if (!supplierId) { Alert.alert('Error', 'Please select a supplier.'); return; }
    if (validItems.length === 0) { Alert.alert('Error', 'Add at least one line item.'); return; }
    setSaving(true);
    try {
      await api.createPurchase({
        supplierId,
        items: validItems.map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          costPrice: parseFloat(l.costPrice)
        }))
      });
      onSaved();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Purchase</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Supplier */}
            <Text style={styles.label}>Supplier</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowSupplierPicker(true)}>
              <Text style={selectedSupplier ? styles.selectorValue : styles.selectorPlaceholder}>
                {selectedSupplier?.name ?? 'Select supplier...'}
              </Text>
              <Text style={styles.selectorChevron}>›</Text>
            </TouchableOpacity>

            {/* Line items */}
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Line Items</Text>
              <TouchableOpacity onPress={addLine} style={styles.addLineBtn}>
                <Text style={styles.addLineBtnText}>+ Add line</Text>
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
                    <Text style={styles.lineLabel}>Cost ({currency})</Text>
                    <TextInput
                      style={styles.input}
                      value={line.costPrice}
                      onChangeText={(v) => updateLine(i, 'costPrice', v)}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#555"
                    />
                  </View>
                  <View style={styles.lineField}>
                    <Text style={styles.lineLabel}>Subtotal</Text>
                    <View style={styles.subtotalBox}>
                      <Text style={styles.subtotalText}>
                        {currency}{(parseFloat(line.costPrice || '0') * parseInt(line.quantity || '0', 10)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Running total */}
            {validItems.length > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{currency}{runningTotal.toFixed(2)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Purchase</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Supplier Picker */}
      <Modal visible={showSupplierPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Supplier</Text>
            <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.newSupplierRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              value={newSupplierName}
              onChangeText={setNewSupplierName}
              placeholder="New supplier name..."
              placeholderTextColor="#555"
            />
            <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddSupplier} disabled={addingSupplier}>
              {addingSupplier
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.inlineAddBtnText}>Add</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView>
            {suppliers.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pickerItem, s.id === supplierId && styles.pickerItemActive]}
                onPress={() => { setSupplierId(s.id); setShowSupplierPicker(false); }}
              >
                <Text style={styles.pickerItemText}>{s.name}</Text>
                {s.contact && <Text style={styles.pickerItemSub}>{s.contact}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
                    updateLine(activeLineIndex, 'costPrice', p.costPrice.toFixed(2));
                  }
                  setShowProductPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{p.name}</Text>
                <Text style={styles.pickerItemSub}>{p.sku} · {p.unit} · In stock: {p.quantity}</Text>
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
  purchaseCard: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12, marginTop: 8 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  purchaseTotal: { color: '#3b82f6', fontWeight: '700', fontSize: 15 },
  purchaseMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginBottom: 4 },
  purchaseDate: { color: '#666', fontSize: 12 },
  purchaseBy: { color: '#555', fontSize: 12 },
  purchaseItemCount: { color: '#888', fontSize: 12, marginBottom: 2 },
  purchaseItem: { color: '#aaa', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#3b82f6', fontSize: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  lineLabel: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  addLineBtn: { backgroundColor: '#3b82f622', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  addLineBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  selector: {
    backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8,
    padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  selectorValue: { color: '#fff', fontSize: 14, flex: 1 },
  selectorPlaceholder: { color: '#555', fontSize: 14, flex: 1 },
  selectorChevron: { color: '#555', fontSize: 18 },
  lineItem: { backgroundColor: '#161616', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  lineItemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  lineRow: { flexDirection: 'row', gap: 8 },
  lineField: { flex: 1 },
  removeBtn: { padding: 6, marginLeft: 6 },
  removeBtnText: { color: '#ff9b9d', fontSize: 16 },
  input: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, fontSize: 14, color: '#fff' },
  subtotalBox: { backgroundColor: '#222', borderRadius: 8, padding: 10 },
  subtotalText: { color: '#888', fontSize: 14 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 16 },
  totalLabel: { color: '#aaa', fontSize: 15, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  newSupplierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  inlineAddBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  inlineAddBtnText: { color: '#fff', fontWeight: '600' },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  pickerItemActive: { backgroundColor: '#3b82f622' },
  pickerItemText: { color: '#fff', fontSize: 15 },
  pickerItemSub: { color: '#666', fontSize: 12, marginTop: 2 }
});
