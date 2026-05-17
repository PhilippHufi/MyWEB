const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (!env.INVOICES) return json({ error: 'KV namespace INVOICES is not bound' }, 500);

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/invoice') {
      const invoice = await request.json().catch(() => null);
      if (!validInvoice(invoice)) return json({ error: 'Invalid invoice object' }, 400);
      await env.INVOICES.put(invoice.id, JSON.stringify(invoice), {
        metadata: {
          createdAt: invoice.createdAt,
          date: invoice.date || '',
          total: invoice.total || ''
        }
      });
      return json({ ok: true, invoice }, 201);
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

    return json({ error: 'Not found' }, 404);
  }
};
