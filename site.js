async function fetchPosts(){if(!window.supabase||!supabaseClient)return {data:[],error:{message:'Supabase library not available'}};return await supabaseClient.from('posts').select('*').eq('published',true).order('created_at',{ascending:false});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(p){return `<article class="article-preview">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.title)}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:12px">`:''}<span class="tag">${p.kind==='news'?'خبر':'مقاله'}</span><h2>${esc(p.title)}</h2><p>${esc((p.content||'').slice(0,240))}${(p.content||'').length>240?'…':''}</p><small>${p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):''}</small><br><a class="btn" href="post.html?id=${encodeURIComponent(p.id)}">ادامه مطلب</a></article>`;}
async function renderPosts(target,filter){const el=document.getElementById(target);if(!el)return;const {data,error}=await fetchPosts();if(error){el.innerHTML='<p class="empty">مطالب در حال حاضر قابل دریافت نیستند.</p>';return;}let arr=(data||[]).filter(p=>!(String(p.kind||'').toLowerCase()==='news'&&p.archived===true));if(filter)arr=arr.filter(filter);el.innerHTML=arr.length?arr.map(card).join(''):'<div class="empty">هنوز مطلبی منتشر نشده است.</div>';const count=document.getElementById('postCount');if(count)count.textContent=(data||[]).length;const last=document.getElementById('lastUpdate');if(last&&data?.[0]?.created_at)last.textContent=new Date(data[0].created_at).toLocaleDateString('fa-IR');}
async function searchArticles(){const term=(document.getElementById('searchInput')?.value||'').trim();const {data,error}=await fetchPosts();const el=document.getElementById('articlePosts');if(!el)return;if(error){el.textContent='خطا در دریافت مطالب';return;}const arr=(data||[]).filter(p=>(String(p.kind||'article').trim().toLowerCase()==='article')&&(!term||(p.title+' '+p.content).includes(term)));el.innerHTML=arr.length?arr.map(card).join(''):'<div class="empty">مقاله‌ای یافت نشد.</div>';}
async function loadVisitStats(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.rpc('get_site_stats');
  if(error||!data)return;
  const stats=Array.isArray(data)?data[0]:data;
  const total=document.getElementById('siteViews');
  const today=document.getElementById('todayViews');
  if(total)total.textContent=Number(stats.total_views||0).toLocaleString('fa-IR');
  if(today)today.textContent=Number(stats.today_views||0).toLocaleString('fa-IR');
}
async function renderDetail(){const box=document.getElementById('postDetail');if(!box)return;const id=new URLSearchParams(location.search).get('id');if(!id){box.innerHTML='<p>شناسه مطلب مشخص نیست.</p>';return;}const {data,error}=await supabaseClient.from('posts').select('*').eq('id',id).eq('published',true).maybeSingle();if(error||!data){box.innerHTML='<p class="empty">مطلب پیدا نشد یا منتشر نشده است.</p>';return;}// ثبت بازدید فقط یک‌بار برای هر مطلب در هر نشست مرورگر
const visitKey='damyar_view_'+String(data.id);
if(!sessionStorage.getItem(visitKey)){
  const {error:viewError}=await supabaseClient.rpc('record_post_view',{p_post_id:Number(data.id)});
  if(!viewError)sessionStorage.setItem(visitKey,'1');
}
const {data:viewCount}=await supabaseClient.rpc('get_post_views',{p_post_id:Number(data.id)});
document.title=data.title+' | دامیار';box.innerHTML=`${data.image_url?`<img src="${esc(data.image_url)}" alt="${esc(data.title)}" style="max-width:100%;height:auto;border-radius:10px;margin-bottom:16px">`:''}<span class="tag">${data.kind==='news'?'خبر':'مقاله'}</span><h1 style="color:#2e7d32;margin-bottom:12px">${esc(data.title)}</h1><small>${data.created_at?new Date(data.created_at).toLocaleDateString('fa-IR'):''} | بازدید: ${Number(viewCount||0).toLocaleString('fa-IR')}</small><div style="white-space:pre-wrap;line-height:2.2;margin-top:20px">${esc(data.content)}</div>`;}

async function renderSiteAds(){
  if(!window.supabase||!supabaseClient)return;
  const page=(location.pathname.split('/').pop()||'index.html').replace('.html','');
  const pageMap={index:'home',news:'news',articles:'articles',livestock:'livestock',poultry:'poultry',feed:'feed'};
  const current=pageMap[page]||'other';
  const {data,error}=await supabaseClient.from('site_media').select('*').eq('type','ad');
  if(error||!data)return;
  const ads=data.filter(ad=>{
    const place=String(ad.placement||'all').toLowerCase();
    return place==='all'||place==='sidebar'||place===current;
  });
  ads.forEach(ad=>{
    const place=String(ad.placement||'all').toLowerCase();
    const isSidebar=place==='sidebar';
    const target=isSidebar?document.querySelector('.sidebar'):document.querySelector('.content');
    if(!target)return;
    const box=document.createElement('div');
    box.className='damyar-ad-area';
    box.style.cssText='margin:14px 0;text-align:center;';
    const img=document.createElement('img');
    img.src=ad.image_url;img.alt=ad.title||'تبلیغات دامیار';
    img.style.cssText='display:block;max-width:100%;height:auto;max-height:300px;object-fit:contain;border-radius:8px;margin:auto;';
    if(ad.link_url){
      const a=document.createElement('a');a.href=ad.link_url;a.target='_blank';a.rel='noopener noreferrer';a.appendChild(img);box.appendChild(a);
    }else box.appendChild(img);
    if(ad.title){const caption=document.createElement('small');caption.textContent=ad.title;caption.style.cssText='display:block;margin-top:5px;color:#666';box.appendChild(caption);}
    if(isSidebar){const first=target.querySelector('.ad-slot');if(first)first.insertAdjacentElement('afterend',box);else target.appendChild(box);}
    else target.insertBefore(box,target.firstChild);
  });
}

async function renderSiteGallery(){
  const gallery=document.getElementById('homeGallery');
  if(!gallery)return;
  if(!supabaseClient)return;
  const slots=Array.from(gallery.querySelectorAll('.ad-slot'));
  try{
    const {data,error}=await supabaseClient
      .from('site_media')
      .select('id,type,title,url,image_url,link_url,created_at')
      .eq('type','gallery')
      .order('created_at',{ascending:false});
    if(error){console.error('Damyar gallery Supabase error:',error.message);return;}
    const images=(data||[]).filter(item=>item.image_url||item.url);
    slots.forEach((slot,index)=>{
      const item=images[index];
      if(!item)return;
      const src=item.image_url||item.url;
      slot.innerHTML='';
      slot.style.cssText='padding:10px;min-height:90px;display:flex;align-items:center;justify-content:center;flex-direction:column;box-sizing:border-box;';
      const img=document.createElement('img');
      img.src=src;
      img.alt=item.title||'تصویر گالری دامیار';
      img.loading='lazy';
      img.style.cssText='display:block;width:100%;max-width:100%;max-height:160px;height:auto;object-fit:contain;border-radius:6px;';
      if(item.link_url){
        const link=document.createElement('a');
        link.href=item.link_url;link.target='_blank';link.rel='noopener noreferrer';
        link.appendChild(img);slot.appendChild(link);
      }else slot.appendChild(img);
      if(item.title){
        const caption=document.createElement('small');
        caption.textContent=item.title;
        caption.style.cssText='display:block;margin-top:5px;';
        slot.appendChild(caption);
      }
    });
  }catch(err){console.error('Damyar gallery failed:',err);}
}

document.addEventListener('DOMContentLoaded',()=>{renderSiteAds();renderSiteGallery();renderPosts('latestPosts');renderPosts('newsPosts',p=>String(p.kind||'').trim().toLowerCase()==='news'&&p.archived!==true);renderPosts('livestockPosts',p=>String(p.kind||'article').trim().toLowerCase()==='article'&&p.category==='livestock');renderPosts('poultryPosts',p=>String(p.kind||'article').trim().toLowerCase()==='article'&&p.category==='poultry');renderPosts('feedPosts',p=>String(p.kind||'article').trim().toLowerCase()==='article'&&p.category==='feed');renderPosts('articlePosts',p=>String(p.kind||'article').trim().toLowerCase()==='article'&&(p.category==='articles'||!p.category));renderDetail();loadVisitStats();});