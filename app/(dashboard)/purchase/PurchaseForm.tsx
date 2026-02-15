"use client";

import { createPurchase } from './actions';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Product, Supplier } from '@prisma/client';

type Props = {
  products: Product[];
  suppliers: Supplier[];
  currency: string;
};

type Line = { productId: string; quantity: number; costPrice: number };

export function PurchaseForm({ products, suppliers, currency }: Props) {
  if (products.length === 0 || suppliers.length === 0) {
    return <div className="muted">Add at least one product and supplier to log purchases.</div>;
  }

  const [items, setItems] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (items.length === 0 && products[0]) {
      setItems([{ productId: products[0].id, quantity: 1, costPrice: Number(products[0].costPrice) || 1 }]);
    }
  }, [products]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [items]
  );

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
    startTransition(async () => {
      const result = await createPurchase(null, formData);
      if (result) {
        setError(result);
      } else {
        setError(null);
        setItems([{ productId: products[0]?.id || '', quantity: 1, costPrice: Number(products[0]?.costPrice) || 1 }]);
        form.reset();
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="two-col">
        <div className="field">
          <label>Supplier</label>
          <select name="supplierId" required>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Notes (optional)</label>
          <input name="notes" placeholder="Invoice #, freight, etc." />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="heading-row">
          <h3 style={{ margin: 0 }}>Line items</h3>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                { productId: products[0]?.id || '', quantity: 1, costPrice: Number(products[0]?.costPrice) || 1 }
              ])
            }
          >
            + Add line
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Cost ({currency})</th>
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
                    value={item.costPrice}
                    onChange={(e) =>
                      setItems((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], costPrice: Number(e.target.value) };
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
          <div className="muted">Total</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{currency}{total.toFixed(2)}</div>
        </div>
      </div>

      {error && (
        <div className="muted danger-text" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="button" type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save purchase'}
        </button>
      </div>
    </form>
  );
}
