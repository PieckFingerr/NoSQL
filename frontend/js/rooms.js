startPage(()=>crudPage({title:'Rooms',endpoint:'/rooms',remove:true,
  description:'Room prices are monthly in VND. Occupancy follows active contracts; maintenance can be set intentionally.',
  fields:[field('roomNumber','Room number'),field('floor','Floor','number',{step:1}),field('area','Area (m²)','number'),field('price','Monthly price (VND)','number'),field('status','Status','select',{options:statuses(['AVAILABLE','OCCUPIED','MAINTENANCE']),default:'AVAILABLE'})],
  filters:[field('search','Search room number'),field('floor','Floor','number',{step:1}),field('status','Status','select',{options:statuses(['AVAILABLE','OCCUPIED','MAINTENANCE'])})],
  columns:[{key:'roomNumber',label:'Room number'},{key:'floor',label:'Floor'},{key:'area',label:'Area (m²)'},{key:'price',label:'Monthly price'},{key:'status',label:'Status'}]
}));
