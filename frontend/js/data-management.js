startPage(async()=>{
  await layout('Data Management',true);
  const collections=['rooms','tenants','contracts','services','meter_readings','invoices','payments'];
  const options=collections.map(name=>`<option>${name}</option>`).join('');
  document.getElementById('content').innerHTML=`<p class="intro">Administrator tools for the seven business collections. JSON downloads use MongoDB Extended JSON to preserve BSON types and references.</p><div class="two-column"><section class="panel"><h2>Import JSON</h2><p>Upload a JSON array (maximum 10 MB / 5000 documents). All rows succeed together or none are inserted. Import dependencies first: rooms, tenants, services, contracts, readings, invoices, payments. Invoice imports start UNPAID; payments calculate their final status.</p><form id="import-form" class="stack"><label>Collection<select name="collection">${options}</select></label><label>JSON file<input name="file" type="file" accept=".json,application/json" required></label><button>Import</button></form></section><section class="panel"><h2>Export JSON</h2><p>Download one collection, including its ObjectIds, numeric BSON types and dates.</p><form id="export-form" class="stack"><label>Collection<select name="collection">${options}</select></label><button>Download export</button></form></section><section class="panel"><h2>Backup database</h2><p>Save all seven business collections on the backend. User passwords are excluded. Existing indexes and validators stay in the database.</p><button id="create-backup">Create backup</button><div id="backup-list" class="stack"></div></section><section class="panel"><h2>Restore database</h2><p>Restore replaces all seven business collections in one transaction. A safety backup is created first. Users are preserved. Choose a stored backup OR upload one.</p><form id="restore-form" class="stack"><label>Stored backup<select name="filename"><option value="">Select…</option></select></label><label>Or upload backup JSON<input name="file" type="file" accept=".json,application/json"></label><label>Type RESTORE to confirm<input name="confirm" pattern="RESTORE" placeholder="RESTORE" required autocomplete="off"></label><button class="danger">Restore selected backup</button></form></section></div><section class="panel"><h2>Operation result</h2><pre id="operation-result" aria-live="polite">No operations yet.</pre></section>`;
  const result=data=>{document.getElementById('operation-result').textContent=JSON.stringify(data,null,2);};
  async function run(button,fn) {button.disabled=true;message('Working…');try{await fn();}catch(error){message(error.message,true);}finally{button.disabled=false;}}
  async function list() {
    const rows=await apiGet('/data/backups');
    document.querySelector('#restore-form select').innerHTML='<option value="">Select…</option>'+rows.map(row=>`<option>${escapeHtml(row.filename)}</option>`).join('');
    const target=document.getElementById('backup-list');
    target.innerHTML=rows.length?rows.map(row=>`<button class="secondary" data-file="${escapeHtml(row.filename)}">Download ${escapeHtml(row.filename)} (${Math.ceil(row.bytes/1024)} KB)</button>`).join(''):'<p>No backups yet.</p>';
    target.onclick=event=>{const button=event.target.closest('[data-file]');if(button)run(button,()=>apiDownload('/data/backups/'+encodeURIComponent(button.dataset.file)));};
  }
  document.getElementById('import-form').onsubmit=event=>{event.preventDefault();run(event.target.querySelector('button'),async()=>{
    const form=new FormData(event.target);const name=form.get('collection');form.delete('collection');
    const data=await apiUpload('/data/import/'+name,form);result(data);message(data.errors.length?'Import rejected. See row errors below.':`${data.insertedCount} records imported.`,!!data.errors.length);
  });};
  document.getElementById('export-form').onsubmit=event=>{event.preventDefault();run(event.target.querySelector('button'),async()=>{const data=await apiDownload('/data/export/'+event.target.elements.collection.value+'?format=json');result(data);message('Export downloaded.');});};
  document.getElementById('create-backup').onclick=event=>run(event.target,async()=>{const data=await apiPost('/data/backup',{});result(data);message('Backup created.');await list();});
  document.getElementById('restore-form').onsubmit=event=>{event.preventDefault();if(!confirm('Replace all seven business collections with this backup? A safety backup will be created first.'))return;
    run(event.target.querySelector('button'),async()=>{
      const form=new FormData(event.target);if(!form.get('file')?.size)form.delete('file');
      if(form.has('file') && form.get('filename'))throw new Error('Choose a stored backup OR a file, not both.');
      const data=await apiUpload('/data/restore',form);result(data);message('Restore completed.');event.target.reset();await list();
    });
  };
  await list();
});
