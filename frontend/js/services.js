startPage(()=>crudPage({title:'Services',endpoint:'/services',remove:true,
  description:'Prices are copied into new invoices. Changes never rewrite existing invoice snapshots.',
  fields:[field('name','Name'),field('unit','Unit'),field('price','Unit price (VND)','number'),field('active','Active','checkbox')],
  filters:[field('search','Search name'),field('active','Active','select',{options:[{value:'true',label:'Enabled'},{value:'false',label:'Disabled'}]})],
  columns:[{key:'name',label:'Name'},{key:'unit',label:'Unit'},{key:'price',label:'Unit price'},{key:'active',label:'Enabled'}],
  actions:[{key:'toggle',label:row=>row.active?'Disable':'Enable',run:async row=>{await apiPatch(`/services/${row._id}/toggle-active`,{});message('Service updated.');}}]
}));
