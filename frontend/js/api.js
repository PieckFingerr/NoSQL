/* Local API only. Database credentials never belong in this file. */
const API_BASE = 'http://localhost:5000/api';
async function apiRequest(path, { method = 'GET', body, upload = false, download = false } = {}) {
  const headers = {};
  const token = sessionStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !upload) headers['Content-Type'] = 'application/json';
  let response;
  try { response = await fetch(API_BASE + path, {method,headers,body:body===undefined?undefined:upload?body:JSON.stringify(body)}); }
  catch { throw new Error('Cannot reach the local API. Start the backend at http://localhost:5000 and check the allowed frontend origin.'); }
  if (response.status === 401) {
    sessionStorage.removeItem('token');sessionStorage.removeItem('user');
    if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
  }
  if (download && response.ok) {
    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'download.json';
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);return {filename};
  }
  const result = await response.json().catch(()=>({message:'Invalid response from the API.'}));
  if (!response.ok || !result.success) throw new Error(result.message || 'Request failed.');
  return result.data;
}
const apiGet = path => apiRequest(path);
const apiPost = (path,body) => apiRequest(path,{method:'POST',body});
const apiPut = (path,body) => apiRequest(path,{method:'PUT',body});
const apiPatch = (path,body) => apiRequest(path,{method:'PATCH',body});
const apiDelete = path => apiRequest(path,{method:'DELETE'});
const apiUpload = (path,form) => apiRequest(path,{method:'POST',body:form,upload:true});
const apiDownload = path => apiRequest(path,{download:true});
