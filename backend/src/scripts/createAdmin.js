const readline=require('node:readline/promises');
const {connect,close}=require('../config/database');
const users=require('../controllers/users');
async function main() {
  await connect();
  const input=readline.createInterface({input:process.stdin,output:process.stdout});
  try {
    const username=process.env.ADMIN_USERNAME || await input.question('Admin username: ');
    const fullName=process.env.ADMIN_FULL_NAME || await input.question('Full name: ');
    const password=process.env.ADMIN_PASSWORD || await input.question('Password (visible; 10+ characters): ');
    await users.save({username,fullName,password,role:'ADMIN',active:true});
    console.log('Administrator created. No default password is stored in the repository.');
  } finally {input.close();}
}
main().catch(error=>{console.error(error.status?error.message:'Admin creation failed. Check connectivity and whether this username already exists.');process.exitCode=1;}).finally(close);
