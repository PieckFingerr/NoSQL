startPage(async()=>{
  await layout('Reports & Queries');
  const content=document.getElementById('content');
  const basic=[['available-rooms','Available rooms'],['occupied-rooms','Occupied rooms'],['maintenance-rooms','Maintenance rooms'],['tenant-phone','Tenant by phone'],['active-contracts','Active contracts'],['active-services','Active services'],['unpaid-invoices','Unpaid invoices'],['invoice-payments','Invoice payment history']];
  const advanced=[['monthly-revenue','Monthly revenue'],['electricity-usage','Electricity consumption'],['water-usage','Water consumption'],['expiring-contracts','Expiring contracts'],['overdue-invoices','Overdue invoices'],['tenant-rental-history','Tenant rental history'],['room-occupancy','Room occupancy statistics'],['invoice-status','Invoice status statistics'],['revenue-by-method','Revenue by payment method'],['room-billing-history','Room billing history']];
  content.innerHTML='<p class="intro">Run the same business queries used in the MongoDB GUI demonstration. Revenue uses successful payment dates in Vietnam time.</p><form id="parameters" class="filters"><label>Month<input name="month" type="number" min="1" max="12"></label><label>Year<input name="year" type="number" min="2020"></label><label>Days<input name="days" type="number" min="1" max="3650" value="30"></label><label>Phone<input name="phone" type="tel"></label><label>Room<select name="roomId"></select></label><label>Tenant<select name="tenantId"></select></label><label>Invoice<select name="invoiceId"></select></label></form><section class="panel"><h2>Basic queries</h2><div id="basic" class="query-buttons"></div></section><section class="panel"><h2>Advanced aggregation queries</h2><div id="advanced" class="query-buttons"></div></section><section class="panel"><h2 id="result-title">Query results</h2><div id="results" class="table-wrap" aria-live="polite"><div class="empty">Choose a query above.</div></div><details><summary>Full result documents</summary><pre id="raw-results"></pre></details></section>';
  const parameters=document.getElementById('parameters');parameters.onsubmit=e=>e.preventDefault();
  for (const [name,endpoint,label] of [['roomId','rooms',r=>r.roomNumber],['tenantId','tenants',r=>r.fullName],['invoiceId','invoices',r=>`${r.room?.roomNumber} · ${r.month}/${r.year} · ${r.status}`]]) {
    const rows=await apiGet('/'+endpoint);parameters.elements[name].innerHTML='<option value="">Select…</option>'+rows.map(row=>`<option value="${row._id}">${escapeHtml(label(row))}</option>`).join('');
  }
  for (const [section,queries] of [['basic',basic],['advanced',advanced]]) {
    const target=document.getElementById(section);
    target.innerHTML=queries.map(([key,label])=>`<button class="secondary" data-query="${key}">${label}</button>`).join('');
    target.onclick=async event=>{
      const button=event.target.closest('[data-query]');if(!button)return;button.disabled=true;
      const results=document.getElementById('results');results.innerHTML='<p class="loading">Running query…</p>';message('');
      try {
        const query=new URLSearchParams([...new FormData(parameters)].filter(([,v])=>v!==''));
        const rows=await apiGet(`/reports/${section==='basic'?'basic/':''}${button.dataset.query}?${query}`);
        document.getElementById('result-title').textContent=`${button.textContent} · ${rows.length} result(s)`;
        const keys=[...new Set(rows.flatMap(Object.keys))].filter(k=>!['_id','passwordHash','payments','room','tenants','services'].includes(k));
        renderTable(results,rows,keys.map(key=>({key,label:key.replace(/([A-Z])/g,' $1')})));
        document.getElementById('raw-results').textContent=JSON.stringify(rows,null,2);
      } catch(error) {message(error.message,true);results.innerHTML='<div class="empty">Query could not run. Check the required parameters.</div>';}
      finally {button.disabled=false;}
    };
  }
});
