(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const storeKey = "orvia.nebula.v1";
  const agents = [
    ["ORVIA LUCY","Coordinación y comunicación","Punto de contacto para recibir solicitudes, organizar informes y solicitar autorizaciones."],
    ["ORVIA LUZ","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA JOTE","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA KIKE","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA XEL","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA NANI","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA MEMO","Especialidad por documentar","Responsabilidades pendientes de confirmar con el diseño aprobado."],
    ["ORVIA JHOA","Diagnóstico técnico","Análisis de errores y preparación de posibles correcciones; cualquier cambio sensible requiere autorización."],
    ["ORVIA DARI","Supervisión operativa","Revisión de tareas, resultados y alertas; escala a Lucy lo que requiere intervención humana."]
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
    $("#agents-grid").innerHTML = agents.map((agent,i) => '<article class="agent-card"><div class="agent-top"><div class="agent-icon">'+String(i+1).padStart(2,"0")+'</div><span class="agent-state">Diseño</span></div><h3>'+escapeHtml(agent[0])+'</h3><b class="agent-role">'+escapeHtml(agent[1])+'</b><p>'+escapeHtml(agent[2])+'</p><small>Sin ejecución autónoma · No conectado</small></article>').join("");
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
  $("#enter-demo").addEventListener("click",()=>$("#welcome-screen").classList.add("hidden"));
  let authMode="login";
  function openAuth(mode){authMode=mode;$("#auth-title").textContent=mode==="login"?"Iniciar sesión":"Crear cuenta";$("#auth-dialog").showModal();}
  $("#show-login").addEventListener("click",()=>openAuth("login"));
  $("#show-register").addEventListener("click",()=>openAuth("register"));
  $("#close-auth").addEventListener("click",()=>$("#auth-dialog").close());
  $("#auth-form").addEventListener("submit",e=>{e.preventDefault();$("#auth-dialog").close();notify("Acceso visual de demostración. La autenticación real aún no está conectada.");});
  $("#lucy-toggle").addEventListener("click",()=>$("#lucy-panel").classList.toggle("open"));
  $("#lucy-close").addEventListener("click",()=>$("#lucy-panel").classList.remove("open"));
  $("#lucy-form").addEventListener("submit",e=>{
    e.preventDefault();const input=$("#lucy-input");const message=input.value.trim();if(!message)return;
    const box=$("#lucy-messages");const user=document.createElement("div");user.className="lucy-message user";user.textContent=message;box.append(user);
    const reply=document.createElement("div");reply.className="lucy-message";reply.textContent="He recibido tu mensaje en esta maqueta. Mi conexión de inteligencia artificial todavía no está habilitada, así que no puedo ejecutar tareas ni consultar datos reales. Puedo mostrarte el alcance previsto de ORVIA cuando conectemos el motor de Lucy.";box.append(reply);input.value="";box.scrollTop=box.scrollHeight;
  });
  $("#today-label").textContent = new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  renderAgents();
  renderAll();
})();