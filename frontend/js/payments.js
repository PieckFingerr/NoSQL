startPage(()=>crudPage({title:'Payments',endpoint:'/payments',edit:false,
  description:'Record installments. Only SUCCESS payments affect the balance; overpayments are rejected. Payment history is append-only.',
  fields:[relation('invoiceId','Invoice','invoices'),field('amount','Amount (VND)','number'),field('paymentMethod','Payment method','select',{options:statuses(['CASH','BANK_TRANSFER','OTHER']),default:'CASH'}),field('status','Status','select',{options:statuses(['SUCCESS','PENDING','CANCELLED']),default:'SUCCESS'}),field('note','Note','text',{optional:true})],
  filters:[relation('invoiceId','Invoice','invoices'),field('status','Status','select',{options:statuses(['SUCCESS','PENDING','CANCELLED'])})],
  columns:[{key:'invoiceId',label:'Invoice ID'},{key:'amount',label:'Amount'},{key:'paymentMethod',label:'Method'},{key:'status',label:'Status'},{key:'paymentDate',label:'Date'},{key:'note',label:'Note'}]
}));
