const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function validInvoice(value) {
  return value
    && typeof value.id === 'string'
    && typeof value.rawText === 'string'
    && typeof value.createdAt === 'string';
}

function storageMetadata(invoice) {
  return {
    createdAt: invoice.createdAt,
    date: invoice.date || '',
    total: invoice.total || '',
    recordType: invoice.recordType || 'invoice',
    category: invoice.category || '',
    deletedAt: invoice.deletedAt || ''
  };
}

async function storeInvoice(env, invoice) {
  await env.INVOICES.put(invoice.id, JSON.stringify(invoice), {
    metadata: storageMetadata(invoice)
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (!env.INVOICES) return json({ error: 'KV namespace INVOICES is not bound' }, 500);

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/invoice') {
      const invoice = await request.json().catch(() => null);
      if (!validInvoice(invoice)) return json({ error: 'Invalid invoice object' }, 400);
      await storeInvoice(env, invoice);
      return json({ ok: true, invoice }, 201);
    }

    if (request.method === 'PUT' && url.pathname.startsWith('/invoice/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const existing = await env.INVOICES.get(id, 'json');
      if (!existing) return json({ error: 'Invoice not found' }, 404);
      const patch = await request.json().catch(() => null);
      if (!patch || typeof patch !== 'object') return json({ error: 'Invalid update object' }, 400);
      const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
      if (!validInvoice(updated)) return json({ error: 'Invalid invoice object' }, 400);
      await storeInvoice(env, updated);
      return json({ ok: true, invoice: updated });
    }

    if (request.method === 'GET' && url.pathname === '/invoices') {
      const result = await env.INVOICES.list();
      const invoices = await Promise.all(result.keys.map(async (entry) => {
        const stored = await env.INVOICES.get(entry.name, 'json');
        return stored || null;
      }));
      invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json(invoices.filter(Boolean));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/invoice/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const invoice = await env.INVOICES.get(id, 'json');
      if (!invoice) return json({ error: 'Invoice not found' }, 404);
      return json(invoice);
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/invoice/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      if (url.searchParams.get('hard') === '1') {
        await env.INVOICES.delete(id);
        return json({ ok: true, hardDeleted: true });
      }
      const existing = await env.INVOICES.get(id, 'json');
      if (!existing) return json({ error: 'Invoice not found' }, 404);
      const deleted = { ...existing, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await storeInvoice(env, deleted);
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  }
};
