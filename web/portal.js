/* Portal estático de integración para MAPO · SDK oficial Supabase JS v2.118.0, incluido en vendor. */
"use strict";
(() => {
const $=s=>document.querySelector(s), all=s=>Array.from(document.querySelectorAll(s));
const area=id=>document.getElementById(id), e=(tag,text)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;return el;};
const moneda=v=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v)||0);
const fechaHoy=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const aviso=(msg,err=false)=>{area('estado').textContent=msg;area('estado').classList.toggle('error',err);};
const muestra=(id,on)=>{area(id).hidden=!on;}, ok=async q=>{const {data,error}=await q;if(error)throw error;return data;};
const cfg=window.MAPO_CONFIG||{}; if(!(/^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(cfg.url)||/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url))||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.key)){aviso('Antes de activar el portal: coloca la URL del proyecto y su clave publicable en web/config.js.');area('acceso').querySelectorAll('button').forEach(b=>b.disabled=true);return;}
const db=window.supabase.createClient(cfg.url,cfg.key), rpc=(n,p={})=>ok(db.rpc(n,p));
let user=null,admin=false,cache={},recuperacion=false,seq=0; const urlVuelta=new URL('./',window.location.href).href;
const txtErr=ex=>ex.code==='23P01'?'El departamento ya está ocupado en esas fechas. Actualiza la búsqueda.':ex.code==='23505'?'Ese código, solicitud o referencia ya existe.':ex.code==='42501'?'Tu cuenta no tiene permiso para esa acción.':String(ex.message||ex);
const mkBtn=(s,fn)=>{const b=e('button',s);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(x){aviso(txtErr(x),true);}finally{b.disabled=false;}});return b;};
function tabla(id,cab,filas){const cont=area(id);cont.replaceChildren();if(!filas.length){cont.append(e('p','Sin registros.'));return;}const wrap=e('div'),t=e('table'),head=e('thead'),tr=e('tr'),body=e('tbody');wrap.className='scroll';
cab.forEach(c=>tr.append(e('th',c)));head.append(tr);t.append(head,body);filas.forEach(row=>{const tr=e('tr');row.forEach(v=>{const td=e('td');if(v instanceof Node)td.append(v);else td.textContent=v??'—';tr.append(td);});body.append(tr);});wrap.append(t);cont.append(wrap);}
function form(id,fn){const f=area(id);f.addEventListener('submit',async ev=>{ev.preventDefault();if(f.dataset.ocupado)return;f.dataset.ocupado='1';const b=ev.submitter;const v=Object.fromEntries(new FormData(f));if(b)b.disabled=true;try{await fn(v,b?.value,f);}catch(ex){aviso(txtErr(ex),true);}finally{delete f.dataset.ocupado;if(b)b.disabled=false;}});}
async function leer(t,cols='*',order='id'){let out=[];for(let off=0;;off+=500){const r=await ok(db.from(t).select(cols).order(order).range(off,off+499));out=out.concat(r);if(r.length<500)return out;}}
const frm=id=>area(id).elements;const nil=v=>v===''||v==null?null:v;const num=v=>nil(v)==null?null:Number(v);
const depName=id=>(cache.dep||[]).find(r=>r.id===id)?.nombre||id;
const cliName=id=>(cache.cli||[]).find(r=>r.id===id)?.nombre||'—';
const etiquetaRes=r=>depName(r.departamento_id)+' · '+r.entrada+' · '+r.estado+' · '+r.id.slice(0,6);
const resName=id=>{const r=(cache.res||[]).find(x=>x.id===id);return r?etiquetaRes(r):id;};
function opciones(sel,filas){const prev=sel.value;sel.replaceChildren(...filas.map(([v,k])=>new Option(k,v)));if(filas.some(x=>x[0]===prev))sel.value=prev;}
function mesFin(inicio,meses){const [y,m,d]=inicio.split('-').map(Number);const fin=new Date(Date.UTC(y,m-1+meses+1,0));fin.setUTCDate(Math.min(d,fin.getUTCDate()));return fin.toISOString().slice(0,10);}
function cambioModo(){const mensual=frm('buscar').modo.value==='mensual';muestra('lbSalida',!mensual);muestra('lbMeses',mensual);frm('buscar').salida.required=!mensual;frm('buscar').salida.disabled=mensual;frm('buscar').meses.disabled=!mensual;area('resultados').replaceChildren();}
frm('buscar').modo.addEventListener('change',cambioModo);area('buscar').addEventListener('input',()=>area('resultados').replaceChildren());
form('acceso',async(v,modo)=>{const email=v.correo.trim(),password=v.clave;if(modo==='recuperar'){await ok(db.auth.resetPasswordForEmail(email,{redirectTo:urlVuelta}));aviso('Si ese correo tiene una cuenta, revisa el enlace de recuperación.');return;}
 if(modo==='registrar'){if(!v.nombre.trim()||password.length<10)throw Error('Para registrarte indica tu nombre y una contraseña de al menos 10 caracteres.');
 await ok(db.auth.signUp({email,password,options:{data:{nombre:v.nombre.trim()},emailRedirectTo:urlVuelta}}));frm('acceso').clave.value='';aviso('Revisa tu correo y confirma el enlace antes de iniciar sesión. Si ya tenías cuenta, utiliza Iniciar sesión.');}
 else {await ok(db.auth.signInWithPassword({email,password}));frm('acceso').clave.value='';}});
form('nuevaClave',async v=>{await ok(db.auth.updateUser({password:v.clave}));area('nuevaClave').reset();recuperacion=false;muestra('recuperar',false);aviso('Contraseña actualizada.');});
area('salir').addEventListener('click',async()=>{try{await ok(db.auth.signOut({scope:'local'}));}catch(ex){aviso(txtErr(ex),true);}});
function limpiar(){cache={};admin=false;['resultados','mias','misFav','meses','ranking','ocupacion','reservasLista','cuotasLista','movLista','gastosLista','garantiasLista','fotosLista'].forEach(s=>area(s).replaceChildren());all('[data-lista],#editarDep').forEach(s=>s.replaceChildren());all('#admin form').forEach(f=>f.reset());}
db.auth.onAuthStateChange((evento,sesion)=>{if(evento==='PASSWORD_RECOVERY')recuperacion=true;
 if(evento==='TOKEN_REFRESHED'||evento==='USER_UPDATED')return;
 const n=++seq;setTimeout(async()=>{if(n!==seq)return;limpiar();user=sesion?.user||null;
 muestra('auth',!user);muestra('cliente',!!user);muestra('salir',!!user);muestra('admin',false);muestra('recuperar',!!user&&recuperacion);
 if(!user){recuperacion=false;area('titulo').textContent='Tu cuenta en MAPO';aviso('Ingresa o crea una cuenta para solicitar una estancia.');return;}
 try{const a=await rpc('soy_admin');if(n!==seq)return;admin=a;area('titulo').textContent=admin?'Administración del Edificio Marcelo':'Mi estancia en Huancayo';muestra('admin',admin);await cargar();if(n===seq)aviso('Sesión: '+user.email);}
 catch(ex){aviso(txtErr(ex),true);}},0);});
async function cargar(){const n=seq;if(!user)return;const [dep,res,fav]=await Promise.all([leer('departamentos'),leer('reservas'),ok(db.from('favoritos').select('departamento_id').eq('usuario_id',user.id))]);if(n!==seq)return;
 cache.dep=dep;cache.res=res;cache.fav=new Set(fav.map(x=>x.departamento_id));
 const micli=await ok(db.from('clientes').select('id').eq('usuario_id',user.id).maybeSingle());if(n!==seq)return;
 tabla('mias',['Departamento','Entrada','Salida','Estado','Acción'],res.filter(r=>r.cliente_id===micli?.id).map(r=>[depName(r.departamento_id),r.entrada,r.salida,r.estado,r.estado==='solicitada'?mkBtn('Retirar',()=>cancelar(r.id)):null]));
 tabla('misFav',['Departamento','Acción'],dep.filter(d=>cache.fav.has(d.id)).map(d=>[d.nombre,mkBtn('Quitar',()=>favorito(d.id))]));
 if(!admin)return;const [cli,ed,serv,cuotas,fotos,gar,movs,gastos]=await Promise.all([leer('clientes'),leer('edificios'),leer('servicios'),leer('saldos_cuotas'),leer('fotos'),leer('garantias'),leer('movimientos'),leer('gastos')]);if(n!==seq)return;
 Object.assign(cache,{cli,ed,serv,cuotas,fotos});const dopt=dep.map(d=>[d.id,d.nombre]);const listas={departamentos:dopt,depOpcional:[['','General del edificio'],...dopt],edificios:ed.map(x=>[x.id,x.nombre]),servicios:serv.map(x=>[x.id,x.nombre]),clientes:cli.map(x=>[x.id,x.nombre+' · '+(x.correo||x.telefono||x.id.slice(0,6))]),reservas:res.filter(r=>r.clase==='alquiler').map(r=>[r.id,etiquetaRes(r)]),cuotas:cuotas.map(q=>[q.id,resName(q.reserva_id)+' · '+q.detalle+' · '+q.vence])};
 all('[data-lista]').forEach(s=>opciones(s,listas[s.dataset.lista]));opciones(area('editarDep'),[['','Crear nuevo'],...dopt]);rellenarFicha();
 tabla('reservasLista',['Departamento / canal','Cliente','Fechas','Estado','Acciones'],res.sort((a,b)=>b.entrada.localeCompare(a.entrada)).map(r=>{const acc=e('span');if(r.estado==='solicitada')acc.append(mkBtn('Confirmar',()=>guarda(rpc('confirmar_reserva',{p_reserva:r.id}),'Reserva confirmada.')));
 if(['solicitada','confirmada','bloqueada'].includes(r.estado))acc.append(mkBtn('Cancelar',()=>cancelar(r.id)));
 if(['confirmada','en_curso'].includes(r.estado))acc.append(mkBtn(r.estado==='confirmada'?'Ingreso':'Salida',()=>guarda(rpc('registrar_paso',{p_reserva:r.id,p_paso:r.estado==='confirmada'?'ingreso':'salida'}),'Paso registrado.')));
 if(r.estado==='en_curso')acc.append(mkBtn('Salida anticipada',async()=>{const motivo=prompt('¿Terminó hoy la estancia? Indica el motivo. Revisa por separado sus cuotas y devoluciones.');if(motivo?.trim())await guarda(rpc('salida_anticipada',{p_reserva:r.id,p_motivo:motivo}),'Salida anticipada registrada.');}));
 return [depName(r.departamento_id)+' · '+(r.canal||r.clase),cliName(r.cliente_id),r.entrada+' / '+r.salida,r.estado,acc];}));
 tabla('cuotasLista',['Reserva','Cuota y fecha','Neto cobrado','Pendiente','Por devolver','Estado','Acción'],cuotas.map(q=>[resName(q.reserva_id),q.detalle+' · '+q.vence,moneda(q.cobrado_neto),moneda(q.saldo),moneda(q.por_devolver),q.estado_pago+(q.vencida?' · vencida':''),q.anulada?null:mkBtn('Anular cuota',async()=>{const motivo=prompt('Motivo. El dinero cobrado quedará pendiente de devolución.');if(motivo?.trim())await guarda(rpc('anular_cuota',{p_cuota:q.id,p_motivo:motivo}),'Cuota anulada.');})]));
 const porCuota=new Map(cuotas.map(q=>[q.id,q]));tabla('movLista',['Fecha','Reserva','Movimiento','Medio','Importe','Referencia'],movs.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>[m.fecha,resName(porCuota.get(m.cuota_id)?.reserva_id),m.tipo,m.medio,moneda(m.importe),m.referencia]));
 tabla('gastosLista',['Fecha','Concepto','Departamento','Importe','Acción'],gastos.map(g=>[g.fecha,g.detalle,g.departamento_id?depName(g.departamento_id):'General',moneda(g.importe),g.anulado?'Anulado':mkBtn('Anular gasto',async()=>{const motivo=prompt('Motivo de la anulación del gasto');if(motivo?.trim())await guarda(rpc('anular_gasto',{p_gasto:g.id,p_motivo:motivo}),'Gasto anulado.');})]));
 tabla('garantiasLista',['Reserva','Fecha','Movimiento','Importe'],gar.map(g=>[resName(g.reserva_id),g.fecha,g.tipo,moneda(g.importe)]));
 tabla('fotosLista',['Departamento','Foto','Orden','Acción'],fotos.sort((a,b)=>a.orden-b.orden).map(f=>[depName(f.departamento_id),f.descripcion||f.ruta,f.orden,(()=>{const acciones=e('span');acciones.append(mkBtn('Editar',async()=>{const texto=prompt('Descripción de la foto',f.descripcion);if(texto===null)return;const orden=prompt('Orden de la foto (0 para primera)',String(f.orden));if(orden===null)return;if(!/^\d+$/.test(orden))throw Error('Usa un orden entero no negativo.');await guarda(ok(db.from('fotos').update({descripcion:texto,orden:Number(orden)}).eq('id',f.id)),'Foto actualizada.');}),mkBtn('Retirar foto',async()=>{if(!confirm('¿Retirar esta foto del catálogo?'))return;await ok(db.from('fotos').delete().eq('id',f.id));try{await ok(db.storage.from('mapo-fotos').remove([f.ruta]));}catch(err){await cargar();throw Error('Ya no está publicada. Elimina el archivo huérfano desde Storage: '+f.ruta);}await cargar();aviso('Foto retirada.');}));return acciones;})()])); await informe();}
async function guarda(prom,m){await prom;aviso(m);await cargar();}
async function cancelar(id){const motivo=prompt('Motivo de cancelación. Las cuotas se anulan; el reembolso se registra aparte.');if(!motivo?.trim())return;await guarda(rpc('cancelar',{p_reserva:id,p_motivo:motivo}),'Cancelación registrada.');}
async function favorito(id){if(cache.fav.has(id))await ok(db.from('favoritos').delete().eq('usuario_id',user.id).eq('departamento_id',id));else await ok(db.from('favoritos').insert({usuario_id:user.id,departamento_id:id}));
 await cargar();all('[data-fav]').filter(b=>b.dataset.fav===id).forEach(b=>b.textContent=cache.fav.has(id)?'Quitar de favoritos':'Guardar favorito');aviso('Favoritos actualizados.');}
form('buscar',async v=>{const mensual=v.modo==='mensual',fin=mensual?mesFin(v.entrada,+v.meses):v.salida;if(!fin||fin<=v.entrada)throw Error('La salida debe ser posterior al ingreso.');
 const resultados=await rpc('disponibles',{p_entrada:v.entrada,p_salida:fin,p_modalidad:v.modo,p_huespedes:+v.personas});const dest=area('resultados');dest.replaceChildren();
 if(!resultados.length)dest.append(e('p','No hay departamentos disponibles para estas fechas.'));
 for(const x of resultados){const d=cache.dep.find(t=>t.id===x.departamento_id);if(!d)continue;const a=e('article');a.className='ficha';a.append(e('h3',d.nombre),e('p',d.descripcion),e('p',moneda(mensual?d.tarifa_mes:d.tarifa_dia)+(mensual?' por mes':' por noche')+' · salida '+fin));
 const fs=await ok(db.from('fotos').select('ruta,descripcion').eq('departamento_id',d.id).order('orden').order('id').limit(1));if(fs.length){const u=await ok(db.storage.from('mapo-fotos').createSignedUrl(fs[0].ruta,300));const im=e('img');im.src=u.signedUrl;im.alt=fs[0].descripcion||d.nombre;im.className='foto';a.prepend(im);}
 const fb=mkBtn(cache.fav.has(d.id)?'Quitar de favoritos':'Guardar favorito',()=>favorito(d.id));fb.dataset.fav=d.id;a.append(mkBtn('Solicitar',()=>guarda(rpc('solicitar_reserva',{p_departamento:d.id,p_modalidad:v.modo,p_entrada:v.entrada,p_salida:mensual?null:fin,p_meses:mensual?+v.meses:null,p_huespedes:+v.personas}),'Solicitud enviada. Espera la confirmación de MAPO.')),fb);dest.append(a);}
});
async function informe(){const f=frm('informe'),dia=f.dia.value||fechaHoy(),anio=+(f.anio.value||dia.slice(0,4));f.dia.value=dia;f.anio.value=anio;const [cal,res]=await Promise.all([rpc('estado_departamentos',{p_fecha:dia}),rpc('resumen_mensual',{p_anio:anio})]);
 tabla('ocupacion',['Departamento','Estado','Cliente','Hasta (salida)','Próxima entrada'],cal.map(r=>[r.nombre,r.estado,r.cliente,r.hasta,r.proxima_entrada]));
 tabla('meses',['Mes','Noches vendidas','Bloqueadas','Ocupación','Cobros','Devoluciones','Gastos','Resultado de caja','Pendiente hoy'],res.map(r=>[r.mes.slice(0,7),r.noches_vendidas,r.noches_bloqueadas,r.ocupacion_pct==null?'—':r.ocupacion_pct+' %',...['cobros','devoluciones','gastos','resultado_caja','pendiente_hoy_por_vencimiento'].map(k=>moneda(r[k]))]));
 const cerrados=res.filter(r=>r.mes.slice(0,7)<fechaHoy().slice(0,7)&&r.ocupacion_pct!=null);
 const top=(k)=>{if(k==='ocupacion_pct'&&!cerrados.some(r=>Number(r.noches_vendidas)>0))return 'sin estancias registradas';if(k==='resultado_caja'&&!cerrados.some(r=>Number(r.cobros)||Number(r.devoluciones)||Number(r.gastos)))return 'sin movimientos de caja';const m=Math.max(...cerrados.map(r=>Number(r[k])));return cerrados.filter(r=>Number(r[k])===m).map(r=>r.mes.slice(0,7)).join(', ');};
 area('ranking').textContent=cerrados.length?'Meses cerrados con inventario · Mayor ocupación: '+top('ocupacion_pct')+' · Mayor resultado de caja: '+top('resultado_caja'):'Todavía no hay meses cerrados comparables.';}
form('informe',informe);
function rellenarFicha(){const f=frm('ficha'),d=cache.dep.find(x=>x.id===f.id.value);for(const [k,v] of Object.entries({codigo:'codigo',nombre:'nombre',capacidad:'capacidad',dormitorios:'dormitorios',dia:'tarifa_dia',mes:'tarifa_mes',alta:'alta',baja:'baja',descripcion:'descripcion'}))f[k].value=d?.[v]??'';if(d)f.edificio.value=d.edificio_id;f.publicado.checked=!!d?.publicado;}
area('editarDep').addEventListener('change',rellenarFicha);
form('ficha',async(v,_,f)=>{const datos={edificio_id:v.edificio,codigo:v.codigo.trim(),nombre:v.nombre.trim(),descripcion:v.descripcion,capacidad:num(v.capacidad),dormitorios:num(v.dormitorios),tarifa_dia:num(v.dia),tarifa_mes:num(v.mes),alta:nil(v.alta),baja:nil(v.baja),publicado:f.elements.publicado.checked};
 const fila=await ok((v.id?db.from('departamentos').update(datos).eq('id',v.id):db.from('departamentos').insert(datos)).select('id').single());await cargar();f.elements.id.value=fila.id;rellenarFicha();aviso('Ficha guardada.');});
form('nuevoServicio',v=>guarda(ok(db.from('servicios').insert({nombre:v.nombre.trim()})),'Servicio creado.'));
form('asignarServicio',(v,m)=>guarda(ok(m==='quitar'?db.from('departamento_servicios').delete().eq('departamento_id',v.dep).eq('servicio_id',v.serv):db.from('departamento_servicios').insert({departamento_id:v.dep,servicio_id:v.serv})),'Servicios actualizados.'));
form('subir',async(v,_,f)=>{const archivo=f.elements.foto.files[0];const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[archivo?.type];if(!ext||archivo.size>5242880)throw Error('Elige JPG, PNG o WebP de hasta 5 MiB.');
 const ruta=v.dep+'/'+crypto.randomUUID()+'.'+ext,alm=db.storage.from('mapo-fotos');await ok(alm.upload(ruta,archivo,{contentType:archivo.type,upsert:false}));
 try{await ok(db.from('fotos').insert({departamento_id:v.dep,ruta,descripcion:v.alt,orden:+v.orden}));}catch(ex){await alm.remove([ruta]);throw ex;}f.elements.foto.value='';await cargar();aviso('Foto publicada en la ficha.');});
form('externo',v=>guarda(rpc('cliente_externo',{p_nombre:v.nombre,p_correo:nil(v.correo),p_telefono:nil(v.tel)}),'Cliente externo creado.'));
form('resExterna',v=>guarda(rpc('reserva_externa',{p_departamento:v.dep,p_cliente:v.cli,p_modalidad:v.modo,p_entrada:v.ini,p_salida:v.modo==='dias'?nil(v.fin):null,p_meses:v.modo==='mensual'?num(v.meses):null,p_huespedes:+v.hues,p_canal:v.canal,p_referencia:nil(v.ref),p_precio_unitario:num(v.precio)}),'Reserva externa confirmada.'));
form('bloqueo',v=>guarda(rpc('bloquear',{p_departamento:v.dep,p_entrada:v.ini,p_salida:v.fin,p_clase:v.tipo,p_motivo:v.motivo}),'Bloqueo registrado.'));
form('cargo',v=>guarda(rpc('agregar_cuota',{p_reserva:v.res,p_concepto:v.concepto,p_detalle:v.detalle,p_vence:v.vence,p_importe:+v.importe}),'Cargo agregado.'));
const enVuelo=new Map();async function dinero(nombre,params,f){const k='mapo.op.'+user.id+'.'+nombre;const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(params)))),b=>b.toString(16).padStart(2,'0')).join('');let previo=enVuelo.get(k);try{previo=JSON.parse(sessionStorage.getItem(k))||previo;}catch{}const op=previo?.h===h?previo.op:crypto.randomUUID();enVuelo.set(k,{h,op});try{sessionStorage.setItem(k,JSON.stringify({h,op}));}catch{}
 await rpc(nombre,{p_operacion:op,...params});enVuelo.delete(k);try{sessionStorage.removeItem(k);}catch{}f.reset();aviso('Operación guardada.');await cargar();}
form('pago',(v,_,f)=>dinero('registrar_movimiento',{p_cuota:v.cuota,p_tipo:v.tipo,p_importe:+v.importe,p_fecha:v.fecha,p_medio:v.medio,p_referencia:nil(v.ref)},f));
form('gasto',(v,_,f)=>dinero('registrar_gasto',{p_departamento:nil(v.dep),p_fecha:v.fecha,p_categoria:v.categoria,p_detalle:v.detalle,p_importe:+v.importe},f));
form('garantia',(v,_,f)=>dinero('registrar_garantia',{p_reserva:v.res,p_tipo:v.tipo,p_importe:+v.importe,p_fecha:v.fecha,p_referencia:nil(v.ref)},f));
frm('buscar').entrada.min=fechaHoy();cambioModo();
})();
