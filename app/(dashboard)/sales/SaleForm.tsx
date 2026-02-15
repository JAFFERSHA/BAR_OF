"use client";

import { createSale } from './actions';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Product } from '@prisma/client';

type Line = { productId: string; quantity: number; unitPrice: number };

export function SaleForm({ products, currency }: { products: Product[]; currency: string }) {
  if (products.length === 0) {
    return <div className="muted">Add products first before creating a bill.</div>;
  }

  const [items, setItems] = useState<Line[]>([]);
  const [customer, setCustomer] = useState('Walk-in');
  const [taxRate, setTaxRate] = useState(0.07);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (items.length === 0 && products[0]) {
      setItems([
        { productId: products[0].id, quantity: 1, unitPrice: Number(products[0].salePrice) || 1 }
      ]);
    }
  }, [products]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    if (items.length === 0) {
      setError('Add at least one item.');
      return;
    }
    const formData = new FormData(form);
    formData.set('items', JSON.stringify(items));
    formData.set('customer', customer);
    formData.set('taxRate', taxRate.toString());

    startTransition(async () => {
      const result = await createSale(null, formData);
      if (result) {
        setError(result);
      } else {
        setError(null);
        form.reset();
        setCustomer('Walk-in');
        setItems([{ productId: products[0]?.id || '', quantity: 1, unitPrice: Number(products[0]?.salePrice) || 1 }]);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="two-col">
        <div className="field">
          <label>Customer name</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} required />
        </div>
        <div className="field">
          <label>Tax rate</label>
          <input
            type="number"
            min={0}
            max={1}
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="heading-row">
          <h3 style={{ margin: 0 }}>Items</h3>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                { productId: products[0]?.id || '', quantity: 1, unitPrice: Number(products[0]?.salePrice) || 1 }
              ])
            }
          >
            + Add item
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price ({currency})</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], productId: e.target.value };
                        return copy;
                      })
                    }
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], quantity: Number(e.target.value) };
                        return copy;
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], unitPrice: Number(e.target.value) };
                        return copy;
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="heading-row" style={{ marginTop: 8 }}>
          <div className="muted">Subtotal</div>
          <div>{currency}{subtotal.toFixed(2)}</div>
        </div>
        <div className="heading-row">
          <div className="muted">Tax</div>
          <div>{currency}{tax.toFixed(2)}</div>
        </div>
        <div className="heading-row" style={{ marginTop: 6 }}>
          <strong>Total</strong>
          <strong>{currency}{total.toFixed(2)}</strong>
        </div>
      </div>

      {error && (
        <div className="muted danger-text" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Generating bill...' : 'Generate bill'}
        </button>
      </div>
    </form>
  );
}
