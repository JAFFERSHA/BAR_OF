"use client";

import { createSale } from './actions';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Product } from '@prisma/client';

type Line = { productId: string; quantity: number; unitPrice: number };

export function SaleForm({ products, currency, defaultTaxRate = 0.07 }: { products: Product[]; currency: string; defaultTaxRate?: number }) {
  if (products.length === 0) {
    return <div className="muted">Add products first before creating a bill.</div>;
  }

  const router = useRouter();
  const [items, setItems] = useState<Line[]>([]);
  const [customer, setCustomer] = useState('Walk-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (items.length === 0 && products[0]) {
      setItems([{ productId: products[0].id, quantity: 1, unitPrice: Number(products[0].salePrice) || 1 }]);
    }
  }, [products]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    if (items.length === 0) { toast.error('Add at least one item.'); return; }

    const formData = new FormData(form);
    formData.set('items', JSON.stringify(items));
    formData.set('customer', customer);
    formData.set('customerPhone', customerPhone);
    formData.set('customerEmail', customerEmail);
    formData.set('taxRate', taxRate.toString());

    startTransition(async () => {
      const result = await createSale(null, formData);
      if (result && 'error' in result) {
        toast.error(result.error);
      } else if (result && 'saleId' in result) {
        toast.success('Bill generated! Redirecting to receipt...');
        router.push(`/sales/${result.saleId}`);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {/* ── Customer details ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 14 }}>
        <div className="field">
          <label>Customer name</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} required />
        </div>
        <div className="field">
          <label>Phone (bill notification)</label>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 9876543210" type="tel" />
        </div>
        <div className="field">
          <label>Email (bill notification)</label>
          <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" type="email" />
        </div>
        <div className="field">
          <label>Tax rate</label>
          <input type="number" min={0} max={1} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </div>
      </div>

      {/* ── Line items ── */}
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="heading-row">
          <h3 style={{ margin: 0 }}>Items</h3>
          <button type="button" className="button secondary"
            onClick={() => setItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 1, unitPrice: Number(products[0]?.salePrice) || 1 }])}>
            + Add item
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th><th>Qty</th><th>Price ({currency})</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <select value={item.productId} onChange={(e) => setItems(prev => { const c=[...prev]; c[idx]={...c[idx],productId:e.target.value}; return c; })}>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" min={1} value={item.quantity} onChange={(e) => setItems(prev => { const c=[...prev]; c[idx]={...c[idx],quantity:Number(e.target.value)}; return c; })} />
                </td>
                <td>
                  <input type="number" step="0.01" min={0} value={item.unitPrice} onChange={(e) => setItems(prev => { const c=[...prev]; c[idx]={...c[idx],unitPrice:Number(e.target.value)}; return c; })} />
                </td>
                <td>
                  <button type="button" className="button secondary" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="heading-row" style={{ marginTop: 8 }}>
          <span className="muted">Subtotal</span><span>{currency}{subtotal.toFixed(2)}</span>
        </div>
        <div className="heading-row">
          <span className="muted">Tax</span><span>{currency}{tax.toFixed(2)}</span>
        </div>
        <div className="heading-row" style={{ marginTop: 6 }}>
          <strong>Total</strong><strong style={{ color: 'var(--accent)', fontSize: 18 }}>{currency}{total.toFixed(2)}</strong>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Generating bill...' : '🧾 Generate Bill & Notify Customer'}
        </button>
      </div>
    </form>
  );
}
