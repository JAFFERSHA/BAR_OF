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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getPurchases();
      setPurchases(result.purchases);
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
          <View>
            <Text style={styles.title}>Purchases</Text>
            <Text style={styles.subtitle}>Log stock intake from suppliers</Text>
          </View>
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
                <Text style={styles.purchaseTotal}>${p.total.toFixed(2)}</Text>
              </View>
              <Text style={styles.purchaseDate}>{new Date(p.createdAt).toLocaleString()}</Text>
              {p.items.map((item) => (
                <Text key={item.id} style={styles.purchaseItem}>
                  · {item.product.name} × {item.quantity}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <PurchaseFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </>
  );
}

function PurchaseFormModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: '', productName: '', quantity: '1', costPrice: '' }]);
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
    } catch {
      Alert.alert('Error', 'Failed to load suppliers/products');
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => { if (visible) loadData(); }, [visible, loadData]);

  function addLine() {
    setLineItems((l) => [...l, { productId: '', productName: '', quantity: '1', costPrice: '' }]);
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

  async function handleSave() {
    if (!supplierId) { Alert.alert('Error', 'Please select a supplier.'); return; }
    const items = lineItems.filter((l) => l.productId && l.quantity && l.costPrice);
    if (items.length === 0) { Alert.alert('Error', 'Add at least one line item.'); return; }
    setSaving(true);
    try {
      await api.createPurchase({
        supplierId,
        items: items.map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          costPrice: parseFloat(l.costPrice)
        }))
      });
      setSupplierId('');
      setLineItems([{ productId: '', productName: '', quantity: '1', costPrice: '' }]);
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
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Purchase</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>Cancel</Text></TouchableOpacity>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.label}>Supplier</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowSupplierPicker(true)}>
              <Text style={selectedSupplier ? styles.selectorValue : styles.selectorPlaceholder}>
                {selectedSupplier?.name ?? 'Select supplier...'}
              </Text>
            </TouchableOpacity>

            <Modal visible={showSupplierPicker} animationType="slide" presentationStyle="pageSheet">
              <View style={styles.modal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Supplier</Text>
                  <TouchableOpacity onPress={() => setShowSupplierPicker(false)}><Text style={styles.modalClose}>Done</Text></TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <TextInput
                    style={styles.input}
                    value={newSupplierName}
                    onChangeText={setNewSupplierName}
                    placeholder="New supplier name..."
                    placeholderTextColor="#555"
                  />
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 8 }]} onPress={handleAddSupplier} disabled={addingSupplier}>
                    {addingSupplier ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add Supplier</Text>}
                  </TouchableOpacity>
                </View>
                {suppliers.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerItem, s.id === supplierId && styles.pickerItemActive]}
                    onPress={() => { setSupplierId(s.id); setShowSupplierPicker(false); }}
                  >
                    <Text style={styles.pickerItemText}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Modal>

            <Text style={[styles.label, { marginTop: 16 }]}>Line Items</Text>
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
                    <Text style={styles.label}>Cost Price</Text>
                    <TextInput
                      style={styles.input}
                      value={line.costPrice}
                      onChangeText={(v) => updateLine(i, 'costPrice', v)}
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
              <Text style={styles.outlineBtnText}>+ Add Line</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Purchase</Text>}
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
                  updateLine(activeLineIndex, 'costPrice', p.costPrice.toFixed(2));
                }
                setShowProductPicker(false);
              }}
            >
              <Text style={styles.pickerItemText}>{p.name}</Text>
              <Text style={styles.pickerItemSub}>{p.sku} · {p.unit}</Text>
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
  purchaseCard: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12, marginTop: 4 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  supplierName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  purchaseTotal: { color: '#3b82f6', fontWeight: '600' },
  purchaseDate: { color: '#666', fontSize: 12, marginBottom: 4 },
  purchaseItem: { color: '#aaa', fontSize: 13 },
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
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  pickerItemActive: { backgroundColor: '#3b82f622' },
  pickerItemText: { color: '#fff', fontSize: 15 },
  pickerItemSub: { color: '#666', fontSize: 12, marginTop: 2 }
});
