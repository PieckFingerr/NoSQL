startPage(()=>crudPage({title:'Users',endpoint:'/users',adminOnly:true,remove:true,
  description:'Administrator access. Passwords require at least 10 characters. Leave the password blank when editing to keep it.',
  fields:[field('username','Username'),field('fullName','Full name'),field('password','Password','password'),field('role','Role','select',{options:statuses(['ADMIN','MANAGER']),default:'MANAGER'}),field('active','Active','checkbox')],
  filters:[],columns:[{key:'username',label:'Username'},{key:'fullName',label:'Full name'},{key:'role',label:'Role'},{key:'active',label:'Active'},{key:'createdAt',label:'Created'}],
  actions:[{key:'toggle',label:row=>row.active?'Deactivate':'Activate',run:async row=>{await apiPatch(`/users/${row._id}/toggle-active`,{});message('User updated.');}}]
}));
