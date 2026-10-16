startPage(()=>crudPage({title:'Meter Readings',endpoint:'/meter-readings',remove:true,
  description:'Enter old and new indexes. Usage is calculated as new minus old. Billed readings are protected.',
  fields:[relation('roomId','Room','rooms'),field('month','Month','number',{min:1,step:1,default:new Date().getMonth()+1}),field('year','Year','number',{min:2020,step:1,default:new Date().getFullYear()}),field('electricity.oldIndex','Electricity old (kWh)','number'),field('electricity.newIndex','Electricity new (kWh)','number'),field('water.oldIndex','Water old (m³)','number'),field('water.newIndex','Water new (m³)','number')],
  filters:[relation('roomId','Room','rooms'),field('month','Month','number',{min:1,step:1}),field('year','Year','number',{min:2020,step:1})],
  columns:[{key:'room.roomNumber',label:'Room'},{key:'month',label:'Month'},{key:'year',label:'Year'},{key:'electricityUsage',label:'Electricity (kWh)'},{key:'waterUsage',label:'Water (m³)'},{key:'recordedAt',label:'Recorded'}]
}));
