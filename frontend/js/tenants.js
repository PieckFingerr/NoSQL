startPage(()=>crudPage({title:'Tenants',endpoint:'/tenants',remove:true,
  fields:[field('fullName','Full name'),field('phone','Phone','tel'),field('email','Email','email'),field('identityCard','Identity card'),field('dateOfBirth','Date of birth','date')],
  filters:[field('search','Name / phone / identity card')],
  columns:[{key:'fullName',label:'Full name'},{key:'phone',label:'Phone'},{key:'email',label:'Email'},{key:'identityCard',label:'Identity card'},{key:'dateOfBirth',label:'Date of birth'}],
  actions:[{key:'history',label:'Rental history',run:async row=>showDetails('Rental history',await apiGet(`/tenants/${row._id}/rental-history`))}]
}));
