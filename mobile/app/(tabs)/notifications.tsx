import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, Notification } from '@/lib/api';

const TYPE_COLORS: Record<string, string> = {
  STOCK_LOW: '#ff9b9d',
  PURCHASE_LOGGED: '#3b82f6',
  SALE_BILL: '#22c55e'
};

const TYPE_LABELS: Record<string, string> = {
  STOCK_LOW: 'Low Stock',
  PURCHASE_LOGGED: 'Purchase',
  SALE_BILL: 'Sale Bill'
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getNotifications();
      setNotifications(result.notifications);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load notifications');
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#3b82f6" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Alerts for low stock, purchases, and bills</Text>
      </View>

      <View style={styles.panel}>
        {notifications.length === 0 && (
          <Text style={styles.empty}>No notifications yet.</Text>
        )}
        {notifications.map((n: Notification) => {
          const color = TYPE_COLORS[n.type] ?? '#888';
          const label = TYPE_LABELS[n.type] ?? n.type;
          return (
            <View key={n.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.typeText, { color }]}>{label}</Text>
                </View>
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.message}>{n.message}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  panel: { marginHorizontal: 16, marginBottom: 20 },
  empty: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 40 },
  card: {
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: '600' },
  time: { color: '#555', fontSize: 11 },
  message: { color: '#ccc', fontSize: 14, lineHeight: 20 }
});
