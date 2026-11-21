(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const storeKey = "orvia.nebula.v1";
  const agents = [
    ["ORVIA LUCY","Directora general","Coordina el equipo, recibe solicitudes, presenta informes y solicita autorización humana para decisiones sensibles.","lucy"],
    ["ORVIA LUZ","Directora financiera","Analiza ingresos, gastos, costos, márgenes y rentabilidad del restaurante.","luz"],
    ["ORVIA JOTE","Jefe de inventario","Controla ingredientes, existencias, desperdicios y necesidades de abastecimiento.","jote"],
    ["ORVIA KIKE","Gerente operativo","Supervisa pedidos, preparación, cocina y operación diaria del restaurante.","kike"],
    ["ORVIA XEL","Director de marketing","Propone promociones, campañas y publicidad para atraer clientes.","xel"],
    ["ORVIA NANI","Directora de atención al cliente","Gestiona consultas, solicitudes, quejas y seguimiento de la experiencia del cliente.","nani"],
    ["ORVIA MEMO","Director de inteligencia comercial","Analiza tendencias, productos populares, horarios y oportunidades de crecimiento.","memo"],
    ["ORVIA JHOA","Diagnóstico técnico","Analiza errores, revisa incidencias y prepara posibles correcciones; los cambios sensibles requieren autorización.","jhoa"],
    ["ORVIA DARI","Supervisión operativa","Revisa tareas, resultados y alertas; escala a Lucy los asuntos que requieren intervención humana.","dari"]
  ];
  const state = loadState();
  let toastTimer;
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "{}");
      return { orders: Array.isArray(saved.orders) ? saved.orders : [], activity: Array.isArray(saved.activity) ? saved.activity : [] };
    } catch { return { orders: [], activity: [] }; }
  }
  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); }
    catch { notify("No se pudo guardar. Revisa el almacenamiento del navegador."); }
  }
  function money(value) {
    return new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(value || 0);
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function todayKey() {
    const d = new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }
  function record(title, detail) {
    state.activity.unshift({ title, detail, at: new Date().toISOString() });
    state.activity = state.activity.slice(0,100);
    persist();
    renderActivity();
  }
  function notify(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function statusClass(status) {
    return status === "Preparando" ? "prep" : status === "Listo" ? "ready" : status === "Entregado" ? "done" : "";
  }
  function statusBadge(status) {
    return '<span class="status ' + statusClass(status) + '">' + escapeHtml(status) + '</span>';
  }
  function renderOverview() {
    const orders = state.orders;
    const sales = orders.filter(o => o.status === "Entregado").reduce((sum,o) => sum + o.amount,0);
    const today = orders.filter(o => o.date === todayKey());
    const preparing = orders.filter(o => o.status === "Preparando").length;
    $("#sales-total").textContent = money(sales);
    $("#orders-total").textContent = today.length;
    $("#preparing-total").textContent = preparing;
    $("#average-total").textContent = money(orders.length ? Math.round(orders.reduce((s,o)=>s+o.amount,0)/orders.length) : 0);
    $("#nav-order-count").textContent = orders.length;
    const recent = orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
    $("#recent-orders").innerHTML = recent.length ? recent.map(o => '<div class="order-row"><div><b>#'+escapeHtml(o.id)+' · '+escapeHtml(o.customer)+'</b><small>'+escapeHtml(o.items)+'</small></div><div class="order-right"><strong>'+money(o.amount)+'</strong>'+statusBadge(o.status)+'</div></div>').join("") : '<div class="empty">Aún no hay pedidos. Crea el primero para comenzar.</div>';
  }
  function renderOrders() {
    const q = ($("#order-search").value || "").trim().toLowerCase();
    const filter = $("#status-filter").value;
    const orders = state.orders.filter(o => (filter === "all" || o.status === filter) && (o.customer.toLowerCase().includes(q) || o.items.toLowerCase().includes(q)));
    $("#all-orders").innerHTML = orders.length ? '<table class="order-table"><thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>DETALLE</th><th>VALOR</th><th>ESTADO</th></tr></thead><tbody>' + orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(o => '<tr><td><strong>#'+escapeHtml(o.id)+'</strong><br><small>'+new Date(o.createdAt).toLocaleString("es-CO")+'</small></td><td>'+escapeHtml(o.customer)+'</td><td>'+escapeHtml(o.items)+'</td><td>'+money(o.amount)+'</td><td><select data-order-status="'+escapeHtml(o.id)+'" aria-label="Estado del pedido '+escapeHtml(o.id)+'">'+["Nuevo","Preparando","Listo","Entregado"].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join("")+'</select></td></tr>').join("") + '</tbody></table>' : '<div class="empty">No hay pedidos que coincidan con la búsqueda.</div>';
  }
  function renderAgents() {
    $("#agents-grid").innerHTML = agents.map((agent,i) => '<article class="agent-card"><div class="agent-top"><div class="agent-icon">'+String(i+1).padStart(2,"0")+'</div><span class="agent-state">En pruebas</span></div><h3>'+escapeHtml(agent[0])+'</h3><b class="agent-role">'+escapeHtml(agent[1])+'</b><p>'+escapeHtml(agent[2])+'</p><small>Equipo coordinado en pruebas · Acciones sensibles protegidas</small><button class="text-button agent-ask" type="button" data-agent-id="'+escapeHtml(agent[3])+'">Consultar agente →</button></article>').join("");
  }
  function renderActivity() {
    $("#activity-list").innerHTML = state.activity.length ? state.activity.map(a => '<div class="activity-item"><i class="activity-dot"></i><div><b>'+escapeHtml(a.title)+'</b><p>'+escapeHtml(a.detail)+'</p><time>'+new Date(a.at).toLocaleString("es-CO")+'</time></div></div>').join("") : '<div class="empty">Todavía no hay actividad registrada.</div>';
  }
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+name));
    document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    $("#breadcrumb").textContent = ({overview:"Resumen",orders:"Pedidos",agents:"Centro de agentes",activity:"Registro de actividad"})[name] || "Resumen";
    $("#sidebar").classList.remove("open");
    if (name === "orders") renderOrders();
  }
  function openOrderDialog() { $("#order-dialog").showModal(); }
  function closeOrderDialog() { $("#order-dialog").close(); }
  document.querySelectorAll(".nav-link").forEach(b => b.addEventListener("click",()=>showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click",()=>showView(b.dataset.go)));
  $("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#new-order").addEventListener("click",openOrderDialog);
  $("#new-order-top").addEventListener("click",openOrderDialog);
  $("#close-dialog").addEventListener("click",closeOrderDialog);
  $("#cancel-dialog").addEventListener("click",closeOrderDialog);
  $("#order-form").addEventListener("submit",event=>{
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = String(form.get("customer") || "").trim();
    const items = String(form.get("items") || "").trim();
    const amount = Number(form.get("amount"));
    const status = String(form.get("status"));
    if (!customer || !items || !Number.isSafeInteger(amount) || amount < 1) { notify("Revisa los datos del pedido."); return; }
    const id = String(Date.now()).slice(-7);
    state.orders.push({ id, customer, items, amount, status, date:todayKey(), createdAt:new Date().toISOString() });
    persist();
    record("Pedido #"+id+" creado","Cliente: "+customer+" · "+money(amount)+" · Estado: "+status);
    event.currentTarget.reset();
    closeOrderDialog();
    renderAll();
    notify("Pedido guardado en este dispositivo.");
  });
  $("#order-search").addEventListener("input",renderOrders);
  $("#status-filter").addEventListener("change",renderOrders);
  $("#all-orders").addEventListener("change",event=>{
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    const order = state.orders.find(o=>o.id===select.dataset.orderStatus);
    if (!order || order.status === select.value) return;
    const previous = order.status;
    order.status = select.value;
    persist();
    record("Estado del pedido #"+order.id+" actualizado",previous+" → "+order.status);
    renderAll();
    notify("Estado actualizado.");
  });
  $("#clear-activity").addEventListener("click",()=>{
    if (!state.activity.length) return;
    if (!confirm("¿Limpiar el registro local de actividad?")) return;
    state.activity = [];
    persist();
    renderActivity();
    notify("Registro local limpiado.");
  });
  function renderAll() { renderOverview(); renderOrders(); renderActivity(); }
  $("#enter-demo").addEventListener("click",()=>openAuth("login"));
  let authMode="login";
  let clerkInstance=null;
  let clerkLoaded=false;
  let authLoading=false;
  let activeRestaurantId=null;
  let workspaceLoading=false;
  async function loadClerk(){
    if(clerkLoaded && clerkInstance) return clerkInstance;
    if(authLoading) {
      while(authLoading) await new Promise(resolve=>setTimeout(resolve,100));
      return clerkInstance;
    }
    authLoading=true;
    try {
      const configResponse=await fetch("/api/auth-config",{headers:{"Accept":"application/json"},cache:"no-store"});
      const config=await configResponse.json();
      if(!config.configured || !config.publishableKey) throw new Error("Falta configurar CLERK_PUBLISHABLE_KEY en el entorno Preview de Vercel.");
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
        script.async=true;
        script.crossOrigin="anonymous";
        script.onload=resolve;
        script.onerror=()=>reject(new Error("No se pudo cargar el servicio de autenticación."));
        document.head.appendChild(script);
      });
      if(!window.Clerk) throw new Error("El servicio de autenticación no está disponible.");
      clerkInstance=window.Clerk;
      await clerkInstance.load({publishableKey:config.publishableKey});
      clerkInstance.addListener(({user})=>{
        if(user) activateAuthenticatedView(user);
        else deactivateAuthenticatedView();
      });
      clerkLoaded=true;
      if(clerkInstance.user) activateAuthenticatedView(clerkInstance.user);
      return clerkInstance;
    } finally { authLoading=false; }
  }
  async function initializeWorkspace(){
    if(workspaceLoading || activeRestaurantId || !clerkInstance) return;
    workspaceLoading=true;
    try{
      const token=await clerkInstance.getToken();
      const response=await fetch("/api/onboarding",{headers:{Authorization:"Bearer "+token,Accept:"application/json"},cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "No se pudo cargar el espacio del restaurante.");
      if(Array.isArray(data.restaurants) && data.restaurants.length){
        activeRestaurantId=data.restaurants[0].id;
        $(".workspace b").textContent=data.restaurants[0].name;
        $(".workspace small").textContent="Espacio conectado · "+data.restaurants[0].role;
      }else{
        $("#workspace-dialog").showModal();
      }
    }finally{workspaceLoading=false;}
  }
  function activateAuthenticatedView(user){
    const displayName=user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || "Usuario ORVIA";
    $("#auth-user-label").textContent=displayName;
    $("#auth-account-button").textContent=(displayName.trim()[0] || "U").toUpperCase();
    $("#auth-dialog").close();
    $("#welcome-screen").classList.add("hidden");
    $(".app-shell").classList.remove("hidden");
    notify("Sesión iniciada. Tu cuenta está autenticada.");
    initializeWorkspace().catch(error=>notify(error.message || "No se pudo conectar el espacio."));
  }
  function deactivateAuthenticatedView(){
    activeRestaurantId=null;
    workspaceLoading=false;
    $("#auth-user-label").textContent="Sin sesión";
    $("#auth-account-button").textContent="U";
    $(".app-shell").classList.add("hidden");
    $("#welcome-screen").classList.remove("hidden");
    $("#lucy-panel").classList.remove("open");
  }
  async function openAuth(mode){
    authMode=mode;
    $("#auth-title").textContent=mode==="login"?"Iniciar sesión":"Crear cuenta de propietario";
    $("#auth-guidance").textContent=mode==="login"?"Accede con tu correo, contraseña o Google.":"Crea tu cuenta de propietario con correo, contraseña o Google.";
    $("#auth-dialog").showModal();
    const mount=$("#clerk-auth-mount");
    mount.innerHTML='<div class="auth-loading">Conectando el acceso seguro…</div>';
    try{
      const clerk=await loadClerk();
      mount.innerHTML="";
      const appearance={variables:{colorPrimary:"#3988ff",colorBackground:"#0d1726",colorText:"#eef4ff",colorInputBackground:"#091321",colorInputText:"#eef4ff",borderRadius:"8px"},elements:{card:{background:"transparent",boxShadow:"none",border:"0"},headerTitle:{color:"#eef4ff"},headerSubtitle:{color:"#9aabc1"},formFieldLabel:{color:"#b4c3d8"},formFieldInput:{background:"#091321",border:"1px solid #26374f",color:"#eef4ff"},footer:{display:"none"}}};
      if(mode==="login") clerk.mountSignIn(mount,{appearance,signUpUrl:"#"});
      else clerk.mountSignUp(mount,{appearance,signInUrl:"#"});
    }catch(error){
      mount.innerHTML='<div class="auth-error" role="alert">'+escapeHtml(error.message || "No se pudo preparar el acceso.")+'</div><p class="muted small">La autenticación real requiere configurar la clave pública de Clerk en Vercel Preview. No compartas claves privadas en el chat.</p>';
    }
  }
  $("#workspace-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const name=String(form.get("name")||"").trim();
    try{
      const token=await clerkInstance.getToken();
      const response=await fetch("/api/onboarding",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({name})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "No se pudo crear el espacio.");
      activeRestaurantId=data.restaurant.id;
      $(".workspace b").textContent=data.restaurant.name;
      $(".workspace small").textContent="Espacio conectado · propietario";
      $("#workspace-dialog").close();
      event.currentTarget.reset();
      notify("Restaurante registrado correctamente.");
    }catch(error){notify(error.message || "No se pudo crear el restaurante.");}
  });
  $("#show-login").addEventListener("click",()=>openAuth("login"));
  $("#show-register").addEventListener("click",()=>openAuth("register"));
  $("#close-auth").addEventListener("click",()=>$("#auth-dialog").close());
  $("#auth-account-button").addEventListener("click",async()=>{
    if(!clerkInstance || !clerkInstance.user){notify("Estás en modo demostración.");return;}
    if(confirm("¿Quieres cerrar tu sesión de ORVIA?")) await clerkInstance.signOut();
  });
  function lucyDemoReply(message){
    const q=message.toLowerCase();
    if(/hola|buenas|buenos días|buenas tardes/.test(q)) return "Hola. Soy Lucy, directora general de ORVIA. Puedo orientarte sobre los módulos y el equipo previsto. Esta versión es una demostración: todavía no consulto datos reales ni ejecuto tareas.";
    if(/venta|ingreso|gasto|costo|margen|rentabilidad|finanza/.test(q)) return "Para el análisis financiero, ORVIA cuenta con LUZ. Su especialidad prevista es revisar ingresos, gastos, costos, márgenes y rentabilidad. En esta maqueta aún no está conectada a datos contables.";
    if(/inventario|ingrediente|existencia|desperdicio|abastecimiento/.test(q)) return "JOTE es el responsable previsto de inventario: ingredientes, existencias, desperdicios y abastecimiento. Su conexión operativa todavía está pendiente.";
    if(/pedido|cocina|preparación|operación/.test(q)) return "KIKE está diseñado para supervisar pedidos, preparación, cocina y operación diaria. Puedes probar el módulo Pedidos con información ficticia.";
    if(/marketing|promoción|campaña|publicidad|cliente nuevo/.test(q)) return "XEL se encargará de marketing, promociones, campañas y publicidad para atraer clientes. Sus herramientas aún no están conectadas.";
    if(/queja|consulta|atención|cliente|servicio/.test(q)) return "NANI tiene a cargo la atención al cliente: consultas, solicitudes, quejas y seguimiento. En esta versión solo mostramos su función prevista.";
    if(/tendencia|popular|horario|crecimiento|comercial/.test(q)) return "MEMO analizará tendencias, productos populares, horarios y oportunidades de crecimiento. Todavía no tiene datos reales para analizar.";
    if(/error|fallo|técnico|tecnico|problema/.test(q)) return "JHOA está previsto para diagnóstico técnico y análisis de incidencias. Preparará posibles correcciones, pero no aplicará cambios sensibles sin autorización.";
    if(/supervisión|supervision|alerta|revisión|revision/.test(q)) return "DARI supervisará tareas, resultados y alertas, y escalará a Lucy los asuntos que necesiten intervención humana.";
    if(/agente|equipo|quién|quien/.test(q)) return "El equipo previsto tiene nueve agentes: Lucy coordina; LUZ lleva finanzas; JOTE, inventario; KIKE, operación; XEL, marketing; NANI, atención al cliente; MEMO, inteligencia comercial; JHOA, diagnóstico técnico; y DARI, supervisión operativa. Ninguno ejecuta tareas autónomas todavía.";
    return "Te he leído. En esta maqueta puedo explicarte los módulos y las responsabilidades del equipo ORVIA. Aún no tengo conexión con inteligencia artificial ni acceso a datos reales, así que no puedo ejecutar esa solicitud todavía.";
  }
  $("#lucy-toggle").addEventListener("click",()=>$("#lucy-panel").classList.toggle("open"));
  $("#lucy-close").addEventListener("click",()=>$("#lucy-panel").classList.remove("open"));

  $("#team-orchestrate").addEventListener("click",async()=>{
    const input=$("#lucy-input");const message=input.value.trim();
    if(!message){notify("Escribe primero qué necesitas analizar.");input.focus();return;}
    const box=$("#lucy-messages");const userBubble=document.createElement("div");userBubble.className="lucy-message user";userBubble.textContent=message;box.append(userBubble);
    const reply=document.createElement("div");reply.className="lucy-message";reply.textContent="Lucy está coordinando a los especialistas y a DARI…";box.append(reply);input.value="";
    if(!activeRestaurantId){reply.textContent="Primero debes conectar o registrar el restaurante.";return;}
    try{
      const token=await clerkInstance.getToken();
      const response=await fetch("/api/orchestrate",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({restaurantId:activeRestaurantId,message})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "No se pudo coordinar al equipo.");
      reply.textContent=data.answer+"\\n\\nEquipo participante: "+data.participatingAgents.join(", ")+".\\n\\nDARI: "+data.supervision+"\\n\\nNinguna acción externa o cambio de datos fue ejecutado.";
      record("Equipo ORVIA coordinado","Participaron: "+data.participatingAgents.join(", "));
    }catch(error){reply.textContent=error.message || "No se pudo conectar con el equipo ORVIA.";}
    box.scrollTop=box.scrollHeight;
  });
  $("#lucy-form").addEventListener("submit",async e=>{
    e.preventDefault();
    const input=$("#lucy-input");const message=input.value.trim();if(!message)return;
    const box=$("#lucy-messages");const userBubble=document.createElement("div");userBubble.className="lucy-message user";userBubble.textContent=message;box.append(userBubble);
    const reply=document.createElement("div");reply.className="lucy-message";reply.textContent="Preparando consulta…";box.append(reply);input.value="";box.scrollTop=box.scrollHeight;
    if(!activeRestaurantId){reply.textContent="Primero debes conectar o registrar el restaurante. Si no aparece el formulario, revisa la conexión con la base de datos.";return;}
    try{
      const token=await clerkInstance.getToken();
      const response=await fetch("/api/agents",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({restaurantId:activeRestaurantId,agentId:$("#lucy-agent-select").value,message})});
      const data=await response.json();
      reply.textContent=response.ok ? data.answer : (data.error || "No se pudo completar la consulta.");
    }catch(error){reply.textContent="No se pudo conectar con el agente. Inténtalo más tarde."}
    box.scrollTop=box.scrollHeight;
  });
  $("#agents-grid").addEventListener("click",event=>{
    const button=event.target.closest("[data-agent-id]");if(!button)return;
    $("#lucy-agent-select").value=button.dataset.agentId;
    $("#lucy-panel").classList.add("open");
    $("#lucy-input").focus();
  });
  $("#today-label").textContent = new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  renderAgents();
  renderAll();
  loadClerk().catch(() => {});
})();