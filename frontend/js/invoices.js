startPage(()=>crudPage({title:'Invoices',endpoint:'/invoices',createEndpoint:'/invoices/generate',addLabel:'Generate invoice',remove:true,
  description:'Generate a monthly invoice from the ACTIVE contract, meter reading, and current service prices. Only the due date can be edited.',
  fields:[relation('roomId','Room','rooms'),field('month','Month','number',{min:1,step:1,default:new Date().getMonth()+1}),field('year','Year','number',{min:2020,step:1,default:new Date().getFullYear()}),field('dueDate','Due date','date'),{...relation('serviceIds','Optional extra services (Ctrl/Cmd to select)','services',true),optional:true}],
  editFields:[field('dueDate','Due date','date')],
  filters:[relation('roomId','Room','rooms'),field('month','Month','number',{min:1,step:1}),field('year','Year','number',{min:2020,step:1}),field('status','Status','select',{options:statuses(['UNPAID','PARTIAL','PAID'])}),field('overdue','Overdue','select',{options:[{value:'true',label:'Overdue only'}]})],
  columns:[{key:'room.roomNumber',label:'Room'},{key:'month',label:'Month'},{key:'year',label:'Year'},{key:'total',label:'Total'},{key:'paidAmount',label:'Paid'},{key:'remaining',label:'Remaining'},{key:'status',label:'Status'},{key:'dueDate',label:'Due date'}]
}));
