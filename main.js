/* ===========================
   Sistema Autolavado v1.0.0-classic
   =========================== */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ------------ Constantes ------------ */
const APP_VERSION = "1.0.0-classic";
const DEFAULT_ADMIN_PIN = "1505";
const DEFAULT_EXCHANGE_RATE = 120;

/* metas por defecto */
let GOALS = {
  vehiculos: 10,
  usd: 100
};

/* ------------ Estado global ------------ */
let primaryColorPicker, backgroundColorPicker, textColorPicker,
    cardBgColorPicker, secondaryBgColorPicker,
    resetColorsBtn, toggleAutoBackup;

let firebaseApp, auth, db;
let user = null;
let userId = null;
let isAuthReady = false;

let uiMounted = false;
let turnoAbierto = null;

// Datos
let registroDiarioData = [];
let inventarioData = [];
let movimientosInv = [];
let gastosData = [];
let clientesData = [];
let turnosData = [];
let appLogs = [];

let contadorServicios = 0;
let currentExchangeRate = DEFAULT_EXCHANGE_RATE;
let ADMIN_PIN = DEFAULT_ADMIN_PIN;

let vehicleTypes = ["Carro", "Camioneta", "Camioneta Grande", "Moto"];
let serviceNames  = [
  "Lavado Basico","Lavado Chasis","Lavado de Motor",
  "Ducha Grafito 1lt","Ducha Grafito 2lt",
  "Ducha Marina 1lt","Ducha Marina 2lt"
];
let servicePriceList = []; // {vehicle, service, usd}

let isDarkModeEnabled = false;

/* Charts */
let charts = {
  ingresosSemana: null,
  servicios: null,
  productos: null,
  vehiculos: null
};

/* ------------ DOM refs ------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// login
let loginScreen, pinInput, loginBtn;
// app
let appContent, logoutBtn, toggleDarkModeConfig;
// tabs
let tabButtons = [];
let contentSections = {};
// registro
let regFechaInput, regClienteNombreInput, regVehiculoSelect, regModeloInput,
  regColorInput, regServicioSelect, regPropinasInput, regMetodoPagoSelect,
  regReferenciaInput, regMontoDolaresInput, regMontoBsInput,
  productosAdicionalesContainer, addProductoAdicionalBtn, saveRegistroBtn,
  filterClienteNombreInput, filterVehiculoSelect, filterModeloInput, tableRegistroBody;
// inventario
let invNombreInput, invCostoUInput, invEmpaquetadoInput, invDistribuidorInput,
  invFechaCompraInput, invCantidadCompradaInput, invPrecioVentaUSDInput,
  invMinStockInput, saveInventarioBtn, tableInventarioBody, tableMovInventarioBody;
// resumen
let resumenDiaVehiculos, resumenDiaUsd, resumenDiaBs, resumenDiaCostoProd,
  resumenDiaGastos, resumenDiaGanancia,
  resumenSemVehiculos, resumenSemUsd, resumenSemBs, resumenSemCostoProd, resumenSemGastos, resumenSemGanancia,
  resumenMesVehiculos, resumenMesUsd, resumenMesBs, resumenMesCostoProd, resumenMesGastos, resumenMesGanancia,resumenDiaPropinas, resumenSemanaPropinas, resumenMesPropinas,
  dailyGoalsWrapper;
// clientes
let clienteNombreInput, clienteTelefonoInput, clienteEmailInput, saveClienteBtn, tableClientesBody;
// config
let exchangeRateInput, goalVehiculosInput, goalUsdInput, saveConfigBtn,
  newVehicleTypeInput, addVehicleTypeBtn, vehicleTypeList,
  newServiceTypeNameInput, addServiceTypeNameBtn, serviceTypeNameList,
  servicePriceTableBody,
  currentPinInput, newPinInput, confirmNewPinInput, changePinBtn;
// caja/turnos
let turnoResponsableInput, turnoFondoInicialInput, turnoFondoInicialBsInput, abrirTurnoBtn,
  turnoEfectivoCierreInput, turnoEfectivoCierreBsInput, turnoObsCierreInput, cerrarTurnoBtn, tableTurnosBody;
// auditoría
let tableLogsBody;
// notifications
let notificationArea;
// modal
let customModal, modalTitle, modalMessage, modalPinInput, modalConfirmBtn, modalCancelBtn;

let currentModalCallback = null;
let currentModalCancelCallback = null;

/* ==== Personalización & Backup  ==== */
let customColors = {
  primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3b82f6',
  backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f5f6f8',
  textColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1f2937',
  cardBgColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#ffffff',
  secondaryBgColor: getComputedStyle(document.documentElement).getPropertyValue('--secondary-bg')?.trim() || '#e5e7eb'
};




let autoBackupEnabled = true;
let lastAutoDailyBackupDate = '';   // ISO string del último backup
/* =================================== */


/* ------------ INIT ------------ */
document.addEventListener("DOMContentLoaded", bootApp);

async function bootApp() {
  assignDOMElementsLoginOnly();
  bindLoginEvents();

  await initializeFirebase();

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user = u;
      userId = u.uid;
      isAuthReady = true;
    } else {
      await signInAnonymously(auth);
    }
  });
}

/* ------------ Firebase ------------ */
async function initializeFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBiSV5UpeCs7woZqJMSS4Gu45S9OJU9inw",
    authDomain: "orinocoapp-67c09.firebaseapp.com",
    projectId: "orinocoapp-67c09",
    storageBucket: "orinocoapp-67c09.firebasestorage.app",
    messagingSenderId: "147230038131",
    appId: "1:147230038131:web:2b6047e09e0408ef74f206",
    measurementId: "G-45RYRLGR66"
  };
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
}

/* ------------ Auth / Login ------------ */
function assignDOMElementsLoginOnly() {
  loginScreen = $("#loginScreen");
  pinInput = $("#pinInput");
  loginBtn = $("#loginBtn");
}
function bindLoginEvents() {
  loginBtn.addEventListener("click", onLoginClicked);
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onLoginClicked();
  });
}

async function onLoginClicked() {
  const pin = pinInput.value.trim();
  if (!pin) return;

  await loadAppConfig(); // cargar config (PIN, tasa, metas, etc.)

  if (pin !== ADMIN_PIN) {
    showCustomAlert("PIN incorrecto", "Error");
    return;
  }

  await signInAnonymously(auth);
  user = auth.currentUser;
  userId = user?.uid || null;
  isAuthReady = true;

  await enterApp();
  await logEvent("INFO", "Login correcto");
}

async function enterApp() {
  loginScreen.classList.add("hidden");
  appContent = $("#appContent");
  appContent.classList.remove("hidden");

  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      showTab(btn.dataset.tab);
    });
  });

  assignDOMElementsApp();
  bindAppEvents();

  uiMounted = true;

  await setupListeners();
  applyDarkMode();
  ensurePricesMatrix();
  renderAll();
  showDailyNotificationsIfNeeded();

  // ✅ Mostrar la pestaña por defecto (solo una vez)
  showTab("registro");
}



/* ------------ DOM APP ------------ */
function assignDOMElementsApp() {
  logoutBtn = $("#logoutBtn");
  toggleDarkModeConfig = $("#toggleDarkModeConfig");
  tabButtons = [...document.querySelectorAll(".tab-button")];


  tabButtons = [...$$(".tab-button")];
  contentSections = {
    registro: $("#contentRegistro"),
    inventario: $("#contentInventario"),
    clientes: $("#contentClientes"),
    config: $("#contentConfig"),
    caja: $("#contentCaja"),
    auditoria: $("#contentAuditoria")
  };

  // Registro
  regFechaInput = $("#regFechaInput");
  regClienteNombreInput = $("#regClienteNombreInput");
  regVehiculoSelect = $("#regVehiculoSelect");
  regModeloInput = $("#regModeloInput");
  regColorInput = $("#regColorInput");
  regServicioSelect = $("#regServicioSelect");
  regPropinasInput = $("#regPropinasInput");
  regMetodoPagoSelect = $("#regMetodoPagoSelect");
  regReferenciaInput = $("#regReferenciaInput");
  regMontoDolaresInput = $("#regMontoDolaresInput");
  regMontoBsInput = $("#regMontoBsInput");
  productosAdicionalesContainer = $("#productosAdicionalesContainer");
  addProductoAdicionalBtn = $("#addProductoAdicionalBtn");
  saveRegistroBtn = $("#saveRegistroBtn");

  filterClienteNombreInput = $("#filterClienteNombreInput");
  filterVehiculoSelect = $("#filterVehiculoSelect");
  filterModeloInput = $("#filterModeloInput");
  tableRegistroBody = $("#tableRegistroBody");

  // Inventario
  invNombreInput = $("#invNombreInput");
  invCostoUInput = $("#invCostoUInput");
  invEmpaquetadoInput = $("#invEmpaquetadoInput");
  invDistribuidorInput = $("#invDistribuidorInput");
  invFechaCompraInput = $("#invFechaCompraInput");
  invCantidadCompradaInput = $("#invCantidadCompradaInput");
  invPrecioVentaUSDInput = $("#invPrecioVentaUSDInput");
  invMinStockInput = $("#invMinStockInput");
  saveInventarioBtn = $("#saveInventarioBtn");
  tableInventarioBody = $("#tableInventarioBody");
  tableMovInventarioBody = $("#tableMovInventarioBody");

  // Resumen
  resumenDiaVehiculos = $("#resumenDiaVehiculos");
  resumenDiaUsd = $("#resumenDiaUsd");
  resumenDiaBs = $("#resumenDiaBs");
  resumenDiaCostoProd = $("#resumenDiaCostoProd");
  resumenDiaGastos = $("#resumenDiaGastos");
  resumenDiaGanancia = $("#resumenDiaGanancia");
  resumenDiaPropinas = $("#resumenDiaPropinas");

  resumenSemVehiculos = $("#resumenSemVehiculos");
  resumenSemUsd = $("#resumenSemUsd");
  resumenSemBs = $("#resumenSemBs");
  resumenSemCostoProd = $("#resumenSemCostoProd");
  resumenSemGastos = $("#resumenSemGastos");
  resumenSemGanancia = $("#resumenSemGanancia");
  resumenSemanaPropinas = $("#resumenSemanaPropinas");


  resumenMesVehiculos = $("#resumenMesVehiculos");
  resumenMesUsd = $("#resumenMesUsd");
  resumenMesBs = $("#resumenMesBs");
  resumenMesCostoProd = $("#resumenMesCostoProd");
  resumenMesGastos = $("#resumenMesGastos");
  resumenMesGanancia = $("#resumenMesGanancia");
  resumenMesPropinas = $("#resumenMesPropinas");

  dailyGoalsWrapper = $("#dailyGoalsWrapper");

  // Clientes
  clienteNombreInput = $("#clienteNombreInput");
  clienteTelefonoInput = $("#clienteTelefonoInput");
  clienteEmailInput = $("#clienteEmailInput");
  saveClienteBtn = $("#saveClienteBtn");
  tableClientesBody = $("#tableClientesBody");

  // Config (preferencias)
  exchangeRateInput = $("#exchangeRateInput");
  goalVehiculosInput = $("#goalVehiculosInput");
  goalUsdInput = $("#goalUsdInput");
  saveConfigBtn = $("#saveConfigBtn");

  // Config (PIN)
  currentPinInput = $("#currentPinInput");
  newPinInput = $("#newPinInput");
  confirmNewPinInput = $("#confirmNewPinInput");
  changePinBtn = $("#changePinBtn");

  // Config (listas)
  newVehicleTypeInput = $("#newVehicleTypeInput");
  addVehicleTypeBtn = $("#addVehicleTypeBtn");
  vehicleTypeList = $("#vehicleTypeList");

  newServiceTypeNameInput = $("#newServiceTypeNameInput");
  addServiceTypeNameBtn = $("#addServiceTypeNameBtn");
  serviceTypeNameList = $("#serviceTypeNameList");

  servicePriceTableBody = $("#servicePriceTableBody");

  // Caja / Turnos
  turnoResponsableInput = $("#turnoResponsableInput");
  turnoFondoInicialInput = $("#turnoFondoInicialInput");
  turnoFondoInicialBsInput = $("#turnoFondoInicialBsInput");
  abrirTurnoBtn = $("#abrirTurnoBtn");

  turnoEfectivoCierreInput = $("#turnoEfectivoCierreInput");
  turnoEfectivoCierreBsInput = $("#turnoEfectivoCierreBsInput");
  turnoObsCierreInput = $("#turnoObsCierreInput");
  cerrarTurnoBtn = $("#cerrarTurnoBtn");
  tableTurnosBody = $("#tableTurnosBody");

  // Auditoría
  tableLogsBody = $("#tableLogsBody");

  // Notif
  notificationArea = $("#notificationArea");

  // Modal
  customModal = $("#customModal");
  modalTitle = $("#modalTitle");
  modalMessage = $("#modalMessage");
  modalPinInput = $("#modalPinInput");
  modalConfirmBtn = $("#modalConfirmBtn");
  modalCancelBtn = $("#modalCancelBtn");

  // color picker
primaryColorPicker      = $("#primaryColorPicker");
backgroundColorPicker   = $("#backgroundColorPicker");
textColorPicker         = $("#textColorPicker");
cardBgColorPicker       = $("#cardBgColorPicker");
secondaryBgColorPicker  = $("#secondaryBgColorPicker");
resetColorsBtn          = $("#resetColorsBtn");
toggleAutoBackup        = $("#toggleAutoBackup");

}

function onColorChanged() {
  if (primaryColorPicker)     customColors.primaryColor     = primaryColorPicker.value;
  if (backgroundColorPicker)  customColors.backgroundColor  = backgroundColorPicker.value;
  if (textColorPicker)        customColors.textColor        = textColorPicker.value;
  if (cardBgColorPicker)      customColors.cardBgColor      = cardBgColorPicker.value;
  if (secondaryBgColorPicker) customColors.secondaryBgColor = secondaryBgColorPicker.value;

  applyCustomColors();
  saveConfigToFirestoreBasic();
}

function bindAppEvents() {

  // tabs
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      showTab(btn.dataset.tab);
    });
  });


  // logout
  logoutBtn.addEventListener("click", () => location.reload());

  // dark (config)
  toggleDarkModeConfig.addEventListener("change", onToggleDarkConfig);

  // Registro
  addProductoAdicionalBtn.addEventListener("click", addProductoAdicionalRow);
  [
    regVehiculoSelect, regServicioSelect, regPropinasInput
  ].forEach(el => el.addEventListener("input", updateServiceAmounts));
  saveRegistroBtn.addEventListener("click", onSaveRegistro);

  // filtros registro
  [filterClienteNombreInput, filterVehiculoSelect, filterModeloInput]
    .forEach(el => el.addEventListener("input", renderRegistroDiario));

  // Inventario
  saveInventarioBtn.addEventListener("click", onSaveInventario);

  // Clientes
  saveClienteBtn.addEventListener("click", onSaveCliente);

  // Config
  saveConfigBtn.addEventListener("click", onSaveConfig);
  changePinBtn.addEventListener("click", onChangePin);
  addVehicleTypeBtn.addEventListener("click", onAddVehicleType);
  addServiceTypeNameBtn.addEventListener("click", onAddServiceTypeName);

  // Caja / Turnos
  abrirTurnoBtn.addEventListener("click", onAbrirTurno);
  cerrarTurnoBtn.addEventListener("click", onCerrarTurno);

  // Modal
  modalConfirmBtn.addEventListener("click", handleModalConfirm);
  modalCancelBtn.addEventListener("click", handleModalCancel);

	//color picker
if (primaryColorPicker)  primaryColorPicker.addEventListener("input", onColorChanged);
/* …los otros 4 pickers… */
if (resetColorsBtn)      resetColorsBtn.addEventListener("click", resetColorsToDefault);
if (toggleAutoBackup)    toggleAutoBackup.addEventListener("change", e => {
  autoBackupEnabled = !!e.target.checked;
  saveConfigToFirestoreBasic();
});
if (backgroundColorPicker)  backgroundColorPicker.addEventListener("input", onColorChanged);
if (textColorPicker)        textColorPicker.addEventListener("input", onColorChanged);
if (cardBgColorPicker)      cardBgColorPicker.addEventListener("input", onColorChanged);
if (secondaryBgColorPicker) secondaryBgColorPicker.addEventListener("input", onColorChanged);

}

/* ------------ Tabs ------------ */
function showTab(tabName) {
  for (const [name, section] of Object.entries(contentSections)) {
    if (section) {
      if (name === tabName) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    }
  }

  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  if (tabName === "caja") {
  renderCharts();
  }
}


/* ------------ Listeners Firestore ------------ */
async function setupListeners() {
  onSnapshot(collection(db, "registroDiario"), snap => {
    registroDiarioData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });

  onSnapshot(collection(db, "inventario"), snap => {
    inventarioData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });

  onSnapshot(collection(db, "movimientosInventario"), snap => {
    movimientosInv = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  });

  onSnapshot(collection(db, "gastos"), snap => {
    gastosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderResumen();
  });

  onSnapshot(collection(db, "clientes"), snap => {
    clientesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientes();
  });

  onSnapshot(collection(db, "turnos"), snap => {
    turnosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    turnoAbierto = turnosData.find(t => t.estado === "abierto") || null;
    renderTurnos();
  });

  onSnapshot(collection(db, "appLogs"), snap => {
    appLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLogs();
  });

  await loadAppConfig();
}

/* ------------ Config ------------ */
async function loadAppConfig() {
  try {
    const docRef = doc(db, "config", "appConfig");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cfg = snap.data();
      contadorServicios = cfg.contadorServicios ?? 0;
      currentExchangeRate = cfg.currentExchangeRate ?? DEFAULT_EXCHANGE_RATE;
      ADMIN_PIN = cfg.ADMIN_PIN ?? DEFAULT_ADMIN_PIN;
      vehicleTypes   = cfg.vehicleTypes ?? vehicleTypes;
      serviceNames   = cfg.serviceNames ?? serviceNames;
      servicePriceList = cfg.servicePriceList ?? [];
      isDarkModeEnabled = cfg.isDarkModeEnabled ?? false;
      GOALS.vehiculos = cfg.goalVehiculos ?? GOALS.vehiculos;
      GOALS.usd       = cfg.goalUsd ?? GOALS.usd;
	customColors = cfg.customColors ?? customColors;
	autoBackupEnabled = cfg.autoBackupEnabled ?? true;
	lastAutoDailyBackupDate = cfg.lastAutoDailyBackupDate ?? '';

    } else {
      await setDoc(docRef, {
        contadorServicios,
        currentExchangeRate,
        ADMIN_PIN,
        vehicleTypes,
        serviceNames,
        servicePriceList,
        isDarkModeEnabled,
        goalVehiculos: GOALS.vehiculos,
        goalUsd: GOALS.usd
      });
    }
  } catch (e) {
    console.error("Error loading config", e);
  }
}

async function onSaveConfig() {
  const pin = await promptForPin("Introduce PIN para guardar configuración:");
  if (!pin) return;
  if (pin !== ADMIN_PIN) {
    showCustomAlert("PIN incorrecto.", "Error");
    return;
  }

  try {
    currentExchangeRate = parseFloat(exchangeRateInput.value) || DEFAULT_EXCHANGE_RATE;

    GOALS.vehiculos = parseInt(goalVehiculosInput.value) || 10;
    GOALS.usd = parseFloat(goalUsdInput.value) || 100;

    const docRef = doc(db, "config", "appConfig");
    await setDoc(docRef, {
      contadorServicios,
      currentExchangeRate,
      ADMIN_PIN,
      vehicleTypes,
      serviceNames,
      servicePriceList,
      isDarkModeEnabled,
      goalVehiculos: GOALS.vehiculos,
      goalUsd: GOALS.usd
    });

    await logEvent("INFO", "Configuración guardada");
    showCustomAlert("Configuración guardada", "OK");
  } catch (e) {
    console.error("save config", e);
    showCustomAlert("Error guardando configuración", "Error");
  }
}

async function onChangePin() {
  const oldPin = currentPinInput.value.trim();
  const newPin = newPinInput.value.trim();
  const confPin = confirmNewPinInput.value.trim();

  if (!oldPin || !newPin || !confPin) {
    showCustomAlert("Completa todos los campos del PIN.", "Error");
    return;
  }
  if (oldPin !== ADMIN_PIN) {
    showCustomAlert("PIN actual incorrecto.", "Error");
    return;
  }
  if (newPin !== confPin) {
    showCustomAlert("Los PINs nuevos no coinciden.", "Error");
    return;
  }

  ADMIN_PIN = newPin;
  await saveConfigToFirestoreBasic();
  await logEvent("INFO", "PIN cambiado");
  currentPinInput.value = newPinInput.value = confirmNewPinInput.value = "";
  showCustomAlert("PIN actualizado correctamente.", "OK");
}

function ensurePricesMatrix() {
  let changed = false;
  vehicleTypes.forEach(v => {
    serviceNames.forEach(s => {
      if (!servicePriceList.find(p => p.vehicle === v && p.service === s)) {
        servicePriceList.push({ vehicle: v, service: s, usd: 0 });
        changed = true;
      }
    });
  });
  if (changed) saveConfigToFirestoreBasic();
}
async function updateConfig(data) {
  const configRef = doc(db, "config", "general");
  try {
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      await updateDoc(configRef, data);
    } else {
      await setDoc(configRef, data);  // 🔄 esto crea el documento si no existe
    }
  } catch (err) {
    console.error("Error al actualizar config general:", err);
  }
}


/* ------------ Render All ------------ */
function renderAll() {
  if (!uiMounted) return;

  populateVehicleSelects();
  populateServiceSelect();
  loadProductOptions();
  renderRegistroDiario();
  renderInventario();
  renderMovimientosInventario();
  renderResumen();
  renderConfigLists();
  renderTurnos();
  renderLogs();
  applyDarkMode();
  applyCustomColors();
  runDailyAutoBackupIfNeeded();
}

/* ------------ Vehículos / Servicios ------------ */
function populateVehicleSelects() {
  if (!regVehiculoSelect || !filterVehiculoSelect) return;
  regVehiculoSelect.innerHTML = '<option value="">Seleccione</option>';
  filterVehiculoSelect.innerHTML = '<option value="">Todos los Vehículos</option>';
  vehicleTypes.forEach(v => {
    const opt1 = document.createElement('option');
    opt1.value = opt1.textContent = v;
    regVehiculoSelect.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = opt2.textContent = v;
    filterVehiculoSelect.appendChild(opt2);
  });
}

function populateServiceSelect() {
  if (!regServicioSelect) return;
  regServicioSelect.innerHTML = '<option value="">Seleccione</option><option value="Solo Venta de Productos">Solo Venta de Productos</option>';
  serviceNames.forEach(s => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = s;
    regServicioSelect.appendChild(opt);
  });
}

function loadProductOptions() {
  if (!productosAdicionalesContainer) return;
  productosAdicionalesContainer.querySelectorAll('.product-select').forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">Ninguno</option>';
    inventarioData
      .filter(p => (p.cantidadActual || 0) > 0)
      .forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.nombre;
        opt.textContent = item.nombre;
        select.appendChild(opt);
      });
    select.value = current;
  });
}

function addProductoAdicionalRow() {
  const row = document.createElement('div');
  row.className = 'form-row';
  row.innerHTML = `
    <div>
      <select class="product-select"></select>
    </div>
    <div>
      <input type="number" class="product-quantity" value="1" min="1" step="1">
    </div>
    <div style="display:flex;align-items:center;">
      <button type="button" class="btn btn-danger btn-sm btn-remove-prod">x</button>
    </div>
  `;
  productosAdicionalesContainer.appendChild(row);
  loadProductOptions();

  row.querySelector('.product-select').addEventListener("input", updateServiceAmounts);
  row.querySelector('.product-quantity').addEventListener("input", updateServiceAmounts);
  row.querySelector('.btn-remove-prod').addEventListener("click", () => {
    row.remove();
    updateServiceAmounts();
  });
}

function updateServiceAmounts() {
  if (!uiMounted) return;

  const vehiculo = regVehiculoSelect.value;
  const servicio = regServicioSelect.value;
  const propinas = parseFloat(regPropinasInput.value) || 0;

  let baseUsdPrice = 0;
  if (servicio && servicio !== "Solo Venta de Productos") {
    const entry = servicePriceList.find(p => p.vehicle === vehiculo && p.service === servicio);
    if (entry) baseUsdPrice = entry.usd;
  }

  let totalProducts = 0;
  productosAdicionalesContainer.querySelectorAll('.form-row').forEach(r => {
    const name = r.querySelector('.product-select').value;
    const qty = parseFloat(r.querySelector('.product-quantity').value) || 0;
    if (name && qty > 0) {
      const invItem = inventarioData.find(p => p.nombre === name);
      if (invItem) totalProducts += (invItem.precioVenta?.usd || 0) * qty;
    }
  });

  const totalUsd = baseUsdPrice + totalProducts + propinas;
  const totalBs = totalUsd * currentExchangeRate;

  regMontoDolaresInput.value = formatUSD(totalUsd);
  regMontoBsInput.value = formatBs(totalBs);
}

/* ------------ Guardar registro ------------ */
async function onSaveRegistro() {
  if (!turnoAbierto) {
    showCustomAlert("Debes abrir un turno antes de registrar servicios o ventas.", "Acción no permitida");
    return;
  }

  const fecha = regFechaInput.value || new Date().toISOString().split("T")[0];
  const clienteNombre = regClienteNombreInput.value.trim();
  const vehiculo = regVehiculoSelect.value;
  const modelo = regModeloInput.value.trim();
  const color = regColorInput.value.trim();
  const servicio = regServicioSelect.value;
  const metodoPago = regMetodoPagoSelect.value;
  const propinas = parseFloat(regPropinasInput.value) || 0;
  const referencia = regReferenciaInput.value.trim();

  const totalUsd = parseFloat(cleanMoney(regMontoDolaresInput.value)) || 0;
  const totalBs  = parseFloat(cleanMoney(regMontoBsInput.value)) || 0;

  let productosAdicionales = [];
  let costoTotalProductosAdicionalesUSD = 0;
  productosAdicionalesContainer.querySelectorAll('.form-row').forEach(r => {
    const name = r.querySelector('.product-select').value;
    const qty = parseFloat(r.querySelector('.product-quantity').value) || 0;
    if (name && qty > 0) {
      const invItem = inventarioData.find(p => p.nombre === name);
      const price = invItem?.precioVenta?.usd || 0;
      const costU = invItem?.costoU || 0;
      productosAdicionales.push({ nombre: name, cantidad: qty, costo: price * qty, costUnit: costU });
      costoTotalProductosAdicionalesUSD += price * qty;
    }
  });

  contadorServicios++;

  const newRow = {
    contador: contadorServicios,
    fecha,
    clienteNombre, vehiculo, modelo, color,
    servicio,
    productosAdicionales,
    costoTotalProductosAdicionalesUSD,
    propinas,
    metodoPago,
    montoBs: totalBs,
    montoDolares: totalUsd,
    referencia,
    createdAt: serverTimestamp(),
    turnoId: turnoAbierto?.id || null
  };

  try {
    await addDoc(collection(db, "registroDiario"), newRow);

    // Descontar stock
    for (const p of productosAdicionales) {
      const invItem = inventarioData.find(i => i.nombre === p.nombre);
      if (invItem) {
        const newQty = (invItem.cantidadActual || 0) - p.cantidad;
        await updateDoc(doc(db, "inventario", invItem.id), {
          cantidadActual: newQty < 0 ? 0 : newQty,
          valorInventario: (newQty < 0 ? 0 : newQty) * (invItem.precioVenta?.usd || 0)
        });
        await addDoc(collection(db, "movimientosInventario"), {
          fecha: new Date().toISOString().split("T")[0],
          tipo: "salida",
          producto: invItem.nombre,
          cantidad: p.cantidad,
          costoU: invItem.costoU || 0,
          totalUSD: (invItem.costoU || 0) * p.cantidad,
          motivo: "Venta como producto adicional",
          userAgent: navigator.userAgent,
          createdAt: serverTimestamp()
        });
      }
    }

    await saveConfigToFirestoreBasic(); // contador
    await logEvent("INFO", `Registro guardado (${servicio})`);
    resetRegistroForm();
    showCustomAlert("Registro guardado correctamente.", "OK");
  } catch (e) {
    console.error(e);
    showCustomAlert("Error guardando registro.", "Error");
  }
}

function resetRegistroForm() {
  regFechaInput.value = new Date().toISOString().split("T")[0];
  regClienteNombreInput.value = "";
  regVehiculoSelect.value = "";
  regModeloInput.value = "";
  regColorInput.value = "";
  regServicioSelect.value = "";
  regPropinasInput.value = "0";
  regReferenciaInput.value = "";
  productosAdicionalesContainer.innerHTML = "";
  regMontoDolaresInput.value = formatUSD(0);
  regMontoBsInput.value = formatBs(0);
}

/* ------------ Tabla registro diario ------------ */
function renderRegistroDiario() {
  if (!uiMounted || !tableRegistroBody) return;
  tableRegistroBody.innerHTML = '';

  const fCliente = filterClienteNombreInput.value.toLowerCase();
  const fVehiculo = filterVehiculoSelect.value.toLowerCase();
  const fModelo = filterModeloInput.value.toLowerCase();

  const filtered = registroDiarioData.filter(item => {
    const matchesCliente = !fCliente || (item.clienteNombre || '').toLowerCase().includes(fCliente);
    const matchesVehiculo = !fVehiculo || (item.vehiculo || '').toLowerCase() === fVehiculo;
    const matchesModelo = !fModelo || (item.modelo || '').toLowerCase().includes(fModelo);
    return matchesCliente && matchesVehiculo && matchesModelo;
  }).sort((a,b) => {
    const da = new Date(a.fecha);
    const db = new Date(b.fecha);
    if (da > db) return -1;
    if (da < db) return 1;
    return a.contador - b.contador;
  });

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.contador ?? ''}</td>
      <td>${item.fecha ?? ''}</td>
      <td>${item.clienteNombre || 'N/A'}</td>
      <td>${item.vehiculo || 'N/A'}</td>
      <td>${item.modelo || 'N/A'}</td>
      <td>${item.servicio || ''}</td>
      <td style="white-space:pre-wrap">${(item.productosAdicionales || []).map(p => `${p.nombre} (${p.cantidad})`).join(', ') || 'N/A'}</td>
      <td>${formatUSD(item.propinas || 0)}</td>
      <td>${item.metodoPago || ''}</td>
      <td>${formatBs(item.montoBs || 0)}</td>
      <td>${formatUSD(item.montoDolares || 0)}</td>
      <td>${item.referencia || ''}</td>
      <td><button class="btn btn-danger btn-sm">Eliminar</button></td>
    `;
    const delBtn = tr.querySelector(".btn-danger");
    delBtn.addEventListener("click", () => {
      confirmWithPin(async () => {
        await deleteDoc(doc(db, "registroDiario", item.id));
        await logEvent("WARN", `Registro eliminado (${item.servicio || ''})`);
        showCustomAlert("Registro eliminado.", "OK");
      });
    });
    tableRegistroBody.appendChild(tr);
  });
}

/* ------------ Inventario ------------ */
async function onSaveInventario() {
  const nombre = invNombreInput.value.trim();
  const costoU = parseFloat(invCostoUInput.value) || 0;
  const empaquetado = parseInt(invEmpaquetadoInput.value) || 1;
  const distribuidor = invDistribuidorInput.value.trim();
  const fechaCompra = invFechaCompraInput.value || new Date().toISOString().split("T")[0];
  const cantidadComprada = parseInt(invCantidadCompradaInput.value) || 0;
  const precioVentaUSD = parseFloat(invPrecioVentaUSDInput.value) || 0;
  const stockMin = parseInt(invMinStockInput.value) || 0;

  if (!nombre || cantidadComprada <= 0) {
    showCustomAlert("Nombre y cantidad deben ser válidos", "Error");
    return;
  }

  const existing = inventarioData.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());
  const valorTotalUSD = cantidadComprada * costoU;

  try {
    if (existing) {
      const newQty = (existing.cantidadActual || 0) + cantidadComprada;
      await updateDoc(doc(db, "inventario", existing.id), {
        costoU,
        empaquetado,
        distribuidor,
        fechaCompra,
        cantidadComprada,               // última compra
        costoTotalCompra: valorTotalUSD, // última compra
        precioVenta: { usd: precioVentaUSD, bs: precioVentaUSD * currentExchangeRate },
        cantidadActual: newQty,
        valorInventario: newQty * precioVentaUSD,
        minStock: stockMin
      });

    } else {
      await addDoc(collection(db, "inventario"), {
        nombre,
        costoU,
        empaquetado,
        distribuidor,
        fechaCompra,
        cantidadComprada,
        costoTotalCompra: valorTotalUSD,
        precioVenta: { usd: precioVentaUSD, bs: precioVentaUSD * currentExchangeRate },
        cantidadActual: cantidadComprada,
        valorInventario: cantidadComprada * precioVentaUSD,
        minStock: stockMin
      });
    }

    // Movimiento (entrada)
    await addDoc(collection(db, "movimientosInventario"), {
      fecha: fechaCompra,
      tipo: "entrada",
      producto: nombre,
      cantidad: cantidadComprada,
      costoU: costoU,
      totalUSD: valorTotalUSD,
      motivo: existing ? "Reabastecimiento" : "Alta de producto",
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp()
    });

    // Gasto auto
    await addDoc(collection(db, "gastos"), {
      fecha: fechaCompra,
      descripcion: `Compra producto: ${nombre}`,
      monto: valorTotalUSD,
      categoria: "Inventario",
      createdAt: serverTimestamp()
    });

    await logEvent("INFO", `Inventario actualizado (${nombre})`);

    showCustomAlert("Inventario actualizado.", "OK");
    resetInventarioForm();
  } catch (e) {
    console.error(e);
    showCustomAlert("Error guardando inventario.", "Error");
  }
}

function resetInventarioForm() {
  invNombreInput.value = "";
  invCostoUInput.value = "0";
  invEmpaquetadoInput.value = "1";
  invDistribuidorInput.value = "";
  invFechaCompraInput.value = "";
  invCantidadCompradaInput.value = "0";
  invPrecioVentaUSDInput.value = "0";
  invMinStockInput.value = "0";
}

function renderInventario() {
  if (!uiMounted || !tableInventarioBody) return;
  tableInventarioBody.innerHTML = '';

  inventarioData.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${formatUSD(item.costoU || 0)}</td>
      <td>${item.empaquetado || 1}</td>
      <td>${item.distribuidor || ''}</td>
      <td>${item.fechaCompra || ''}</td>
      <td>${item.cantidadComprada || 0}</td>
      <td>${formatUSD(item.costoTotalCompra || 0)}</td>
      <td>${formatUSD(item.precioVenta?.usd || 0)}</td>
      <td>${formatBs((item.precioVenta?.usd || 0) * currentExchangeRate)}</td>
      <td style="${(item.cantidadActual || 0) <= (item.minStock || 0) ? 'color:red;font-weight:bold;':''}">${item.cantidadActual || 0}</td>
      <td>${formatUSD(item.valorInventario || 0)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-light btn-sm btn-reab">Reabastecer</button>
          <button class="btn btn-danger btn-sm btn-del">Eliminar</button>
        </div>
      </td>
    `;
    const btnReab = tr.querySelector(".btn-reab");
    const btnDel = tr.querySelector(".btn-del");

    btnReab.addEventListener("click", () => openQuickReabastecer(item));
    btnDel.addEventListener("click", () => {
      confirmWithPin(async () => {
        await deleteDoc(doc(db, "inventario", item.id));
        await logEvent("WARN", `Producto eliminado (${item.nombre})`);
        showCustomAlert("Eliminado", "OK");
      });
    });

    tableInventarioBody.appendChild(tr);
  });
}

function renderMovimientosInventario() {
  if (!uiMounted || !tableMovInventarioBody) return;
  tableMovInventarioBody.innerHTML = '';
  const sorted = [...movimientosInv].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  sorted.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.fecha || ''}</td>
      <td>${m.tipo || ''}</td>
      <td>${m.producto || ''}</td>
      <td>${m.cantidad || 0}</td>
      <td>${formatUSD(m.costoU || 0)}</td>
      <td>${formatUSD(m.totalUSD || 0)}</td>
      <td>${m.motivo || ''}</td>
      <td>${m.userAgent || ''}</td>
    `;
    tableMovInventarioBody.appendChild(tr);
  });
}

function openQuickReabastecer(item) {
  showModalFormReab(item);
}

/* ------------ Resumen / Metas ------------ */
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function renderResumen() {
  if (!uiMounted) return;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentWeek = getWeekNumber(today);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let dVeh=0,dUsd=0,dBs=0,dProd=0,dGast=0, dProp=0;
  let wVeh=0,wUsd=0,wBs=0,wProd=0,wGast=0, wProp=0;
  let mVeh=0,mUsd=0,mBs=0,mProd=0,mGast=0, mProp=0;

  registroDiarioData.forEach(r => {
    const rDate = new Date(r.fecha);
    const w = getWeekNumber(rDate);
    const m = rDate.getMonth();
    const y = rDate.getFullYear();

    const tip = r.propinas || 0;

    // Diario
    if (r.fecha === todayStr) {
      if (r.servicio !== "Solo Venta de Productos") dVeh++;
      dUsd  += r.montoDolares || 0;
      dBs   += r.montoBs || 0;
      dProd += r.costoTotalProductosAdicionalesUSD || 0;
      dProp += tip;
    }
    // Semanal
    if (w === currentWeek && y === currentYear) {
      if (r.servicio !== "Solo Venta de Productos") wVeh++;
      wUsd  += r.montoDolares || 0;
      wBs   += r.montoBs || 0;
      wProd += r.costoTotalProductosAdicionalesUSD || 0;
      wProp += tip;
    }
    // Mensual
    if (m === currentMonth && y === currentYear) {
      if (r.servicio !== "Solo Venta de Productos") mVeh++;
      mUsd  += r.montoDolares || 0;
      mBs   += r.montoBs || 0;
      mProd += r.costoTotalProductosAdicionalesUSD || 0;
      mProp += tip;
    }
  });

  gastosData.forEach(g => {
    const gDate = new Date(g.fecha);
    const gw = getWeekNumber(gDate);
    const gm = gDate.getMonth();
    const gy = gDate.getFullYear();

    if (g.fecha === todayStr) dGast += g.monto || 0;
    if (gw === currentWeek && gy === currentYear) wGast += g.monto || 0;
    if (gm === currentMonth && gy === currentYear) mGast += g.monto || 0;
  });

  const dGan = dUsd - dProd;
  const wGan = wUsd - wProd;
  const mGan = mUsd - mProd;

  // ---- Diario
  resumenDiaVehiculos.textContent = dVeh;
  resumenDiaUsd.textContent       = formatUSD(dUsd);
  resumenDiaBs.textContent        = formatBs(dBs);
  resumenDiaCostoProd.textContent = formatUSD(dProd);
  resumenDiaGastos.textContent    = formatUSD(dGast);
  resumenDiaGanancia.textContent  = formatUSD(dGan);
  if (resumenDiaPropinas) resumenDiaPropinas.textContent = formatUSD(dProp);

  // ---- Semanal
  resumenSemVehiculos.textContent = wVeh;
  resumenSemUsd.textContent       = formatUSD(wUsd);
  resumenSemBs.textContent        = formatBs(wBs);
  resumenSemCostoProd.textContent = formatUSD(wProd);
  resumenSemGastos.textContent    = formatUSD(wGast);
  resumenSemGanancia.textContent  = formatUSD(wGan);
  if (resumenSemanaPropinas) resumenSemanaPropinas.textContent = formatUSD(wProp);

  // ---- Mensual
  resumenMesVehiculos.textContent = mVeh;
  resumenMesUsd.textContent       = formatUSD(mUsd);
  resumenMesBs.textContent        = formatBs(mBs);
  resumenMesCostoProd.textContent = formatUSD(mProd);
  resumenMesGastos.textContent    = formatUSD(mGast);
  resumenMesGanancia.textContent  = formatUSD(mGan);
  if (resumenMesPropinas) resumenMesPropinas.textContent = formatUSD(mProp);

  renderDailyGoals({ vehiculos: dVeh, usd: dUsd });
  renderTablaGastosDelDia();
}


function renderDailyGoals(data) {
  if (!dailyGoalsWrapper) return;
  dailyGoalsWrapper.innerHTML = `
    <div style="margin-bottom:.5rem;">
      <strong>Meta vehículos:</strong> ${data.vehiculos} / ${GOALS.vehiculos}
      ${progressBar(data.vehiculos / GOALS.vehiculos)}
    </div>
    <div>
      <strong>Meta USD:</strong> ${formatUSD(data.usd)} / ${formatUSD(GOALS.usd)}
      ${progressBar(data.usd / GOALS.usd)}
    </div>
  `;
}

function progressBar(ratio) {
  const pct = Math.min(100, Math.round((ratio || 0) * 100));
  return `
    <div style="background:#e5e7eb;border-radius:4px;height:8px;margin-top:.25rem;">
      <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:4px;"></div>
    </div>
  `;
}

/* ------------ Charts (en Resumen) ------------ */
function renderCharts() {
  const w = $("#chartIngresosSemana").getContext('2d');
  const s = $("#chartServicios").getContext('2d');
  const p = $("#chartProductos").getContext('2d');
  const v = $("#chartVehiculos").getContext('2d');

  const days = ["L","M","X","J","V","S","D"];
  const weekVals = [0,0,0,0,0,0,0];

  const servicesMap = {};
  const productsMap = {};
  const vehiclesMap = {};

  registroDiarioData.forEach(r => {
    const d = new Date(r.fecha).getDay(); // 0 dom..6 sab
    const idx = (d === 0) ? 6 : d-1;
    weekVals[idx] += r.montoDolares || 0;

    const sname = r.servicio || '';
    servicesMap[sname] = (servicesMap[sname] || 0) + 1;

    (r.productosAdicionales||[]).forEach(p => {
      productsMap[p.nombre] = (productsMap[p.nombre] || 0) + p.cantidad;
    });

    const vname = r.vehiculo || '';
    vehiclesMap[vname] = (vehiclesMap[vname] || 0) + 1;
  });

  const servLabels = Object.keys(servicesMap);
  const servVals   = servLabels.map(k => servicesMap[k]);

  const prodLabels = Object.keys(productsMap);
  const prodVals   = prodLabels.map(k => productsMap[k]);

  const vehLabels  = Object.keys(vehiclesMap);
  const vehVals    = vehLabels.map(k => vehiclesMap[k]);

  Object.keys(charts).forEach(k => {
    if (charts[k]) charts[k].destroy();
  });

  charts.ingresosSemana = new Chart(w, {
    type:'bar',
    data:{labels:days, datasets:[{label:'USD', data:weekVals}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  charts.servicios = new Chart(s, {
    type:'bar',
    data:{labels:servLabels, datasets:[{label:'Cantidad', data:servVals}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  charts.productos = new Chart(p, {
    type:'bar',
    data:{labels:prodLabels, datasets:[{label:'Cantidad', data:prodVals}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  charts.vehiculos = new Chart(v, {
    type:'bar',
    data:{labels:vehLabels, datasets:[{label:'Cantidad', data:vehVals}]},
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });
}

/* ------------ Clientes ------------ */
async function onSaveCliente() {
  const nombre = clienteNombreInput.value.trim();
  const telefono = clienteTelefonoInput.value.trim();
  const email = clienteEmailInput.value.trim();
  if (!nombre) {
    showCustomAlert("Nombre requerido", "Error");
    return;
  }
  try {
    await addDoc(collection(db, "clientes"), {
      nombre, telefono, email, createdAt: serverTimestamp()
    });
    await logEvent("INFO", `Cliente agregado (${nombre})`);
    clienteNombreInput.value = "";
    clienteTelefonoInput.value = "";
    clienteEmailInput.value = "";
    showCustomAlert("Cliente guardado", "OK");
  } catch (e) {
    console.error(e);
    showCustomAlert("Error guardando cliente", "Error");
  }
}

function renderClientes() {
  if (!uiMounted || !tableClientesBody) return;
  tableClientesBody.innerHTML = '';
  clientesData.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nombre || ''}</td>
      <td>${c.telefono || ''}</td>
      <td>${c.email || ''}</td>
      <td><button class="btn btn-danger btn-sm">Eliminar</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => {
      confirmWithPin(async () => {
        await deleteDoc(doc(db, "clientes", c.id));
        await logEvent("WARN", `Cliente eliminado (${c.nombre})`);
        showCustomAlert("Cliente eliminado", "OK");
      });
    });
    tableClientesBody.appendChild(tr);
  });
}

/* ------------ Config listas/precios ------------ */
function renderConfigLists() {
  if (!uiMounted) return;

primaryColorPicker.value    = customColors.primaryColor;
backgroundColorPicker.value = customColors.backgroundColor;
textColorPicker.value       = customColors.textColor;
toggleAutoBackup.checked    = !!autoBackupEnabled;


  // dark
  toggleDarkModeConfig.checked = !!isDarkModeEnabled;

  // exchange, metas
  exchangeRateInput.value = currentExchangeRate;
  goalVehiculosInput.value = GOALS.vehiculos;
  goalUsdInput.value = GOALS.usd;

  // vehicles
  vehicleTypeList.innerHTML = '';
  vehicleTypes.forEach((v, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${v}</span>
      <button class="btn btn-danger btn-sm">Eliminar</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      confirmWithPin(async () => {
        vehicleTypes.splice(idx, 1);
        servicePriceList = servicePriceList.filter(p => p.vehicle !== v);
        await saveConfigToFirestoreBasic();
        renderAll();
      });
    });
    vehicleTypeList.appendChild(li);
  });

  // services
  serviceTypeNameList.innerHTML = '';
  serviceNames.forEach((s, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${s}</span>
      <button class="btn btn-danger btn-sm">Eliminar</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      confirmWithPin(async () => {
        serviceNames.splice(idx,1);
        servicePriceList = servicePriceList.filter(p => p.service !== s);
        await saveConfigToFirestoreBasic();
        renderAll();
      });
    });
    serviceTypeNameList.appendChild(li);
  });

  // prices
  servicePriceTableBody.innerHTML = '';
  servicePriceList.forEach((pr, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${pr.vehicle}</td>
      <td>${pr.service}</td>
      <td>
        <input type="number" step="0.01" value="${pr.usd?.toFixed(2) || 0}" class="price-input">
      </td>
      <td>
        <button class="btn btn-danger btn-sm">Eliminar</button>
      </td>
    `;
    const input = tr.querySelector(".price-input");
    input.addEventListener("change", async (e) => {
      pr.usd = parseFloat(e.target.value) || 0;
      await saveConfigToFirestoreBasic();
      showCustomAlert("Precio actualizado", "OK");
    });
    tr.querySelector(".btn-danger").addEventListener("click", async () => {
      confirmWithPin(async () => {
        servicePriceList.splice(idx,1);
        await saveConfigToFirestoreBasic();
        renderAll();
      });
    });
    servicePriceTableBody.appendChild(tr);
  });
}

async function onAddVehicleType() {
  const v = newVehicleTypeInput.value.trim();
  if (!v) return;
  vehicleTypes.push(v);
  newVehicleTypeInput.value = "";
  ensurePricesMatrix();
  await saveConfigToFirestoreBasic();
  await logEvent("INFO", `Tipo de vehículo agregado (${v})`);
  renderAll();
}

async function onAddServiceTypeName() {
  const s = newServiceTypeNameInput.value.trim();
  if (!s) return;
  serviceNames.push(s);
  newServiceTypeNameInput.value = "";
  ensurePricesMatrix();
  await saveConfigToFirestoreBasic();
  await logEvent("INFO", `Servicio agregado (${s})`);
  renderAll();
}

async function saveConfigToFirestoreBasic() {
  await setDoc(doc(db, "config", "appConfig"), {
    contadorServicios,
    currentExchangeRate,
    ADMIN_PIN,
    vehicleTypes,
    serviceNames,
    servicePriceList,
    isDarkModeEnabled,
    goalVehiculos: GOALS.vehiculos,
    goalUsd: GOALS.usd,
customColors,
  autoBackupEnabled,
  lastAutoDailyBackupDate
  });
}

/* ------------ Turnos ------------ */
async function onAbrirTurno() {
  if (turnoAbierto) {
    showCustomAlert("Ya hay un turno abierto.", "Aviso");
    return;
  }
  const responsable = turnoResponsableInput.value.trim();
  const fondo = parseFloat(turnoFondoInicialInput.value) || 0;
  const fondoBs = parseFloat(turnoFondoInicialBsInput.value) || 0;
  if (!responsable) {
    showCustomAlert("Responsable requerido", "Error");
    return;
  }
  try {
    await addDoc(collection(db, "turnos"), {
      apertura: serverTimestamp(),
      cierre: null,
      responsable,
      fondoInicial: fondo,
      fondoInicialBs: fondoBs,
      efectivoCierre: null,
      efectivoCierreBs: null,
      observaciones: "",
      estado: "abierto"
    });
    await logEvent("INFO", `Turno abierto por ${responsable}`);
    showCustomAlert("Turno abierto", "OK");
    turnoResponsableInput.value = "";
    turnoFondoInicialInput.value = "0";
    turnoFondoInicialBsInput.value = "0";
  } catch (e) {
    console.error(e);
    showCustomAlert("Error abriendo turno", "Error");
  }
}



async function onCerrarTurno() {
  if (!turnoAbierto) {
    showCustomAlert("No hay turno abierto.", "Aviso");
    return;
  }
  const efectivo = parseFloat(turnoEfectivoCierreInput.value) || 0;
  const efectivoBs = parseFloat(turnoEfectivoCierreBsInput.value) || 0;
  const obs = turnoObsCierreInput.value.trim();

  try {
    const ref = doc(db, "turnos", turnoAbierto.id);
    const propinasTurno = sumPropinasTurno(turnoAbierto);
    await updateDoc(ref, {
      cierre: serverTimestamp(),
      efectivoCierre: efectivo,
      efectivoCierreBs: efectivoBs,
      observaciones: obs,
      estado: "cerrado",
      propinasUsd: propinasTurno
    });
    await logEvent("INFO", `Turno cerrado (${turnoAbierto.responsable})`);
    showCustomAlert("Turno cerrado", "OK");
    turnoAbierto = null;
    turnoEfectivoCierreInput.value = "0";
    turnoEfectivoCierreBsInput.value = "0";
    turnoObsCierreInput.value = "";
  } catch (e) {
    console.error(e);
    showCustomAlert("Error cerrando turno", "Error");
  }
}

/* HOTFIX 2025-07-25: calcular propinas de un turno (entre apertura y cierre) */
function sumPropinasTurno(turno) {
  if (!turno || !turno.apertura) return 0;

  const startMs =
    turno.apertura.seconds
      ? turno.apertura.seconds * 1000
      : new Date(turno.apertura).getTime();

  // cuando cerramos el turno todavía no tiene cierre en el doc
  const endMs =
    turno.cierre && turno.cierre.seconds
      ? turno.cierre.seconds * 1000
      : Date.now();

  let total = 0;
  registroDiarioData.forEach(r => {
    // preferimos createdAt; si no existe, usamos la fecha del registro
    let created = null;
    if (r.createdAt && r.createdAt.seconds) {
      created = r.createdAt.seconds * 1000;
    } else if (r.fecha) {
      created = new Date(r.fecha + "T00:00:00").getTime();
    }
    if (!created) return;
    if (created >= startMs && created <= endMs) {
      total += (r.propinas || 0);
    }
  });

  return total;
}

function renderTurnos() {
  if (!uiMounted || !tableTurnosBody) return;
  tableTurnosBody.innerHTML = '';
  const sorted = [...turnosData].sort((a,b) => (b.apertura?.seconds||0) - (a.apertura?.seconds||0));
  sorted.forEach(t => {
    const ap = t.apertura?.seconds ? new Date(t.apertura.seconds*1000).toISOString().replace('T',' ').substring(0,16) : '';
    const ci = t.cierre?.seconds ? new Date(t.cierre.seconds*1000).toISOString().replace('T',' ').substring(0,16) : '';
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ap}</td>
      <td>${ci || '-'}</td>
      <td>${t.responsable || ''}</td>
      <td>${formatUSD(t.fondoInicial || 0)}</td>
      <td>${formatBs(t.fondoInicialBs || 0)}</td>
      <td>${t.efectivoCierre != null ? formatUSD(t.efectivoCierre) : '-'}</td>
      <td>${t.efectivoCierreBs != null ? formatBs(t.efectivoCierreBs) : '-'}</td>
      <td>${(t.observaciones || "")}${t.propinasUsd != null ? ` • Propinas: ${formatUSD(t.propinasUsd)}` : ""}</td>
      <td>${t.estado}</td>
    `;
    tableTurnosBody.appendChild(tr);
  });
}

/* ------------ Auditoría ------------ */
function renderLogs() {
  if (!uiMounted || !tableLogsBody) return;
  tableLogsBody.innerHTML = '';
  const sorted = [...appLogs].sort((a,b) => new Date(b.timestamp||b.createdAt) - new Date(a.timestamp||a.createdAt));
  sorted.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.timestamp || ''}</td>
      <td>${l.level || 'INFO'}</td>
      <td>${l.message || ''}</td>
      <td>${l.userAgent || ''}</td>
    `;
    tableLogsBody.appendChild(tr);
  });
}

async function logEvent(level, message) {
  try {
    await addDoc(collection(db, "appLogs"), {
      timestamp: new Date().toISOString(),
      level, message,
      userId: userId || 'anonymous',
      userAgent: navigator.userAgent,
      appVersion: APP_VERSION
    });
  } catch(e){
    console.error("logEvent error", e);
  }
}

/* ------------ Modal helpers ------------ */
function showCustomAlert(message, title="Información") {
  if (!customModal) return alert(message);
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalPinInput.classList.add("hidden");
  modalCancelBtn.classList.add("hidden");
  modalConfirmBtn.textContent = "Aceptar";
  currentModalCallback = () => hideCustomModal();
  currentModalCancelCallback = null;
  customModal.classList.remove("hidden");
}
function showCustomConfirm(message, title="Confirmar", onConfirm, onCancel) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalPinInput.classList.add("hidden");
  modalCancelBtn.classList.remove("hidden");
  modalConfirmBtn.textContent = "Confirmar";
  currentModalCallback = () => { hideCustomModal(); onConfirm && onConfirm(); };
  currentModalCancelCallback = () => { hideCustomModal(); onCancel && onCancel(); };
  customModal.classList.remove("hidden");
}
function promptForPin(message) {
  return new Promise(resolve => {
    modalTitle.textContent = "PIN requerido";
    modalMessage.textContent = message || "Introduce el PIN";
    modalPinInput.value = "";
    modalPinInput.classList.remove("hidden");
    modalCancelBtn.classList.remove("hidden");
    modalConfirmBtn.textContent = "Verificar";

    currentModalCallback = () => {
      const val = modalPinInput.value.trim();
      hideCustomModal();
      resolve(val);
    };
    currentModalCancelCallback = () => {
      hideCustomModal();
      resolve(null);
    };
    customModal.classList.remove("hidden");
  });
}
function confirmWithPin(onConfirm) {
  promptForPin("Introduce el PIN de seguridad:").then(pin => {
    if (pin !== ADMIN_PIN) {
      showCustomAlert("PIN incorrecto", "Error");
      return;
    }
    onConfirm && onConfirm();
  });
}
function handleModalConfirm() {
  if (currentModalCallback) currentModalCallback();
  else hideCustomModal();
}
function handleModalCancel() {
  if (currentModalCancelCallback) currentModalCancelCallback();
  else hideCustomModal();
}
function hideCustomModal() {
  customModal.classList.add("hidden");
  modalPinInput.classList.add("hidden");
  modalCancelBtn.classList.add("hidden");
  modalTitle.textContent = "";
  modalMessage.textContent = "";
  modalPinInput.value = "";
  currentModalCallback = null;
  currentModalCancelCallback = null;
}

/* ------------ Notificaciones ------------ */
function showDailyNotificationsIfNeeded() {
  if (!uiMounted) return;
  renderNotifications();
}
function renderNotifications() {
  if (!uiMounted) return;
  notificationArea.innerHTML = '';
  let count = 0;
  inventarioData.forEach(i => {
    const actual = i.cantidadActual || 0;
    const min = i.minStock || 0;
    if (actual <= min) {
      const div = document.createElement("div");
      div.className = "notification";
      div.innerHTML = `
        ⚠️ Stock bajo: "${i.nombre}" (${actual} / min ${min})
        <button class="close">x</button>
      `;
      div.querySelector(".close").addEventListener("click", () => div.remove());
      notificationArea.appendChild(div);
      count++;
    }
  });
  notificationArea.classList.toggle("hidden", count === 0);
}

/* ------------ Dark mode ------------ */
function onToggleDarkConfig(e) {
  isDarkModeEnabled = e.target.checked;
  applyDarkMode();
  saveConfigToFirestoreBasic();
}
function applyDarkMode() {
  const enable = !!isDarkModeEnabled;
  document.documentElement.classList.toggle("dark", enable);
  document.body.classList.toggle("dark", enable); // NUEVO: necesario para que estilos a nivel de body funcionen
  if (toggleDarkModeConfig) toggleDarkModeConfig.checked = enable;
}

/* ---------- Colores ---------- */
function applyCustomColors() {
  const r = document.documentElement;

  // Este sí se mantiene siempre
  r.style.setProperty('--primary', customColors.primaryColor, 'important');

  if (!document.documentElement.classList.contains("dark")) {
    r.style.setProperty('--bg', customColors.backgroundColor);
    r.style.setProperty('--text', customColors.textColor);

    const cardColor = customColors.cardBgColor || shadeColor(customColors.backgroundColor, -5);
    const secondaryColor = customColors.secondaryBgColor || shadeColor(customColors.backgroundColor, 5);
    r.style.setProperty('--card', cardColor);
    r.style.setProperty('--secondary-bg', secondaryColor);
  } else {
    r.style.removeProperty('--bg');
    r.style.removeProperty('--text');
    r.style.removeProperty('--card');
    r.style.removeProperty('--secondary-bg');
  }
}



function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  const RR = R.toString(16).padStart(2, '0');
  const GG = G.toString(16).padStart(2, '0');
  const BB = B.toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

function resetColorsToDefault() {
  customColors = {
    primaryColor: '#3b82f6',
    backgroundColor: '#f5f6f8',
    textColor: '#1f2937',
cardBgColor: '#ffffff',
  secondaryBgColor: '#e5e7eb'
  };
if (cardBgColorPicker)      cardBgColorPicker.value      = customColors.cardBgColor;
if (secondaryBgColorPicker) secondaryBgColorPicker.value = customColors.secondaryBgColor;

  primaryColorPicker.value    = customColors.primaryColor;
  backgroundColorPicker.value = customColors.backgroundColor;
  textColorPicker.value       = customColors.textColor;
  applyCustomColors();
  saveConfigToFirestoreBasic();
}
/* ---------- Backup ---------- */
async function runDailyAutoBackupIfNeeded() {
  if (!autoBackupEnabled) return;

  const today = new Date().toISOString().split("T")[0];
  if (lastAutoDailyBackupDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const resumen = getSummaryDataForDate(yesterday);

  const registros = registroDiarioData.filter(r => r.fecha === yesterday);
  const movimientos = movimientosInv.filter(m => m.fecha === yesterday);
  const gastos = gastosData.filter(g => g.fecha === yesterday);

  const fullBackup = {
    fecha: yesterday,
    resumen,
    registros,
    movimientosInventario: movimientos,
    gastos
  };

  try {
    await setDoc(doc(db, "resumenDiarioBackup", yesterday), fullBackup);
    lastAutoDailyBackupDate = today;
    await updateConfig({ lastAutoDailyBackupDate: today });
    console.log("✅ Backup completo del día guardado:", fullBackup);
  } catch (err) {
    console.error("❌ Error al guardar backup diario:", err);
  }
}


function getSummaryDataForDate(dateStr) {
  const registros = registroDiarioData.filter(r => r.fecha === dateStr);

  let totalVehiculos = 0;
  let totalUsd = 0;
  let totalBs = 0;
  let totalProd = 0;
  let totalProp = 0;

  registros.forEach(r => {
    if (r.servicio !== "Solo Venta de Productos") totalVehiculos++;
    totalUsd += r.montoDolares || 0;
    totalBs += r.montoBs || 0;
    totalProd += r.costoTotalProductosAdicionalesUSD || 0;
    totalProp += r.propinas || 0;
  });

  const gastos = gastosData.filter(g => g.fecha === dateStr);
  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
  const gananciaBruta = totalUsd - totalProd;

  return {
    fecha: dateStr,
    totalVehiculos,
    totalUsd,
    totalBs,
    totalProd,
    totalGastos,
    gananciaBruta,
    totalPropinas: totalProp
  };
}

/* ------------ Helpers ------------ */
function cleanMoney(txt) {
  if (!txt) return "0";
  return (""+txt).replace(/[^\d.,-]/g, "").replace(",", ".");
}
function formatUSD(n) {
  return new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(n||0);
}
function formatBs(n) {
  return new Intl.NumberFormat('es-VE', {style:'currency', currency:'VES'}).format(n||0);
}

/* ------------ Modal Reabastecer rápido ------------ */
function showModalFormReab(item) {
  const html = `
    <div style="display:flex;flex-direction:column;gap:.5rem;">
      <label>Cantidad comprada</label>
      <input id="reabQty" type="number" value="1" />

      <label>Costo U (USD)</label>
      <input id="reabCosto" type="number" value="${item.costoU || 0}" step="0.01" />

      <label>Precio venta USD (opcional)</label>
      <input id="reabPrice" type="number" value="${item.precioVenta?.usd || 0}" step="0.01" />

      <label>Fecha compra</label>
      <input id="reabFecha" type="date" value="${new Date().toISOString().split("T")[0]}" />

      <label>Distribuidor</label>
      <input id="reabDist" type="text" value="${item.distribuidor || ''}" />

      <label>Motivo</label>
      <input id="reabMotivo" type="text" value="Reabastecimiento" />
    </div>
  `;

  modalTitle.textContent = `Reabastecer: ${item.nombre}`;
  modalMessage.innerHTML = html;
  modalPinInput.classList.add("hidden");
  modalCancelBtn.classList.remove("hidden");
  modalConfirmBtn.textContent = "Guardar";

  currentModalCallback = async () => {
    const qty = parseInt($("#reabQty").value) || 0;
    const costoU = parseFloat($("#reabCosto").value) || 0;
    const price = parseFloat($("#reabPrice").value) || 0;
    const fecha = $("#reabFecha").value || new Date().toISOString().split("T")[0];
    const dist = $("#reabDist").value || '';
    const motivo = $("#reabMotivo").value || 'Reabastecimiento';

    hideCustomModal();

    if (qty <= 0) {
      showCustomAlert("Cantidad debe ser > 0", "Error");
      return;
    }
    const valorTotalUSD = qty * costoU;
    try {
      const newQty = (item.cantidadActual || 0) + qty;
      const pv = price || (item.precioVenta?.usd || 0);
      await updateDoc(doc(db, "inventario", item.id), {
        costoU,
        distribuidor: dist,
        fechaCompra: fecha,
        cantidadComprada: qty,
        costoTotalCompra: valorTotalUSD,
        precioVenta: { usd: pv, bs: pv * currentExchangeRate },
        cantidadActual: newQty,
        valorInventario: newQty * pv
      });

      await addDoc(collection(db, "movimientosInventario"), {
        fecha,
        tipo: "entrada",
        producto: item.nombre,
        cantidad: qty,
        costoU,
        totalUSD: valorTotalUSD,
        motivo,
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "gastos"), {
        fecha,
        descripcion: `Compra producto: ${item.nombre}`,
        monto: valorTotalUSD,
        categoria: "Inventario",
        createdAt: serverTimestamp()
      });

      await logEvent("INFO", `Reabastecido (${item.nombre}) x${qty}`);

      showCustomAlert("Reabastecimiento guardado", "OK");
    } catch (e) {
      console.error(e);
      showCustomAlert("Error en reabastecer", "Error");
    }
  };

  currentModalCancelCallback = () => hideCustomModal();

  customModal.classList.remove("hidden");
}
async function onAgregarGasto() {
  const descripcion = document.getElementById("gastoDescripcion").value.trim();
  const monto = parseFloat(document.getElementById("gastoMonto").value);
  const fecha = document.getElementById("gastoFecha").value || new Date().toISOString().split("T")[0];

  if (!descripcion || isNaN(monto) || monto <= 0) {
    alert("Completa una descripción válida y un monto mayor a cero.");
    return;
  }

  const nuevoGasto = {
    descripcion,
    monto,
    fecha,
    timestamp: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, "gastos"), nuevoGasto);
    nuevoGasto.id = docRef.id;
    if (!gastosData.some(g => g.id === docRef.id)) {
  gastosData.push(nuevoGasto);
  }
    renderResumen();
    renderTablaGastosDelDia();
 // solo si tienes función para mostrar gastos
    showCustomAlert("Gasto registrado correctamente.", "OK");
  } catch (err) {
    console.error("Error al registrar gasto:", err);
    showCustomAlert("Error al guardar el gasto", "Error");

  }

  document.getElementById("gastoDescripcion").value = "";
  document.getElementById("gastoMonto").value = "";
  document.getElementById("gastoFecha").value = "";
}
function renderTablaGastosDelDia() {
  const tbody = document.getElementById("tablaGastosBody");
  if (!tbody) return;

  const hoy = new Date().toISOString().split("T")[0];
  const gastosHoy = gastosData.filter(g => g.fecha === hoy).sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);


  if (gastosHoy.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted)">Sin gastos registrados hoy</td></tr>`;
    return;
  }

  tbody.innerHTML = gastosHoy.map(gasto => `
    <tr>
      <td>${gasto.descripcion}</td>
      <td>$${gasto.monto.toFixed(2)}</td>
      <td>${gasto.fecha}</td>
      <td>
      <td style="text-align: right;">
      <button class="btn btn-small" onclick="onEditarGasto('${gasto.id}')">Editar</button>
      <button class="btn btn-small btn-danger" onclick="onEliminarGasto('${gasto.id}')">Eliminar</button>
      </td>
      </td>
    </tr>
  `).join("");
}
async function onEditarGasto(id) {
  const gasto = gastosData.find(g => g.id === id);
  if (!gasto) return alert("Gasto no encontrado.");

  const pin = prompt("🔐 Ingresa el PIN de administrador:");
  if (pin !== ADMIN_PIN) return alert("PIN incorrecto.");

  const nuevaDescripcion = prompt("Editar descripción:", gasto.descripcion);
  if (!nuevaDescripcion) return;

  const nuevoMonto = parseFloat(prompt("Editar monto (USD):", gasto.monto));
  if (isNaN(nuevoMonto) || nuevoMonto <= 0) return;

  try {
    await updateDoc(doc(db, "gastos", id), {
      descripcion: nuevaDescripcion,
      monto: nuevoMonto
    });

    gasto.descripcion = nuevaDescripcion;
    gasto.monto = nuevoMonto;
    renderTablaGastosDelDia();
    renderResumen();
  } catch (err) {
    console.error("Error al editar gasto:", err);
    alert("Error al editar el gasto.");
  }
}
async function onEliminarGasto(id) {
  const gasto = gastosData.find(g => g.id === id);
  if (!gasto) return alert("Gasto no encontrado.");

  const pin = prompt("🔐 Ingresa el PIN de administrador para eliminar:");
  if (pin !== ADMIN_PIN) return alert("PIN incorrecto.");

  const confirmar = confirm(`¿Eliminar el gasto "${gasto.descripcion}" por $${gasto.monto}?`);
  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "gastos", id));
    gastosData = gastosData.filter(g => g.id !== id);
    renderTablaGastosDelDia();
    renderResumen();
  } catch (err) {
    console.error("Error al eliminar gasto:", err);
    alert("Error al eliminar el gasto.");
  }
}
window.onAgregarGasto = onAgregarGasto;
window.onEditarGasto = onEditarGasto;
window.onEliminarGasto = onEliminarGasto;

if (window.innerWidth <= 768) {
  document.body.classList.add("mobile");
}
