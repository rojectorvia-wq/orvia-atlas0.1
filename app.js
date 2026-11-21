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
    ["ORVIA LETI","Diagnóstico técnico","Analiza errores, revisa incidencias y prepara posibles correcciones; los cambios sensibles requieren autorización.","jhoa"],
    ["ORVIA DARI","Supervisión operativa","Revisa tareas, resultados y alertas; escala a Lucy los asuntos que requieren intervención humana.","dari"],
    ["ORVIA LEX","Control de calidad de agentes","Verifica resultados, detecta inconsistencias y registra incidentes para Lucy.","lex"],
    ["ORVIA MAX","Inteligencia empresarial","Analiza ventas, rentabilidad, tendencias y oportunidades de crecimiento con datos disponibles.","max"]
  ];
  const state = loadState();
  let toastTimer;
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || "{}");
      let orders = Array.isArray(saved.orders) ? saved.orders : [];
      let activity = Array.isArray(saved.activity) ? saved.activity : [];
      if (!orders.length && !saved.demoSeeded) {
        const now = Date.now();
        const sample = [
          ["Mesa 2","2 hamburguesas clásicas · 2 limonadas",56000,"Entregado",0],
          ["Laura M.","Pasta Alfredo · agua mineral",42000,"Preparando",1],
          ["Mesa 5","Pizza familiar · gaseosa",68000,"Listo",2],
          ["Andrés P.","2 bowls de pollo · jugo natural",49000,"Nuevo",3],
          ["Mesa 1","Ensalada César · limonada",31000,"Entregado",5],
          ["Sofía R.","Hamburguesa BBQ · papas",38000,"Entregado",7]
        ];
        orders = sample.map((item,index) => {
          const createdAt = new Date(now - item[4]*3600000).toISOString();
          return { id:"DEMO-"+String(index+1).padStart(3,"0"), customer:item[0], items:item[1], amount:item[2], status:item[3], date:todayKey(), createdAt };
        });
        activity = [
          { title:"Turno de demostración iniciado", detail:"Bistró Bahía Azul · datos ficticios", at:new Date(now-8*60000).toISOString() },
          { title:"Pedido DEMO-004 recibido", detail:"Andrés P. · $ 49.000 · Estado: Nuevo", at:new Date(now-12*60000).toISOString() },
          { title:"Pedido DEMO-002 en preparación", detail:"Laura M. · $ 42.000", at:new Date(now-25*60000).toISOString() }
        ];
        try { localStorage.setItem(storeKey, JSON.stringify({ orders, activity, demoSeeded:true })); } catch {}
      }
      return { orders, activity };
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
    $("#agents-grid").innerHTML = agents.map((agent,i) => '<article class="agent-card"><div class="agent-top"><div class="agent-icon">'+String(i+1).padStart(2,"0")+'</div><span class="agent-state">Demo</span></div><h3>'+escapeHtml(agent[0])+'</h3><b class="agent-role">'+escapeHtml(agent[1])+'</b><p>'+escapeHtml(agent[2])+'</p><small>Equipo coordinado en pruebas · Acciones sensibles protegidas</small><button class="text-button agent-ask" type="button" data-agent-id="'+escapeHtml(agent[3])+'">Consultar agente →</button></article>').join("");
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
  $("#enter-demo").addEventListener("click",()=>enterDemoMode());
  let authMode="login";
  let clerkInstance=null;
  let clerkLoaded=false;
  let authLoading=false;
  let activeRestaurantId="demo-restaurant";
  const DEMO_MODE=true;
  function enterDemoMode(){
    $("#welcome-screen").classList.add("hidden");
    $(".app-shell").classList.remove("hidden");
    notify("Bienvenido a Bistró Bahía Azul, nuestro restaurante de demostración.");
  }
  function demoAgentReply(agentId,message){
    const names={lucy:"LUCY",luz:"LUZ",jote:"JOTE",kike:"KIKE",xel:"XEL",nani:"NANI",memo:"MEMO",jhoa:"LETI",dari:"DARI",lex:"LEX",max:"MAX"};
    const tips={luz:"Revisaría ventas, costos y margen por producto antes de recomendar cambios de precio.",jote:"Conviene comparar existencias actuales con el consumo promedio y definir alertas de reposición.",kike:"Analizaría tiempos de preparación, pedidos pendientes y distribución de tareas del turno.",xel:"Propondría una promoción medible y probaría su resultado antes de ampliar la campaña.",nani:"Clasificaría la consulta del cliente, respondería con empatía y registraría el motivo para detectar patrones.",memo:"Compararía productos más solicitados, franjas horarias y tendencias de ventas disponibles.",jhoa:"Revisaría el estado del sistema, reproduciría el inconveniente y documentaría el diagnóstico.",lex:"Validaría la coherencia de los resultados, señalaría errores y los escalaría a Lucy.",max:"Analizaría ventas, márgenes y oportunidades de crecimiento con los datos disponibles.",dari:"Verificaría la coherencia de los datos, los riesgos y qué decisiones necesitan autorización.",lucy:"Coordinaría a los especialistas adecuados y resumiría sus hallazgos en un plan priorizado."};
    return "【SIMULACIÓN DE DEMOSTRACIÓN】\\n\\n"+names[agentId]+": "+(tips[agentId]||tips.lucy)+"\\n\\nSolicitud recibida: "+message+"\\n\\nEsta respuesta es una simulación con información ficticia de Bistró Bahía Azul; no consulta ni modifica sistemas reales.";
  }
  function demoTeamReply(message){
    const selected=["luz","jote","kike"].filter((id)=>/venta|ingreso|costo|precio|dinero|finanz|inventario|stock|ingrediente|pedido|cocina|operaci|turno/i.test(message));
    const team=[...new Set(selected.length?selected:["luz","kike","memo"])];
    const labels={luz:"LUZ",jote:"JOTE",kike:"KIKE",xel:"XEL",nani:"NANI",memo:"MEMO",jhoa:"JHOA"};
    return "【SIMULACIÓN DE DEMOSTRACIÓN】\\n\\nLUCY coordinaría a: "+team.map(id=>labels[id]).join(", ")+".\\n\\n"+team.map(id=>labels[id]+": "+(id==="luz"?"Revisaría indicadores financieros y márgenes.":id==="jote"?"Comprobaría existencias y necesidades de reposición.":"Analizaría el flujo operativo y los tiempos del servicio.")).join("\\n\\n")+"\\n\\nLEX: Revisaría coherencia, errores y resultados de los agentes.\\n\\nDARI: Revisaría riesgos operativos y decisiones que necesitan aprobación.\\n\\nLUCY: Integraría los resultados y propondría los siguientes pasos.\\n\\nNo se ejecutó ninguna acción. Los resultados son ficticios y muestran cómo trabajaría el equipo en Bistró Bahía Azul.";
  }
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
  $("#close-auth").addEventListener("click",()=>$("#auth-dialog").close());
  $("#auth-account-button")?.addEventListener("click",async()=>{
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
    if(/agente|equipo|quién|quien/.test(q)) return "El equipo previsto tiene once agentes: Lucy coordina; LUZ lleva finanzas; JOTE, inventario; KIKE, operación; XEL, marketing; NANI, atención al cliente; MEMO, inteligencia comercial; LETI (antes JHOA), diagnóstico técnico; DARI, supervisión operativa; LEX, control de calidad; y MAX, inteligencia empresarial. La simulación no representa ejecución real de operaciones.";
    return "Te he leído. En esta maqueta puedo explicarte los módulos y las responsabilidades del equipo ORVIA. Aún no tengo conexión con inteligencia artificial ni acceso a datos reales, así que no puedo ejecutar esa solicitud todavía.";
  }
  $("#lucy-toggle").addEventListener("click",()=>$("#lucy-panel").classList.toggle("open"));
  $("#lucy-close").addEventListener("click",()=>$("#lucy-panel").classList.remove("open"));

  $("#team-orchestrate").addEventListener("click",async()=>{
    const input=$("#lucy-input");const message=input.value.trim();
    if(!message){notify("Escribe primero qué necesitas analizar.");input.focus();return;}
    const box=$("#lucy-messages");const userBubble=document.createElement("div");userBubble.className="lucy-message user";userBubble.textContent=message;box.append(userBubble);
    const reply=document.createElement("div");reply.className="lucy-message";reply.textContent="Lucy está coordinando a los especialistas y a DARI…";box.append(reply);input.value="";
    if(DEMO_MODE){reply.textContent=demoTeamReply(message);box.scrollTop=box.scrollHeight;return;}
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
    if(DEMO_MODE){reply.textContent=demoAgentReply($("#lucy-agent-select").value,message);box.scrollTop=box.scrollHeight;return;}
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

  // ORVIA 0.2 — Nébula: módulos ampliados de demostración.
  const extraModules = [
    ["finance","Finanzas","◈"],["inventory","Inventario","▦"],["marketing","Marketing","✦"],
    ["customers","Clientes","♙"],["purchases","Compras","⇄"],["staff","Personal","♧"],
    ["restaurant","Restaurante","⌂"],["analytics","Analítica","⌁"],["settings","Configuración","⚙"]
  ];
  const moduleNames = {finance:"Finanzas",inventory:"Inventario",marketing:"Marketing",customers:"Clientes",purchases:"Compras",staff:"Personal",restaurant:"Restaurante",analytics:"Analítica",settings:"Configuración"};
  const nav = $(".nav");
  const main = $(".main");
  extraModules.forEach(([id,label,icon])=>{
    const button=document.createElement("button");
    button.className="nav-link";button.dataset.view=id;button.innerHTML="<span>"+icon+"</span> "+label;
    button.addEventListener("click",()=>showView(id));
    nav.append(button);
    const section=document.createElement("section");
    section.className="view";section.id="view-"+id;
    section.innerHTML='<div class="page-heading"><div><div class="eyebrow">ORVIA · MÓDULO DE DEMOSTRACIÓN</div><h1>'+label+'</h1><p>Información ficticia de Bistró Bahía Azul · entorno de prueba</p></div></div><div class="module-content" id="module-'+id+'"></div>';
    main.append(section);
  });
  const agentRuntime = Object.fromEntries(agents.map(a=>[a[3],{status:"En espera",task:"Disponible para una tarea de demostración",runs:0}]));
  const agentSequence = ["lucy","luz","jote","kike","xel","nani","memo","jhoa","dari","lex","max"];
  let pulseIndex=0;
  let autopilotStarted=false;
  let autopilotStepTimer=null;
  let autopilotOrderTimer=null;
  let autopilotSequence=100;
  const inventoryItems = [
    {name:"Carne de res",qty:8,unit:"kg",min:5},{name:"Pan de hamburguesa",qty:24,unit:"unidades",min:12},
    {name:"Queso mozzarella",qty:3,unit:"kg",min:4},{name:"Tomate",qty:11,unit:"kg",min:5},
    {name:"Lechuga",qty:6,unit:"unidades",min:4},{name:"Papas",qty:14,unit:"kg",min:6},
    {name:"Limón",qty:4,unit:"kg",min:5},{name:"Gaseosa",qty:30,unit:"unidades",min:10}
  ];
  const financeExpenses = [{name:"Compra de ingredientes",amount:720000},{name:"Nómina de demostración",amount:430000},{name:"Servicios",amount:120000},{name:"Publicidad",amount:80000}];
  const campaigns = [{name:"Combo Bahía",channel:"Redes sociales",status:"Borrador",budget:90000,reach:0}];
  const customers = ["Laura M.","Andrés P.","Sofía R.","Mesa 2","Mesa 5"];
  function moduleCard(label,value,foot){return '<article class="stat-card"><span>'+label+'</span><strong>'+value+'</strong><small class="stat-foot">'+foot+'</small></article>';}
  function renderFinance(){
    const income=state.orders.filter(o=>o.status==="Entregado").reduce((s,o)=>s+o.amount,0);
    const expenses=financeExpenses.reduce((s,e)=>s+e.amount,0);
    $("#module-finance").innerHTML='<div class="notice"><span>ⓘ</span><p><b>ORVIA FINANCE · COP.</b> Cifras de ejemplo calculadas con los pedidos ficticios y gastos ilustrativos. No representa una cuenta bancaria ni dinero real.</p></div><div class="stats-grid">'+moduleCard("INGRESOS REGISTRADOS",money(income),"Pedidos entregados")+moduleCard("EGRESOS DE EJEMPLO",money(expenses),"Gastos ficticios")+moduleCard("RESULTADO ESTIMADO",money(income-expenses),"Ingresos menos gastos")+moduleCard("MOVIMIENTOS",state.orders.length+financeExpenses.length,"Ventas y gastos de muestra")+'</div><section class="panel"><div class="panel-heading"><div><h3>Movimientos financieros</h3><p>Registro ilustrativo en pesos colombianos</p></div></div><div class="order-table-wrap"><table class="order-table"><thead><tr><th>CONCEPTO</th><th>TIPO</th><th>VALOR</th></tr></thead><tbody>'+state.orders.filter(o=>o.status==="Entregado").map(o=>'<tr><td>Venta '+escapeHtml(o.id)+'</td><td>Ingreso</td><td>'+money(o.amount)+'</td></tr>').join("")+financeExpenses.map(e=>'<tr><td>'+e.name+'</td><td>Egreso</td><td>− '+money(e.amount)+'</td></tr>').join("")+'</tbody></table></div></section>';
  }
  function renderInventory(){
    $("#module-inventory").innerHTML='<div class="notice"><span>ⓘ</span><p>Existencias ficticias para mostrar alertas de JOTE. No se envían compras ni pedidos a proveedores.</p></div><section class="panel"><div class="panel-heading"><div><h3>Existencias del restaurante</h3><p>Alerta cuando el nivel llega al mínimo</p></div><button class="button primary" id="inventory-restock">Simular reposición</button></div><div class="order-table-wrap"><table class="order-table"><thead><tr><th>PRODUCTO</th><th>EXISTENCIA</th><th>MÍNIMO</th><th>ESTADO</th></tr></thead><tbody>'+inventoryItems.map((x,i)=>'<tr><td>'+x.name+'</td><td>'+x.qty+' '+x.unit+'</td><td>'+x.min+' '+x.unit+'</td><td>'+(x.qty<=x.min?'<span class="status prep">Reponer</span>':'<span class="status done">Disponible</span>')+'</td></tr>').join("")+'</tbody></table></div></section>';
    $("#inventory-restock").addEventListener("click",()=>{inventoryItems.forEach(x=>{if(x.qty<=x.min)x.qty+=x.min*2;});record("JOTE · Reposición simulada","Se actualizaron existencias ficticias del inventario.");renderInventory();pulseAgent("jote","Revisó niveles y simuló reposición");notify("Reposición de demostración completada.");});
  }
  function renderMarketing(){
    $("#module-marketing").innerHTML='<div class="notice"><span>ⓘ</span><p>XEL prepara campañas de ejemplo. No se publica contenido ni se contactan clientes reales.</p></div><section class="panel"><div class="panel-heading"><div><h3>Campañas de marketing</h3><p>Ideas y estado de cada campaña</p></div><button class="button primary" id="marketing-launch">Activar campaña demo</button></div><div class="order-list">'+campaigns.map((c,i)=>'<div class="order-row"><div><b>'+escapeHtml(c.name)+'</b><small>'+escapeHtml(c.channel)+' · Presupuesto ilustrativo: '+money(c.budget)+'</small></div><div class="order-right"><strong>'+c.status+'</strong><small>'+c.reach+' alcance simulado</small></div></div>').join("")+'</div></section><div class="content-grid"><section class="panel"><h3>Oportunidad detectada</h3><p class="muted small">Promocionar un combo de hamburguesa y limonada en horas de menor demanda, midiendo pedidos antes y después.</p></section><section class="panel"><h3>Recomendación de XEL</h3><p class="muted small">Probar una campaña pequeña, comparar resultados y ajustar el presupuesto según el rendimiento.</p></section></div>';
    $("#marketing-launch").addEventListener("click",()=>{campaigns[0].status="Activa · demo";campaigns[0].reach=240;record("XEL · Campaña activada en demostración","Combo Bahía · alcance ficticio de 240 personas.");pulseAgent("xel","Activó la campaña Combo Bahía en modo demo");renderMarketing();notify("Campaña de demostración activada.");});
  }
  function renderSimpleModule(id){
    const data={
      customers:['Directorio de clientes',customers.map((n,i)=>({a:n,b:"Cliente de ejemplo · "+(i+1)+" visitas",c:"Activo"}))],
      purchases:['Abastecimiento y proveedores',[{a:"Distribuidora Bahía",b:"Ingredientes y frescos",c:"Proveedor demo"},{a:"Bebidas del Caribe",b:"Bebidas",c:"Proveedor demo"},{a:"Empaques Costa",b:"Empaques",c:"Proveedor demo"}]],
      staff:['Equipo del restaurante',[{a:"María · Cocina",b:"Turno de mañana",c:"Programado"},{a:"Carlos · Servicio",b:"Turno de tarde",c:"Programado"},{a:"Elena · Caja",b:"Turno de tarde",c:"Programado"}]],
      restaurant:['Salón y mesas',[{a:"Mesa 1",b:"En servicio",c:"Ocupada"},{a:"Mesa 2",b:"Disponible",c:"Libre"},{a:"Mesa 3",b:"Disponible",c:"Libre"},{a:"Mesa 4",b:"En servicio",c:"Ocupada"},{a:"Mesa 5",b:"Preparando cuenta",c:"Atención"}]],
      analytics:['Indicadores de operación',[{a:"Producto destacado",b:"Hamburguesa clásica",c:"Más solicitado en demo"},{a:"Franja activa",b:"12:00–14:00",c:"Mayor movimiento de ejemplo"},{a:"Ticket promedio",b:money(state.orders.length?Math.round(state.orders.reduce((s,o)=>s+o.amount,0)/state.orders.length):0),c:"Calculado sobre pedidos"}]],
      settings:['Preferencias de la maqueta',[{a:"Idioma",b:"Español",c:"Activo"},{a:"Moneda",b:"Peso colombiano (COP)",c:"Demostración"},{a:"Restaurante",b:"Bistró Bahía Azul",c:"Ficticio"},{a:"Modo de datos",b:"Local y simulado",c:"Activo"}]]
    };
    const [title,rows]=data[id];
    $("#module-"+id).innerHTML='<section class="panel"><div class="panel-heading"><div><h3>'+title+'</h3><p>Datos ficticios para recorrer el módulo</p></div></div><div class="order-list">'+rows.map(r=>'<div class="order-row"><div><b>'+escapeHtml(r.a)+'</b><small>'+escapeHtml(r.b)+'</small></div><div class="order-right"><span class="status">'+escapeHtml(r.c)+'</span></div></div>').join("")+'</div></section>';
  }
  function pulseAgent(id,task){
    const item=agentRuntime[id];if(!item)return;
    item.status="Trabajando";item.task=task;item.runs++;
    record(agents.find(a=>a[3]===id)[0]+" · tarea iniciada",task+" · simulación");
    renderAgents();
    setTimeout(()=>{item.status="En espera";item.task="Última tarea: "+task;renderAgents();},1500);
  }
  function renderLiveAgents(){
    const live=$("#agent-live-feed");
    if(live)live.innerHTML=agentSequence.map(id=>{const a=agents.find(x=>x[3]===id),r=agentRuntime[id];return '<div class="activity-item"><i class="activity-dot '+(r.status==="Trabajando"?"live-dot":"")+'"></i><div><b>'+a[0]+' · '+r.status+'</b><p>'+escapeHtml(r.task)+' · '+r.runs+' tareas demo</p></div></div>';}).join("");
  }
  const baseRenderAgents=renderAgents;
  renderAgents=function(){
    $("#agents-grid").innerHTML=agents.map((agent,i)=>{const r=agentRuntime[agent[3]];return '<article class="agent-card '+(r.status==="Trabajando"?"agent-working":"")+'"><div class="agent-top"><div class="agent-icon">'+String(i+1).padStart(2,"0")+'</div><span class="agent-state '+(r.status==="Trabajando"?"agent-state-live":"")+'">'+r.status+'</span></div><h3>'+escapeHtml(agent[0])+'</h3><b class="agent-role">'+escapeHtml(agent[1])+'</b><p>'+escapeHtml(agent[2])+'</p><small>'+escapeHtml(r.task)+'</small><button class="text-button agent-ask" type="button" data-agent-id="'+escapeHtml(agent[3])+'">Consultar agente →</button></article>';}).join("");
    renderLiveAgents();
  };
  function buildLivePanel(){
    const section=$("#view-agents");
    const panel=document.createElement("section");panel.className="panel agent-live-panel";
    panel.innerHTML='<div class="panel-heading"><div><h3>Centro de autonomía</h3><p id="autopilot-status">Restaurante en espera · simulación local</p></div><div class="panel-actions"><button class="button subtle" id="run-agent-cycle">Ciclo de agentes</button><button class="button primary" id="toggle-autopilot">Iniciar autopiloto</button></div></div><div id="agent-live-feed" class="activity-list"></div>';
    section.append(panel);
    $("#run-agent-cycle").addEventListener("click",runAgentCycle);
    $("#toggle-autopilot").addEventListener("click",()=>autopilotStarted?stopDemoAutopilot():startDemoAutopilot());
  }
  function runAgentCycle(){
    const tasks=["Coordina el turno y distribuye tareas","Calcula el resumen financiero ilustrativo","Comprueba ingredientes y alertas de stock","Revisa pedidos y tiempos de preparación","Prepara una propuesta de promoción","Clasifica una consulta de cliente ficticia","Analiza productos y horarios populares","Comprueba el estado técnico de la maqueta","Supervisa resultados y señala aprobaciones necesarias","Audita respuestas y resultados de los agentes","Analiza oportunidades de crecimiento del restaurante"];
    agentSequence.forEach((id,i)=>setTimeout(()=>pulseAgent(id,tasks[i]),i*260));
    record("LUCY · Ciclo de equipo iniciado","Once agentes recorren tareas demostrativas en secuencia.");
    notify("Ciclo de demostración de once agentes iniciado.");
  }
  function consumeDemoIngredients(order){
    const text=String(order.items||"").toLowerCase();
    if(text.includes("hamburguesa")){
      const bread=inventoryItems.find(x=>x.name==="Pan de hamburguesa");
      const beef=inventoryItems.find(x=>x.name==="Carne de res");
      if(bread) bread.qty=Math.max(0,bread.qty-1);
      if(beef) beef.qty=Math.max(0,beef.qty-0.2);
    }
    if(text.includes("pizza")){
      const cheese=inventoryItems.find(x=>x.name==="Queso mozzarella");
      if(cheese) cheese.qty=Math.max(0,cheese.qty-0.25);
    }
    if(text.includes("limonada")||text.includes("limón")){
      const lemon=inventoryItems.find(x=>x.name==="Limón");
      if(lemon) lemon.qty=Math.max(0,lemon.qty-0.15);
    }
    renderInventory();
  }
  function advanceDemoKitchen(){
    if(!autopilotStarted) return;
    const order=state.orders.filter(o=>["Nuevo","Preparando","Listo"].includes(o.status)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))[0];
    if(!order) return;
    const previous=order.status;
    if(previous==="Nuevo"){
      order.status="Preparando";
      consumeDemoIngredients(order);
      pulseAgent("kike","KIKE envió el pedido #"+order.id+" a preparación");
      pulseAgent("jote","JOTE actualizó consumo ficticio de ingredientes");
      record("Cocina · pedido #"+order.id+" en preparación",order.items+" · ingredientes de demostración descontados");
    }else if(previous==="Preparando"){
      order.status="Listo";
      pulseAgent("kike","KIKE confirmó que el pedido #"+order.id+" está listo");
      record("Cocina · pedido #"+order.id+" listo","Preparación de demostración finalizada");
    }else{
      order.status="Entregado";
      pulseAgent("nani","NANI registró la entrega del pedido #"+order.id);
      pulseAgent("luz","LUZ actualizó las ventas ilustrativas");
      record("Servicio · pedido #"+order.id+" entregado","Venta ficticia registrada: "+money(order.amount));
    }
    persist();
    renderAll();
    renderFinance();
    renderMarketing();
  }
  function createAutopilotOrder(){
    const examples=[
      ["Mesa 3","Hamburguesa clásica · limonada",42000],
      ["Camila R.","Pizza personal · gaseosa",39000],
      ["Mesa 6","Hamburguesa BBQ · papas",46000],
      ["Daniel G.","Pasta Alfredo · limonada",44000]
    ];
    const sample=examples[autopilotSequence%examples.length];
    const id="AUTO-"+String(autopilotSequence++).padStart(3,"0");
    const order={id,customer:sample[0],items:sample[1],amount:sample[2],status:"Nuevo",date:todayKey(),createdAt:new Date().toISOString(),demoAutopilot:true};
    state.orders.push(order);
    persist();
    record("NANI · nuevo pedido recibido","#"+id+" · "+sample[0]+" · "+money(sample[2])+" · enviado a KIKE");
    pulseAgent("nani","Registró el pedido ficticio #"+id);
    pulseAgent("lucy","Coordinó el nuevo pedido #"+id);
    renderAll();
  }
  function startDemoAutopilot(){
    if(autopilotStarted) return;
    autopilotStarted=true;
    $("#autopilot-status").textContent="Autopiloto activo · pedidos, cocina e inventario simulados";
    $("#toggle-autopilot").textContent="Pausar autopiloto";
    record("LUCY · autopiloto iniciado","ORVIA coordina pedidos ficticios, preparación, inventario y entrega en modo demostración.");
    createAutopilotOrder();
    advanceDemoKitchen();
    autopilotStepTimer=setInterval(advanceDemoKitchen,4500);
    autopilotOrderTimer=setInterval(createAutopilotOrder,18000);
    notify("Autopiloto del restaurante iniciado. Todo ocurre con datos ficticios.");
  }
  function stopDemoAutopilot(){
    autopilotStarted=false;
    clearInterval(autopilotStepTimer);
    clearInterval(autopilotOrderTimer);
    autopilotStepTimer=null;
    autopilotOrderTimer=null;
    $("#autopilot-status").textContent="Autopiloto pausado · puedes reanudarlo cuando quieras";
    $("#toggle-autopilot").textContent="Reanudar autopiloto";
    record("LUCY · autopiloto pausado","La simulación dejó de crear pedidos y avanzar la cocina.");
    notify("Autopiloto pausado.");
  }
  function renderExtraModules(){
    renderFinance();renderInventory();renderMarketing();
    ["customers","purchases","staff","restaurant","analytics","settings"].forEach(renderSimpleModule);
  }
  const previousAgentReply=demoAgentReply;
  demoAgentReply=function(id,message){pulseAgent(id,"Respondió una consulta individual");return previousAgentReply(id,message);};
  const previousTeamReply=demoTeamReply;
  demoTeamReply=function(message){runAgentCycle();return previousTeamReply(message);};
  const originalShowView=showView;
  showView=function(name){
    originalShowView(name);
    $("#breadcrumb").textContent=moduleNames[name]||({overview:"Resumen",orders:"Pedidos",agents:"Centro de agentes",activity:"Registro de actividad"})[name]||"Resumen";
    if(name==="finance")renderFinance();
    if(name==="inventory")renderInventory();
    if(name==="marketing")renderMarketing();
    if(["customers","purchases","staff","restaurant","analytics","settings"].includes(name))renderSimpleModule(name);
  };
  buildLivePanel();
  renderExtraModules();
  const originalEnterDemo=enterDemoMode;
  enterDemoMode=function(){originalEnterDemo();runAgentCycle();startDemoAutopilot();};
  setInterval(()=>{pulseIndex=(pulseIndex+1)%agentSequence.length;const id=agentSequence[pulseIndex];if(agentRuntime[id].status!=="Trabajando"){agentRuntime[id].status="Trabajando";agentRuntime[id].task="Revisión periódica de demostración";renderAgents();setTimeout(()=>{agentRuntime[id].status="En espera";renderAgents();},1700);}},4200);

  const knowledgePendingKey="orvia.knowledge.pending.v1";
  const knowledgeApprovedKey="orvia.knowledge.approved.v1";
  const readKnowledge=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch{return [];}};
  const writeKnowledge=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notify("No se pudo guardar la biblioteca en este navegador.");}};
  function renderKnowledgeBoard(){
    const pending=readKnowledge(knowledgePendingKey),approved=readKnowledge(knowledgeApprovedKey);
    $("#knowledge-pending").innerHTML=pending.length?pending.map((x,i)=>'<div class="order-row"><div><b>'+escapeHtml(x.question)+'</b><small>'+escapeHtml(x.answer)+'<br>Fuente: '+escapeHtml(x.source||"No indicada")+'</small></div><div class="order-right"><button class="button primary" data-knowledge-approve="'+i+'">Aprobar</button><button class="button subtle" data-knowledge-delete="'+i+'">Eliminar</button></div></div>').join(""):'<div class="empty">No hay conocimientos pendientes de revisión.</div>';
    $("#knowledge-approved-count").textContent=approved.length+" conocimientos propios aprobados";
    $("#knowledge-approved").innerHTML=approved.length?approved.map((x,i)=>'<div class="order-row"><div><b>'+escapeHtml(x.question)+'</b><small>'+escapeHtml(x.answer)+'</small></div><div class="order-right"><button class="button subtle" data-knowledge-revoke="'+i+'">Retirar</button></div></div>').join(""):'<div class="empty">Aún no has aprobado conocimientos propios.</div>';
  }
  $("#knowledge-form").addEventListener("submit",event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const question=String(form.get("question")||"").trim(),answer=String(form.get("answer")||"").trim(),source=String(form.get("source")||"").trim();
    if(question.length<5||answer.length<15){notify("Añade una pregunta y una respuesta más completas.");return;}
    const pending=readKnowledge(knowledgePendingKey);
    pending.unshift({question,answer,source,createdAt:new Date().toISOString()});
    writeKnowledge(knowledgePendingKey,pending);
    event.currentTarget.reset();renderKnowledgeBoard();record("LUCY · conocimiento enviado a revisión",question);
    notify("Guardado como pendiente. Revísalo antes de aprobarlo.");
  });
  $("#knowledge-pending").addEventListener("click",event=>{
    const approve=event.target.closest("[data-knowledge-approve]"),remove=event.target.closest("[data-knowledge-delete]");
    if(approve){
      const pending=readKnowledge(knowledgePendingKey),approved=readKnowledge(knowledgeApprovedKey),index=Number(approve.dataset.knowledgeApprove);
      if(!pending[index])return;
      const item=pending.splice(index,1)[0];
      approved.unshift({...item,approvedAt:new Date().toISOString()});
      writeKnowledge(knowledgePendingKey,pending);writeKnowledge(knowledgeApprovedKey,approved);
      renderKnowledgeBoard();record("LUCY · conocimiento aprobado por el usuario",item.question);
      notify("Conocimiento aprobado para la biblioteca local de Lucy.");
    }else if(remove){
      const pending=readKnowledge(knowledgePendingKey);pending.splice(Number(remove.dataset.knowledgeDelete),1);
      writeKnowledge(knowledgePendingKey,pending);renderKnowledgeBoard();notify("Elemento pendiente eliminado.");
    }
  });
  $("#knowledge-approved").addEventListener("click",event=>{
    const button=event.target.closest("[data-knowledge-revoke]");if(!button)return;
    const approved=readKnowledge(knowledgeApprovedKey);approved.splice(Number(button.dataset.knowledgeRevoke),1);
    writeKnowledge(knowledgeApprovedKey,approved);renderKnowledgeBoard();notify("Conocimiento retirado de la biblioteca local.");
  });
  renderKnowledgeBoard();
  $("#today-label").textContent = new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  renderAgents();
  renderAll();
  // La presentación se conserva: el usuario entra a la demo al pulsar el CTA.
})();