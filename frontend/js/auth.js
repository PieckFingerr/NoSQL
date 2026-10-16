function logout() {sessionStorage.clear();location.href='login.html';}
async function requireLogin(adminOnly = false) {
  if (!sessionStorage.getItem('token')) {location.href='login.html';return null;}
  const user=await apiGet('/auth/me');
  sessionStorage.setItem('user',JSON.stringify(user));
  if (adminOnly && user.role!=='ADMIN') throw new Error('This page requires an administrator account.');
  return user;
}
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;button.textContent='Signing in…';
    const message=document.getElementById('login-message');message.textContent='';
    try {
      const data=Object.fromEntries(new FormData(event.target));const result=await apiPost('/auth/login',data);
      sessionStorage.setItem('token',result.token);sessionStorage.setItem('user',JSON.stringify(result.user));location.href='index.html';
    } catch(error) {message.textContent=error.message;}
    finally {button.disabled=false;button.textContent='Sign in';}
  });
}
