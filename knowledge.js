/* ORVIA KNOWLEDGE 0.3 — 1.008 consultas de referencia para restaurantes.
 * Son intenciones y variaciones de preguntas, no respuestas rígidas ni evidencia del negocio.
 * La respuesta final debe consultar datos disponibles y señalar faltantes.
 */
(() => {
"use strict";
const categories=[{"name":"Inventario","agent":"JOTE","scope":"existencias, ingredientes, rotación, mínimos, caducidad, mermas, compras y proveedores","questions":["¿Cómo calculo el stock mínimo?","¿Cuándo debo reponer un ingrediente?","¿Cómo reduzco el desperdicio de alimentos?","¿Cómo controlo las fechas de vencimiento?","¿Cómo hago un conteo físico?","¿Qué hago si hay diferencias de inventario?","¿Cómo calculo el consumo diario?","¿Cómo organizo una bodega?","¿Cómo clasifico productos por rotación?","¿Cómo controlo las mermas?","¿Cómo recibo mercancía de un proveedor?","¿Cómo evalúo a un proveedor?","¿Cómo evito quedarme sin ingredientes?","¿Cómo calculo el costo de una receta?","¿Cómo registro entradas y salidas?","¿Qué productos requieren refrigeración?","¿Cómo hago inventario semanal?","¿Cómo detecto compras excesivas?","¿Cómo planeo abastecimiento para temporada alta?","¿Qué indicadores debe revisar inventario?","¿Cómo documento una pérdida de producto?"]},{"name":"Finanzas","agent":"LUZ","scope":"caja, ingresos, egresos, costos, flujo de efectivo, márgenes, presupuestos, conciliación y rentabilidad","questions":["¿Cómo hago un cierre de caja?","¿Cómo calculo el margen de ganancia?","¿Cómo separo costos fijos y variables?","¿Cómo preparo un presupuesto mensual?","¿Cómo controlo los gastos diarios?","¿Cómo calculo el punto de equilibrio?","¿Cómo reviso la rentabilidad por plato?","¿Cómo concilio medios de pago?","¿Cómo registro pagos a proveedores?","¿Cómo proyecto el flujo de caja?","¿Cómo identifico gastos inusuales?","¿Cómo calculo el costo de alimentos?","¿Cómo controlo descuentos y cortesías?","¿Cómo preparo un informe de ventas?","¿Cómo manejo cuentas por cobrar?","¿Cómo comparo ventas contra presupuesto?","¿Qué hago si la caja no cuadra?","¿Cómo calculo el ticket promedio?","¿Cómo organizo soportes de gastos?","¿Cómo mido la utilidad operativa?","¿Qué indicadores financieros debo revisar?"]},{"name":"Marketing","agent":"XEL","scope":"marca, campañas, promociones, redes sociales, reputación, fidelización, segmentación y publicidad","questions":["¿Cómo atraigo más clientes?","¿Qué promoción puedo lanzar entre semana?","¿Cómo creo un calendario de redes sociales?","¿Cómo mido si una campaña funciona?","¿Cómo consigo reseñas positivas de forma ética?","¿Cómo promociono un plato nuevo?","¿Cómo defino mi público objetivo?","¿Cómo diseño una oferta rentable?","¿Cómo recupero clientes inactivos?","¿Cómo promociono un menú ejecutivo?","¿Qué contenido publico en Instagram?","¿Cómo respondo una reseña negativa?","¿Cómo diferencio mi restaurante?","¿Cómo hago una campaña de temporada?","¿Cómo calculo el retorno publicitario?","¿Cómo colaboro con negocios locales?","¿Cómo presento mejor mis platos?","¿Cómo promociono domicilios?","¿Cómo fidelizo clientes frecuentes?","¿Cómo pruebo dos promociones?","¿Qué presupuesto asigno a marketing?"]},{"name":"Operaciones y pedidos","agent":"KIKE","scope":"reservas, tiempos, cocina, servicio, turnos, domicilios, calidad, procesos y capacidad","questions":["¿Cómo reduzco los tiempos de espera?","¿Cómo organizo los turnos de cocina?","¿Cómo priorizo pedidos pendientes?","¿Cómo manejo una hora pico?","¿Cómo estandarizo la preparación?","¿Cómo reduzco errores en pedidos?","¿Cómo organizo las estaciones de cocina?","¿Cómo gestiono reservas y mesas?","¿Cómo preparo una lista de apertura?","¿Cómo hago el cierre operativo?","¿Cómo controlo pedidos para llevar?","¿Cómo manejo una devolución?","¿Cómo calculo la capacidad del salón?","¿Cómo documento un procedimiento?","¿Cómo coordino cocina y meseros?","¿Cómo reviso calidad antes de servir?","¿Cómo manejo faltantes durante el turno?","¿Cómo preparo el restaurante para alta demanda?","¿Cómo mido productividad del equipo?","¿Cómo reduzco cancelaciones?","¿Qué indicadores operativos debo medir?"]},{"name":"Clientes y atención","agent":"NANI","scope":"experiencia, quejas, servicio, reservas, privacidad, accesibilidad, fidelización y comunicación","questions":["¿Cómo respondo una queja?","¿Qué hago ante un pedido equivocado?","¿Cómo atiendo a un cliente molesto?","¿Cómo solicito comentarios al cliente?","¿Cómo gestiono una reserva cancelada?","¿Cómo respondo una reseña negativa?","¿Cómo manejo alergias alimentarias informadas?","¿Cómo atiendo solicitudes especiales?","¿Cómo recupero la confianza de un cliente?","¿Cómo diseño un protocolo de atención?","¿Cómo registro reclamos?","¿Cómo mido satisfacción?","¿Cómo trato datos personales de clientes?","¿Cómo gestiono objetos olvidados?","¿Cómo respondo preguntas frecuentes?","¿Cómo atiendo clientes con movilidad reducida?","¿Cómo informo tiempos de espera?","¿Cómo manejo una devolución justa?","¿Cómo fidelizo sin saturar al cliente?","¿Cómo capacito al personal de servicio?","¿Cuándo debo escalar una queja?"]},{"name":"Personal y administración","agent":"MEMO","scope":"contratación, capacitación, horarios, liderazgo, seguridad laboral, comunicación y desempeño","questions":["¿Cómo organizo horarios del personal?","¿Cómo preparo una inducción?","¿Cómo capacito a un mesero nuevo?","¿Cómo doy retroalimentación al equipo?","¿Cómo manejo ausencias de turno?","¿Cómo reparto responsabilidades?","¿Cómo reduzco rotación de personal?","¿Cómo preparo una reunión de equipo?","¿Cómo documento funciones por cargo?","¿Cómo evalúo desempeño de forma justa?","¿Cómo mejoro la comunicación interna?","¿Cómo planifico vacaciones?","¿Cómo organizo el relevo de turno?","¿Cómo prevengo conflictos laborales?","¿Cómo promuevo seguridad alimentaria?","¿Cómo preparo un manual operativo?","¿Cómo detecto necesidades de capacitación?","¿Cómo reconozco buen desempeño?","¿Cómo manejo información confidencial?","¿Cómo preparo un plan de contingencia?","¿Qué indicadores de personal puedo seguir?"]},{"name":"Analítica y estrategia","agent":"LUCY","scope":"proyecciones, demanda, precios, competencia, indicadores, escenarios, estacionalidad y decisiones","questions":["¿Cómo proyecto las ventas de mañana?","¿Qué datos necesito para pronosticar demanda?","¿Cómo identifico mis platos más rentables?","¿Cómo comparo semanas y meses?","¿Cómo detecto horas de baja demanda?","¿Cómo mido el ticket promedio?","¿Cómo calculo la ocupación de mesas?","¿Cómo analizo la mezcla de productos?","¿Cómo evalúo un cambio de precios?","¿Cómo comparo mi desempeño con metas?","¿Cómo identifico tendencias de temporada?","¿Cómo preparo un tablero gerencial?","¿Cómo priorizo problemas del restaurante?","¿Cómo evalúo abrir un nuevo horario?","¿Cómo hago escenarios optimista y conservador?","¿Cómo identifico causas de caída en ventas?","¿Cómo mido productividad por hora?","¿Cómo uso datos sin sacar conclusiones falsas?","¿Qué métricas debe ver un gerente a diario?","¿Cómo convierto indicadores en acciones?","¿Cómo presento resultados al propietario?"]},{"name":"Higiene, seguridad y tecnología","agent":"JHOA","scope":"inocuidad, limpieza, mantenimiento, incidentes, continuidad, equipos y protección de datos","questions":["¿Cómo preparo una lista de limpieza?","¿Cómo registro temperaturas de refrigeración?","¿Cómo prevengo contaminación cruzada?","¿Cómo manejo un corte de energía?","¿Qué hago si falla el sistema de pedidos?","¿Cómo preparo un plan de mantenimiento?","¿Cómo registro un incidente?","¿Cómo protejo las cuentas del restaurante?","¿Cómo hago copias de seguridad?","¿Cómo capacito en higiene alimentaria?","¿Cómo verifico limpieza de superficies?","¿Cómo gestiono residuos?","¿Cómo reviso equipos antes del turno?","¿Cómo manejo una falla de internet?","¿Cómo reduzco riesgos de seguridad?","¿Cómo controlo acceso a información?","¿Cómo reporto un equipo averiado?","¿Cómo preparo un protocolo de emergencia?","¿Cómo aseguro continuidad del servicio?","¿Cómo documento una auditoría interna?","¿Qué debe revisar un supervisor diariamente?"]}];
const variants=["Explícame: ","Necesito saber ","¿Me orientas sobre ","¿Cuál es la mejor forma de ","Ayúdame con ","¿Qué recomienda ORVIA para "];
const entries=[];
for (const category of categories) for (const topic of category.questions) for (let i=0;i<6;i++) {
 const base=topic.replace(/[¿?]/g,"").trim();
 const question=i===0?topic:variants[i]+base.charAt(0).toLowerCase()+base.slice(1);
 entries.push({id:"KB-"+String(entries.length+1).padStart(4,"0"),category:category.name,agent:category.agent,question,topic:base,scope:category.scope});
}
function refreshUserKnowledge(){
 entries.splice(0,entries.length,...entries.filter(e=>!String(e.id||"").startsWith("USER-KB-")));
 try {
  const approved=JSON.parse(localStorage.getItem("orvia.knowledge.approved.v1")||"[]");
  if(Array.isArray(approved)) approved.forEach((item,index)=>{
   if(item && typeof item.question==="string" && typeof item.answer==="string") entries.push({id:"USER-KB-"+(index+1),category:"Conocimiento aprobado por el propietario",agent:"LUCY",question:item.question,topic:item.question,scope:"Aporte revisado por el usuario",customAnswer:item.answer,source:item.source||"No indicada"});
  });
 } catch {}
}
refreshUserKnowledge();
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const add=(text,cls="lucy-message")=>{const box=$("#lucy-messages");const el=document.createElement("div");el.className=cls;el.textContent=text;box.append(el);box.scrollTop=box.scrollHeight;return el;};
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ");
function retrieve(q){
 const terms=norm(q).split(/\s+/).filter(t=>t.length>2);
 return entries.map(e=>{const hay=norm(e.topic+" "+e.category+" "+e.scope);let score=0;for(const t of terms)if(hay.includes(t))score+=t.length>5?2:1;return {e,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
}
function localFacts(){
 const orders=JSON.parse(localStorage.getItem("orvia.nebula.v1")||"{}").orders||[];
 const delivered=orders.filter(o=>o.status==="Entregado");
 const sales=delivered.reduce((s,o)=>s+(Number(o.amount)||0),0);
 const avg=orders.length?orders.reduce((s,o)=>s+(Number(o.amount)||0),0)/orders.length:0;
 return {orders:orders.length,delivered:delivered.length,sales,avg,items:orders.map(o=>o.items)};
}
function answer(q,team=false){
 const found=retrieve(q),facts=localFacts(),n=norm(q);
 const categories=[...new Set(found.map(x=>x.e.category))];
 const agents=[...new Set(found.map(x=>x.e.agent))];
 let out="ORVIA KNOWLEDGE · "+entries.length.toLocaleString("es-CO")+" preguntas e intenciones indexadas\n";
 if(categories.length)out+="Área relacionada: "+categories.slice(0,3).join(", ")+". Especialista sugerido: "+agents.slice(0,3).join(", ")+".\n\n";
 if(/inventario|stock|existencia|ingrediente|insumo|reponer/.test(n)){
  out+="INVENTARIO DE DEMOSTRACIÓN\n";
  out+="• Carne de res: 8 kg (mínimo 5) — disponible.\n• Pan de hamburguesa: 24 unidades (mínimo 12) — disponible.\n• Queso mozzarella: 3 kg (mínimo 4) — ALERTA: reponer.\n• Tomate: 11 kg (mínimo 5) — disponible.\n• Lechuga: 6 unidades (mínimo 4) — disponible.\n• Papas: 14 kg (mínimo 6) — disponible.\n• Limón: 4 kg (mínimo 5) — ALERTA: reponer.\n• Gaseosa: 30 unidades (mínimo 10) — disponible.\n\n";
  out+="Prioridad sugerida: verificar físicamente queso y limón, revisar consumo previsto y confirmar cantidades con el proveedor antes de comprar. Son existencias ficticias de la maqueta.\n\n";
 }
 if(/venta|ingreso|proyeccion|proyect|finanz|caja|marketing|promocion|campana|hoy|manana|dia/.test(n)){
  out+="DATOS DISPONIBLES DEL RESTAURANTE FICTICIO\n";
  out+="• Pedidos locales registrados: "+facts.orders+".\n• Pedidos marcados como entregados: "+facts.delivered+".\n• Ventas asociadas a entregados: "+money(facts.sales)+".\n• Ticket promedio de pedidos locales: "+money(facts.avg)+".\n";
  out+="Estos datos provienen del almacenamiento local de esta maqueta; no son una conexión a caja, pasarela de pago ni contabilidad.\n\n";
 }
 if(/proyeccion|proyect|pronost|manana|mañana|hoy|ventas/.test(n)){
  out+="PROYECCIÓN RESPONSABLE\nCon el conjunto de demostración actual no hay suficiente historial comparable por fecha y franja horaria para producir un pronóstico fiable. No voy a inventar una cifra. Para proyectar ventas se necesitan, idealmente, 4–8 semanas de ventas diarias y por hora, día de semana, festivos, reservas, capacidad, promociones y cierres. Mientras tanto, puedo ofrecer escenarios bajo, base y alto cuando se definan supuestos explícitos.\n\n";
 }
 if(/marketing|promocion|campana|publicidad|atraer/.test(n)){
  out+="PROPUESTA INICIAL DE XEL\n1. Elegir un producto con margen conocido y disponibilidad confirmada. 2. Crear una oferta sencilla para una franja de menor demanda. 3. Definir presupuesto máximo y duración de prueba. 4. Medir pedidos incrementales, margen después del descuento y costo por cliente nuevo. 5. Mantener o detener la campaña según resultados. No lanzar descuentos sobre productos sin validar costo y stock.\n\n";
 }
 if(/queja|reclamo|cliente|atencion|reseña|resena/.test(n)){
  out+="PROTOCOLO DE NANI\nEscuchar sin discutir, reconocer la experiencia, confirmar los hechos, ofrecer una solución autorizada y registrar el motivo para prevenir recurrencias. No compartir datos personales ni prometer compensaciones fuera de la política del restaurante.\n\n";
 }
 if(/pedido|cocina|operacion|demora|turno/.test(n)){
  out+="REVISIÓN DE KIKE\nPriorizar pedidos por hora prometida y tiempo restante, comunicar demoras con honestidad, verificar modificaciones/alergias antes de preparar y coordinar cocina con servicio. La maqueta no registra tiempos reales de preparación.\n\n";
 }
 const customMatches=found.filter(x=>x.e.customAnswer);
 if(customMatches.length){
  out+="CONOCIMIENTO APORTADO Y APROBADO POR EL PROPIETARIO\n"+customMatches.slice(0,2).map(x=>"• "+x.e.customAnswer+" (Fuente: "+x.e.source+")").join("\n")+"\n\n";
 }
 if(found.length){
  out+="REFERENCIAS DE LA BIBLIOTECA\n"+found.slice(0,3).map(x=>"• "+x.e.topic+" ("+x.e.category+" · "+x.e.agent+")").join("\n")+"\n\n";
  out+="La biblioteca orienta sobre procedimientos habituales; no sustituye datos actuales del restaurante ni normas locales aplicables.";
 } else {
  out+="Puedo ayudarte a analizar inventario, finanzas, ventas, marketing, pedidos, atención, personal, higiene y operación. Para una respuesta específica, dime el objetivo y los datos disponibles.";
 }
 out+="\n\nEstado: "+(team?"Coordinación de demostración; sin ejecución de acciones.":"Respuesta de conocimiento local; sin ejecución de acciones.");
 return out;
}
function handle(message,team){
 const reply=add(team?"Lucy está consultando la biblioteca y organizando el equipo…":"Lucy está buscando en ORVIA KNOWLEDGE…");
 setTimeout(()=>{reply.textContent=answer(message,team);},220);
}
$("#lucy-form")?.addEventListener("submit",e=>{
 e.preventDefault();e.stopImmediatePropagation();
 const input=$("#lucy-input"),message=input.value.trim();if(!message)return;
 add(message,"lucy-message user");input.value="";handle(message,false);
},true);
$("#team-orchestrate")?.addEventListener("click",e=>{
 e.preventDefault();e.stopImmediatePropagation();
 const input=$("#lucy-input"),message=input.value.trim();if(!message){input.focus();return;}
 add(message,"lucy-message user");input.value="";handle(message,true);
},true);
const badge=document.createElement("div");badge.className="knowledge-badge";badge.textContent=entries.length.toLocaleString("es-CO")+" preguntas e intenciones disponibles";$("#lucy-panel")?.append(badge);
window.ORVIA_KNOWLEDGE={count:entries.length,refreshUserKnowledge,search:(q)=>retrieve(q).slice(0,10).map(x=>({id:x.e.id,question:x.e.question,category:x.e.category,agent:x.e.agent,score:x.score})),answer};
})();
