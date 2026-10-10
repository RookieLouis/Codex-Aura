'use strict';
const { createHash } = require('node:crypto');

// Aura 1.0.6 renderer patch. All edits are staged by the installer, which owns
// backup, syntax validation, installation and restoration of the chunks.
const STORAGE_KEY = 'aura.codex.settings.v1';
const CHANGE_EVENT = 'aura-codex-settings-changed';
const MODELS = Object.freeze([
  { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
  { id: 'gpt-6-astra', label: 'GPT-6 Astra' },
]);
// Codex's visible slider has five stops. The bridge still accepts explicit
// legacy `max` requests; a saved UI `max` value uses the highest visible stop.
const EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'ultra']);
const DEFAULTS = Object.freeze({ codexModel: MODELS[0].id, codexReasoning: 'ultra' });
const COMPOSER_ANCHOR = '(0,a.jsx)(nV,{show:ea.showAdditionalOptions}),(0,a.jsx)("div",{className:"flex-1"})';
const COMPONENT_ANCHOR = 'sr=i.memo(function(e){';
const TRANSPORT_ANCHOR = 'r=(0,o._)((0,a._)({},r),{diagSendSource:p});';
const AGENT_ANCHOR = 'a.jL.getState().maxThinking?{maxThinking:!0}:{});return!function(e)';
const AGENT_RUNTIME_ANCHOR = '34599:(e,t,n)=>{';
const V1_RUNTIME_SHA256 = 'ecc9f3d0cec5f928ff5f3f8bd0a3f323227cb16bb58f8f9003b08d55b1c98e99';
const V1_COMPONENT_SHA256 = 'd951efeb35dde0d3a21e3d4a54d26650517ff441f55d2cf60050d3a107179fc8';
const sha256 = text => createHash('sha256').update(text).digest('hex');

function replaceOnce(text, before, after, label) {
  if (text.split(before).length !== 2) throw new Error(`${label}: expected one known renderer anchor; nothing installed`);
  return text.replace(before, after);
}

function legacyRuntime(text, marker) {
  if (text.split(marker).length !== 2) throw new Error('Codex settings legacy patch is incomplete or ambiguous');
  const start = text.indexOf(marker) + marker.length;
  const ending = '\n  return Object.assign({}, body, auraCodexSettingsRead());\n}\n';
  const end = text.indexOf(ending, start);
  if (end < 0) throw new Error('Codex settings legacy runtime is incomplete');
  const source = text.slice(start, end + ending.length);
  if (sha256(source) !== V1_RUNTIME_SHA256) throw new Error('Codex settings legacy runtime was modified; inspect before upgrading');
  return source;
}

function runtimeSource() {
  return `
function auraCodexSettingsNormalize(value) {
  value = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    codexModel: ["gpt-6.1-sol", "gpt-6-astra"].includes(value.codexModel) ? value.codexModel : "gpt-6.1-sol",
    codexReasoning: ["low", "medium", "high", "xhigh", "ultra"].includes(value.codexReasoning) ? value.codexReasoning : "ultra"
  };
}
function auraCodexSettingsRead() {
  try { if (window.__auraCodexSettingsV1 !== undefined) return auraCodexSettingsNormalize(window.__auraCodexSettingsV1); }
  catch (_) {}
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (raw) return auraCodexSettingsNormalize(JSON.parse(raw));
  } catch (_) {}
  try { return auraCodexSettingsNormalize(window.__auraCodexSettingsV1); }
  catch (_) { return auraCodexSettingsNormalize(null); }
}
function auraCodexSettingsEnrich(body) {
  if (!body || typeof body !== "object" || (body.model !== "Codex" && body.modelId !== "Codex")) return body;
  return Object.assign({}, body, auraCodexSettingsRead());
}
`;
}

function componentSource() {
  return `
function AuraCodexSettings(props) {
  var selectedModel = (0,c.jL)(state => {
    var thread = state.threadState[props.threadId];
    return thread && thread.selectedModel != null ? thread.selectedModel : state.model;
  });
  var pair = (0,i.useState)(auraCodexSettingsRead), settings = pair[0], setSettings = pair[1];
  var modelPair = (0,i.useState)(false), modelOpen = modelPair[0], setModelOpen = modelPair[1];
  var effortPair = (0,i.useState)(false), effortOpen = effortPair[0], setEffortOpen = effortPair[1];
  (0,i.useEffect)(() => {
    function changed(event) {
      if (event.type === "storage" && event.key !== ${JSON.stringify(STORAGE_KEY)} && event.key !== null) return;
      if (event.type === "storage") delete window.__auraCodexSettingsV1;
      setSettings(auraCodexSettingsRead());
    }
    window.addEventListener("storage", changed);
    window.addEventListener(${JSON.stringify(CHANGE_EVENT)}, changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(${JSON.stringify(CHANGE_EVENT)}, changed);
    };
  }, []);
  function save(changes) {
    var next = auraCodexSettingsNormalize(Object.assign({}, settings, changes));
    window.__auraCodexSettingsV1 = next;
    try { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(next)); } catch (_) {}
    setSettings(next);
    window.dispatchEvent(new Event(${JSON.stringify(CHANGE_EVENT)}));
  }
  if (selectedModel !== "Codex") return null;
  var models = ${JSON.stringify(MODELS)}, efforts = ${JSON.stringify(EFFORTS)};
  var labels = ["Low", "Medium", "High", "Extra High", "Ultra"];
  var index = efforts.indexOf(settings.codexReasoning);
  function position(stop) {
    var ratio = stop / (efforts.length - 1), offset = (0.5 - ratio) * 22;
    return "calc(" + (ratio * 100) + "% " + (offset < 0 ? "- " : "+ ") + Math.abs(offset) + "px)";
  }
  function updateEffort(event) {
    var next = Number(event.target.value);
    if (Number.isInteger(next) && next >= 0 && next < efforts.length) save({ codexReasoning: efforts[next] });
  }
  var fillPosition = position(index), isUltra = index === efforts.length - 1;
  var currentModel = models.find(model => model.id === settings.codexModel).label;
  var buttonClass = "flex items-center gap-1 text-xs font-medium h-6 px-2 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (0,a.jsxs)("div", {
    "data-testid": "codex-settings", className: "flex items-center gap-1 ml-1 shrink-0",
    children: [
      (0,a.jsx)("style", { children: ".aura-codex-effort-slider{-webkit-appearance:none;appearance:none;box-sizing:border-box;display:block;width:100%;height:18px;margin:0;padding:0;border:0;border-radius:999px;cursor:pointer}.aura-codex-effort-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:22px;height:22px;border-radius:50%;background:#fff;border:1px solid #ddd;box-shadow:0 1px 2px #0002}.aura-codex-effort-slider::-moz-range-thumb{box-sizing:border-box;width:22px;height:22px;border-radius:50%;background:#fff;border:1px solid #ddd;box-shadow:0 1px 2px #0002}.aura-codex-effort-slider:focus-visible{outline:2px solid #3b82f6;outline-offset:3px}" }),
      (0,a.jsxs)(rL.AM, { open: modelOpen, onOpenChange: setModelOpen, children: [
        (0,a.jsx)(rL.Wv, { asChild: true, children: (0,a.jsxs)("button", {
          type: "button", "data-testid": "codex-model-selector", "aria-label": "Codex model: " + currentModel,
          className: buttonClass, children: [currentModel, (0,a.jsx)(se.A, { className: "h-2 w-2 text-muted-foreground" })]
        }) }),
        (0,a.jsxs)(rL.hl, {
          side: "top", align: "start", sideOffset: 8, className: "w-[240px] p-2 bg-background",
          "data-testid": "codex-model-menu", children: [
            (0,a.jsx)("div", { className: "px-2 py-1 text-xs text-muted-foreground", children: "Select model" }),
            models.map(model => (0,a.jsxs)("button", {
              type: "button", "data-testid": "codex-model-" + model.id,
              "aria-pressed": settings.codexModel === model.id,
              className: "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " + (settings.codexModel === model.id ? "bg-accent" : ""),
              onClick: () => { save({ codexModel: model.id }); setModelOpen(false); },
              children: [model.label, settings.codexModel === model.id ? (0,a.jsx)("span", { "aria-hidden": true, children: "✓" }) : null]
            }, model.id))
          ]
        })
      ] }),
      (0,a.jsxs)(rL.AM, { open: effortOpen, onOpenChange: setEffortOpen, children: [
        (0,a.jsx)(rL.Wv, { asChild: true, children: (0,a.jsxs)("button", {
          type: "button", "data-testid": "codex-reasoning-selector", "aria-label": "Thinking effort: " + labels[index],
          className: buttonClass, children: [(0,a.jsx)("span", { "aria-hidden": true, children: "ϟ" }), labels[index]]
        }) }),
        (0,a.jsxs)(rL.hl, {
          side: "top", align: "start", sideOffset: 6, className: "bg-background",
          style: { width: "216px", maxWidth: "calc(100vw - 24px)", padding: "10px", boxSizing: "border-box", borderRadius: "12px" },
          "data-testid": "codex-reasoning-menu", children: [
            (0,a.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "16px 1fr 16px", alignItems: "start", gap: "4px" }, children: [
              (0,a.jsx)("span", { "aria-hidden": true, className: "text-muted-foreground", style: { fontSize: "14px", lineHeight: "18px" }, children: "ϟ" }),
              (0,a.jsxs)("div", { style: { textAlign: "center" }, children: [
                (0,a.jsx)("span", { "data-testid": "codex-reasoning-label", style: { display: "block", fontSize: "13px", lineHeight: "18px", fontWeight: 600, color: isUltra ? "#8b5cf6" : "#3b82f6" }, children: labels[index] }),
                (0,a.jsx)("span", { className: "text-muted-foreground", style: { display: "block", fontSize: "11px", lineHeight: "16px" }, children: currentModel })
              ] }),
              (0,a.jsx)("button", { type: "button", "data-testid": "codex-reasoning-reset", title: "Reset thinking effort to Ultra", "aria-label": "Reset thinking effort to Ultra",
                className: "rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                style: { width: "16px", height: "18px", fontSize: "14px", lineHeight: "18px" },
                onClick: () => save({ codexReasoning: "ultra" }), children: "↺" })
            ] }),
            (0,a.jsxs)("div", { style: { position: "relative", marginTop: "8px", height: "18px" }, children: [
              (0,a.jsx)("input", {
                type: "range", min: 0, max: efforts.length - 1, step: 1, value: index, className: "aura-codex-effort-slider",
                style: { "--aura-codex-fill": fillPosition, background: isUltra ? "linear-gradient(95deg,#4338ca,#a855f7)" : "linear-gradient(to right, #3b82f6 0%, #3b82f6 var(--aura-codex-fill), #e5e5e5 var(--aura-codex-fill), #e5e5e5 100%)" },
                "data-testid": "codex-reasoning-slider", "aria-label": "Thinking effort", "aria-valuetext": labels[index],
                onInput: updateEffort, onChange: updateEffort
              }),
              (0,a.jsx)("div", { "aria-hidden": true, "data-testid": "codex-reasoning-ticks", style: { pointerEvents: "none", position: "absolute", inset: "0" },
                children: efforts.map((effort, stop) => (0,a.jsx)("span", { style: { position: "absolute", top: "50%", left: position(stop), transform: "translate(-50%, -50%)", width: "3px", height: "3px", borderRadius: "50%", background: stop <= index ? "#ffffff80" : "#00000040" } }, effort)) })
            ] })
          ]
        })
      ] })
    ]
  });
}
`;
}

function buildComposer(text) {
  const marker = '/* AURA_CODEX_SETTINGS_UI_V2 */';
  const oldMarker = '/* AURA_CODEX_SETTINGS_UI_V1 */';
  const mounted = '(0,a.jsx)(nV,{show:ea.showAdditionalOptions}),(0,a.jsx)(AuraCodexSettings,{threadId:p}),(0,a.jsx)("div",{className:"flex-1"})';
  if (text.includes(marker)) {
    if (!text.includes(mounted) || !text.includes(runtimeSource()) || !text.includes(componentSource())) throw new Error('Codex settings UI patch is incomplete or from a different version');
    return text;
  }
  if (text.includes(oldMarker)) {
    const oldRuntime = legacyRuntime(text, oldMarker);
    const start = text.indexOf(oldMarker) + oldMarker.length + oldRuntime.length;
    const end = text.indexOf('var ' + COMPONENT_ANCHOR, start);
    const oldComponent = end < 0 ? '' : text.slice(start, end);
    if (sha256(oldComponent) !== V1_COMPONENT_SHA256 || text.split(mounted).length !== 2) {
      throw new Error('Codex settings legacy UI was modified or is incomplete; inspect before upgrading');
    }
    return replaceOnce(text, oldMarker + oldRuntime + oldComponent,
      marker + runtimeSource() + componentSource(), 'Codex settings compact UI upgrade');
  }
  text = replaceOnce(text, COMPONENT_ANCHOR,
    `AuraCodexSettingsRuntimeMarker=0;${marker}${runtimeSource()}${componentSource()}var ${COMPONENT_ANCHOR}`, 'Codex settings component');
  return replaceOnce(text, COMPOSER_ANCHOR, mounted, 'Codex settings placement');
}

function buildTransport(text) {
  const marker = '/* AURA_CODEX_SETTINGS_TRANSPORT_V2 */';
  const oldMarker = '/* AURA_CODEX_SETTINGS_TRANSPORT_V1 */';
  if (text.includes(marker)) {
    if (!text.includes(runtimeSource()) || !text.includes('r=auraCodexSettingsEnrich(r);' + TRANSPORT_ANCHOR)) throw new Error('Codex settings transport patch is incomplete');
    return text;
  }
  if (text.includes(oldMarker)) {
    if (text.split('r=auraCodexSettingsEnrich(r);' + TRANSPORT_ANCHOR).length !== 2) throw new Error('Codex settings legacy transport is incomplete');
    return replaceOnce(text, oldMarker + legacyRuntime(text, oldMarker), marker + runtimeSource(), 'Codex settings transport upgrade');
  }
  text = replaceOnce(text, 'function z(e){return(0,n._)(function*(e){', marker + runtimeSource() + 'function z(e){return(0,n._)(function*(e){', 'Codex settings transport runtime');
  return replaceOnce(text, TRANSPORT_ANCHOR, 'r=auraCodexSettingsEnrich(r);' + TRANSPORT_ANCHOR, 'Codex settings request fields');
}

function buildAgentTransport(text) {
  const marker = '/* AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V2 */';
  const oldMarker = '/* AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V1 */';
  const after = 'a.jL.getState().maxThinking?{maxThinking:!0}:{});t=auraCodexSettingsEnrich(t);return!function(e)';
  if (text.includes(marker)) {
    if (!text.includes(runtimeSource()) || !text.includes(after)) throw new Error('Codex settings agent transport patch is incomplete');
    return text;
  }
  if (text.includes(oldMarker)) {
    if (text.split(after).length !== 2) throw new Error('Codex settings legacy agent transport is incomplete');
    return replaceOnce(text, oldMarker + legacyRuntime(text, oldMarker), marker + runtimeSource(), 'Codex settings agent transport upgrade');
  }
  // Keep helpers within the native agent transport webpack module.
  text = replaceOnce(text, AGENT_RUNTIME_ANCHOR, AGENT_RUNTIME_ANCHOR + marker + runtimeSource(), 'Codex settings agent runtime');
  return replaceOnce(text, AGENT_ANCHOR, after, 'Codex settings agent request fields');
}

const FIXTURES = Object.freeze({
  composer: 'var n9=0,se=0,st=0,sr=i.memo(function(e){return null});function composer(){return [' + COMPOSER_ANCHOR + ']}',
  transport: 'function z(e){return(0,n._)(function*(e){var r=e.body,p="fixture";' + TRANSPORT_ANCHOR + 'return r}).apply(this,arguments)}',
  agentTransport: '"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1457],{34599:(e,t,n)=>{function transport(){var t=Object.assign({},' + AGENT_ANCHOR + '{return e}(t),t}}}]);',
});

module.exports = { STORAGE_KEY, CHANGE_EVENT, MODELS, EFFORTS, DEFAULTS,
  COMPOSER_ANCHOR, COMPONENT_ANCHOR, TRANSPORT_ANCHOR, AGENT_ANCHOR, AGENT_RUNTIME_ANCHOR, AGENT_TRANSPORT_ANCHOR: AGENT_ANCHOR, FIXTURES,
  runtimeSource, componentSource, buildComposer, buildSettingsUi: buildComposer, buildTransport, buildAgentTransport };
