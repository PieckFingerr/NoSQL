const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency = value => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Number(value || 0));
const dateText = value => value?new Date(value).toLocaleDateString('vi-VN'):'—';
const getValue = (object,key) => key.split('.').reduce((value,part)=>value?.[part],object);
function display(value,key='') {
  if (value===undefined || value===null) return '—';
  if (['price','rent','monthlyRent','deposit','total','amount','unitPrice','paidAmount','remaining','totalRevenue','monthlyRevenue','totalAmount'].includes(key)) return currency(value);
  if (/Date$|At$/.test(key)) return dateText(value);
  if (typeof value==='boolean') return value?'Yes':'No';
  if (Array.isArray(value)) return value.map(v=>typeof v==='object'?JSON.stringify(v):v).join(', ');
  if (typeof value==='object') return JSON.stringify(value);
  return String(value);
}
function message(text,error=false) {
  const box=document.getElementById('message');box.textContent=text;box.className=error?'notice error':'notice success';box.hidden=!text;
}
function showDetails(title,data) {
  const dialog=document.getElementById('details-dialog');
  dialog.querySelector('h2').textContent=title;
  dialog.querySelector('pre').textContent=JSON.stringify(data,null,2);dialog.showModal();
}
async function layout(title,adminOnly=false) {
  const user=await requireLogin(adminOnly);if (!user) return null;
  const pages=[['index','Dashboard'],['rooms','Rooms'],['tenants','Tenants'],['contracts','Contracts'],['services','Services'],['meter-readings','Meter Readings'],['invoices','Invoices'],['payments','Payments'],['reports','Reports'],['data-management','Data Management'],['users','Users']];
  document.getElementById('sidebar').innerHTML=`<a class="brand" href="index.html"><span class="brand-icon">Q</span><span>QuanLyPhongTro<small>Boarding house management</small></span></a><nav aria-label="Main navigation">${pages.filter(([key])=>user.role==='ADMIN' || !['users','data-management'].includes(key)).map(([key,label])=>`<a href="${key}.html" ${location.pathname.endsWith(`${key}.html`)?'class="selected" aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="account"><strong>${escapeHtml(user.fullName)}</strong><small>${escapeHtml(user.role)}</small><button id="logout" class="secondary">Logout</button></div>`;
  document.getElementById('logout').addEventListener('click',logout);
  document.getElementById('page-title').textContent=title;
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  return user;
}
function renderTable(target,rows,columns,actions) {
  if (!rows.length) {target.innerHTML='<div class="empty">No records found. Adjust the filters or add a record.</div>';return;}
  target.innerHTML=`<table><thead><tr>${columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('')}${actions?'<th>Actions</th>':''}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>{
    const raw=c.value?c.value(row):getValue(row,c.key);
    const value=escapeHtml(display(raw,c.key));
    return `<td>${c.key==='status'?`<span class="badge ${escapeHtml(raw)}">${value}</span>`:value}</td>`;
  }).join('')}${actions?`<td class="actions">${actions(row)}</td>`:''}</tr>`).join('')}</tbody></table>`;
}
const field=(name,label,type='text',extra={})=>({name,label,type,...extra});
const statuses=values=>values.map(value=>({value,label:value}));
const relation=(name,label,source,multiple=false)=>field(name,label,'select',{source,multiple});
function setNested(object,path,value) {
  const parts=path.split('.');let target=object;for (const part of parts.slice(0,-1)) target=target[part] ||= {};target[parts.at(-1)]=value;
}
async function crudPage(config) {
  await layout(config.title,config.adminOnly);
  const content=document.getElementById('content');
  content.innerHTML=`<div class="toolbar"><p>${escapeHtml(config.description || 'Manage records and view details.')}</p>${config.fields?`<button id="add-record">${escapeHtml(config.addLabel || 'Add record')}</button>`:''}</div><form id="filters" class="filters"></form><div id="records" class="table-wrap" aria-live="polite"></div><dialog id="edit-dialog"><form id="edit-form"><div class="dialog-heading"><h2></h2><button type="button" class="secondary" id="close-edit">Close</button></div><div id="fields" class="form-grid"></div><p id="form-message" class="error-text" role="alert"></p><div class="dialog-footer"><button type="submit">Save</button></div></form></dialog>`;
  const sources={};
  for (const source of new Set([...(config.fields || []),...(config.filters || [])].map(f=>f.source).filter(Boolean))) sources[source]=await apiGet('/'+source);
  function options(f) {
    return f.options || (sources[f.source] || []).map(row=>({value:row._id,label:f.source==='rooms'?row.roomNumber:f.source==='tenants'?`${row.fullName} · ${row.phone}`:f.source==='invoices'?`${row.room?.roomNumber || row.roomId} · ${row.month}/${row.year} · ${currency(row.total)} · ${row.status}`:row.name}));
  }
  function input(f,filter=false) {
    const required=!filter && !f.optional?'required':'';
    if (f.type==='select') return `<select name="${f.name}" ${f.multiple?'multiple size="4"':''} ${required}>${!f.multiple?`<option value="">${filter?'All':'Select…'}</option>`:''}${options(f).map(o=>`<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}</select>`;
    if (f.type==='checkbox') return `<input name="${f.name}" type="checkbox">`;
    return `<input name="${f.name}" type="${f.type}" ${required} ${f.type==='number'?`min="${f.min ?? 0}" step="${f.step ?? 'any'}"`:''} ${f.type==='password'?'autocomplete="new-password"':''}>`;
  }
  const filters=document.getElementById('filters');
  filters.innerHTML=(config.filters || []).map(f=>`<label>${escapeHtml(f.label)}${input(f,true)}</label>`).join('')+'<button>Apply filters</button><button type="reset" class="secondary">Reset</button>';
  let rows=[];let editing=null;
  const dialog=document.getElementById('edit-dialog');const form=document.getElementById('edit-form');
  document.getElementById('close-edit').onclick=()=>dialog.close();
  async function refresh() {
    document.getElementById('records').innerHTML='<p class="loading">Loading records…</p>';
    try {
      const query=new URLSearchParams([...new FormData(filters)].filter(([,value])=>value!==''));
      rows=await apiGet(config.endpoint+'?'+query);
      renderTable(document.getElementById('records'),rows,config.columns,row=>{
        let result='<button class="secondary" data-action="view">Details</button>';
        if (config.edit!==false) result+='<button class="secondary" data-action="edit">Edit</button>';
        for (const action of config.actions || []) result+=`<button class="secondary" data-action="${action.key}">${escapeHtml(typeof action.label==='function'?action.label(row):action.label)}</button>`;
        if (config.remove) result+='<button class="danger" data-action="delete">Delete</button>';
        return `<div data-id="${row._id}">${result}</div>`;
      });
    } catch(error) {message(error.message,true);document.getElementById('records').innerHTML='<div class="empty">Records could not be loaded.</div>';}
  }
  function open(row=null) {
    editing=row;form.querySelector('h2').textContent=row?'Edit record':(config.addLabel || 'Add record');
    const fields=row && config.editFields?config.editFields:config.fields;
    document.getElementById('fields').innerHTML=fields.map(f=>`<label>${escapeHtml(f.label)}${input({...f,optional:f.optional || (row && f.type==='password')})}${f.help?`<small>${escapeHtml(f.help)}</small>`:''}</label>`).join('');
    for (const f of fields) {
      const element=form.elements.namedItem(f.name);let value=row?getValue(row,f.name):f.default;
      if (f.type==='password') value='';
      if (f.type==='date' && value) value=String(value).slice(0,10);
      if (f.type==='checkbox') element.checked=value ?? true;
      else if (f.multiple) {for (const option of element.options) option.selected=(value || []).includes(option.value);}
      else element.value=value ?? '';
    }
    document.getElementById('form-message').textContent='';dialog.showModal();
  }
  if (config.fields) document.getElementById('add-record').onclick=()=>open();
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
    try {
      const data={};const fields=editing && config.editFields?config.editFields:config.fields;
      for (const f of fields) {
        const element=form.elements.namedItem(f.name);
        let value=f.multiple?[...element.selectedOptions].map(o=>o.value):f.type==='checkbox'?element.checked:element.value;
        if (f.optional && value==='') continue;
        if (f.type==='number' && value!=='') value=Number(value);
        setNested(data,f.name,value);
      }
      if (config.transform) config.transform(data);
      if (editing) await apiPut(`${config.endpoint}/${editing._id}`,data);
      else await apiPost(config.createEndpoint || config.endpoint,data);
      dialog.close();message('Record saved.');await refresh();
    } catch(error) {document.getElementById('form-message').textContent=error.message;}
    finally {button.disabled=false;}
  });
  document.getElementById('records').addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if (!button) return;
    const row=rows.find(row=>row._id===button.closest('[data-id]').dataset.id);button.disabled=true;
    try {
      const action=button.dataset.action;
      if (action==='view') showDetails(config.title,await apiGet(`${config.endpoint}/${row._id}`));
      else if (action==='edit') open(row);
      else if (action==='delete') {if (!confirm('Delete this record? Referenced history cannot be deleted.')) return;await apiDelete(`${config.endpoint}/${row._id}`);message('Record deleted.');await refresh();}
      else {await config.actions.find(a=>a.key===action).run(row);await refresh();}
    } catch(error) {message(error.message,true);}
    finally {button.disabled=false;}
  });
  filters.addEventListener('submit',event=>{event.preventDefault();refresh();});
  filters.addEventListener('reset',()=>setTimeout(refresh,0));
  await refresh();
}
function startPage(fn) {fn().catch(error=>message(error.message,true));}
