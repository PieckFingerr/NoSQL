startPage(async()=>{
  await layout('Dashboard');
  const content=document.getElementById('content');
  content.innerHTML='<p class="intro">A clear view of rooms, contracts, billing and successful collections.</p><form id="period" class="filters"><label>Month<input name="month" type="number" min="1" max="12" required></label><label>Year<input name="year" type="number" min="2020" required></label><button>Update period</button></form><section id="cards" class="cards" aria-live="polite"></section><section class="panel"><h2>Contracts expiring within 30 days</h2><div id="expiring" class="table-wrap"></div></section>';
  const form=document.getElementById('period');form.elements.month.value=new Date().getMonth()+1;form.elements.year.value=new Date().getFullYear();
  async function refresh() {
    document.getElementById('cards').innerHTML='<p class="loading">Loading dashboard…</p>';
    try {
      const d=await apiGet('/dashboard?'+new URLSearchParams(new FormData(form)));
      const labels={totalRooms:'Total rooms',availableRooms:'Available rooms',occupiedRooms:'Occupied rooms',maintenanceRooms:'Maintenance rooms',totalTenants:'Tenants',activeContracts:'Active contracts',expiringContracts:'Expiring contracts',unpaidInvoices:'Invoices with balance',overdueInvoices:'Overdue invoices',monthlyRevenue:'Successful revenue',monthlyElectricityUsage:'Electricity (kWh)',monthlyWaterUsage:'Water (m³)'};
      document.getElementById('cards').innerHTML=Object.entries(labels).map(([key,label])=>`<article class="card"><span>${label}</span><strong>${escapeHtml(key==='monthlyRevenue'?currency(d[key]):d[key])}</strong></article>`).join('');
      renderTable(document.getElementById('expiring'),d.expiringContractRows,[{key:'roomNumber',label:'Room'},{key:'tenantNames',label:'Tenants'},{key:'endDate',label:'End date'},{key:'daysLeft',label:'Days remaining'}]);
    } catch(error) {message(error.message,true);document.getElementById('cards').innerHTML='';}
  }
  form.onsubmit=event=>{event.preventDefault();refresh();};await refresh();
});
