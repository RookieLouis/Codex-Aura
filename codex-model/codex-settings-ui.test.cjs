'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ui = require('./codex-settings-ui.cjs');

function plain(value) { return JSON.parse(JSON.stringify(value)); }
function runtime(initial, options = {}) {
  const saved = new Map(initial ? [[ui.STORAGE_KEY, initial]] : []);
  const listeners = new Map();
  const context = vm.createContext({
    Event: function Event(type) { this.type = type; },
    window: {
      addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
      removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
      dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); },
    },
    localStorage: {
      getItem(key) { if (options.readFails) throw new Error('storage unavailable'); return saved.get(key) ?? null; },
      setItem(key, value) { if (options.writeFails) throw new Error('storage quota'); saved.set(key, value); },
    },
  });
  vm.runInContext(ui.runtimeSource(), context);
  return { context, saved, listeners, read: () => plain(context.auraCodexSettingsRead()),
    enrich: body => context.auraCodexSettingsEnrich(body) };
}

function component(initial, options = {}) {
  const fixture = runtime(initial, options);
  const state = { model: 'Codex', threadState: {} };
  const hooks = [];
  let cursor = 0;
  Object.assign(fixture.context, {
    c: { jL: selector => selector(state) },
    i: {
      useState(initializer) {
        const index = cursor++;
        if (!Object.hasOwn(hooks, index)) hooks[index] = typeof initializer === 'function' ? initializer() : initializer;
        return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; }];
      },
      useEffect(callback) { const index = cursor++; if (!Object.hasOwn(hooks, index)) hooks[index] = callback(); },
    },
    a: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    se: { A: 'chevron' },
    rL: { AM: 'popover', Wv: 'trigger', hl: 'popover-content' },
  });
  vm.runInContext(ui.componentSource(), fixture.context);
  function render() { cursor = 0; return fixture.context.AuraCodexSettings({ threadId: 'thread' }); }
  function pathTo(id) {
    function walk(value, ancestors = []) {
      if (!value || typeof value !== 'object') return null;
      if (Array.isArray(value)) { for (const node of value) { const found = walk(node, ancestors); if (found) return found; } return null; }
      const path = [...ancestors, value];
      if (value.props?.['data-testid'] === id) return path;
      return walk(value.props?.children, path);
    }
    const found = walk(render());
    assert.ok(found, `Missing rendered control ${id}`);
    return found;
  }
  function find(id) { return pathTo(id).at(-1); }
  function popoverFor(id) { return pathTo(id).slice(0, -1).reverse().find(node => node.type === 'popover'); }
  return { ...fixture, state, hooks, render, find, pathTo, popoverFor };
}

test('new and malformed settings use Sol / Ultra and unsupported values never reach the bridge', () => {
  for (const initial of [undefined, 'invalid json', 'null', '[]', JSON.stringify({ codexModel: 'other', codexReasoning: 'minimal' })]) {
    assert.deepEqual(runtime(initial).read(), ui.DEFAULTS);
  }
  const existing = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'xhigh', arbitrary: 'ignored' }));
  assert.deepEqual(existing.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'xhigh', codexFast: false });
  const legacyMax = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'max' }));
  assert.deepEqual(legacyMax.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'ultra', codexFast: false });
});

test('Fast mode accepts only an explicit boolean true and defaults old settings to off', () => {
  for (const value of [undefined, false, null, 0, 1, '', 'true', {}, []]) {
    const fixture = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: value }));
    assert.deepEqual(fixture.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: false });
  }
  const fixture = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: true }));
  assert.deepEqual(fixture.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: true });
});

test('request enrichment copies only explicit Codex bodies and leaves other transports unchanged', () => {
  const fixture = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'low' }));
  for (const body of [{ model: 'Auto' }, { model: 'DeepSeek Harness' }, {}, null, 'Codex']) assert.equal(fixture.enrich(body), body);
  for (const body of [{ model: 'Codex', messages: ['hello'] }, { modelId: 'Codex' }]) {
    const result = fixture.enrich(body);
    assert.notEqual(result, body);
    assert.equal(Object.hasOwn(body, 'codexModel'), false);
    assert.deepEqual(plain(result), { ...body, codexModel: 'gpt-6-astra', codexReasoning: 'low', codexFast: false });
  }
});

test('composer offers exactly the two requested models and displays default Ultra', () => {
  const fixture = component();
  assert.equal(fixture.find('codex-model-selector').props['aria-label'], 'Codex model: GPT-6.1 Sol');
  assert.equal(fixture.find('codex-reasoning-label').props.children, 'Ultra');
  const buttons = fixture.find('codex-model-menu').props.children[1];
  assert.deepEqual(plain(buttons.map(button => button.props.children[0])), ['GPT-6.1 Sol', 'GPT-6 Astra']);
  assert.equal(fixture.find('codex-reasoning-slider').props.value, 4);
});

test('model changes persist and are present on the next request and renderer reload', () => {
  const fixture = component();
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  assert.equal(fixture.find('codex-model-selector').props['aria-label'], 'Codex model: GPT-6 Astra');
  assert.equal(fixture.enrich({ model: 'Codex' }).codexModel, 'gpt-6-astra');
  const reloaded = component(fixture.saved.get(ui.STORAGE_KEY));
  assert.equal(reloaded.find('codex-model-selector').props['aria-label'], 'Codex model: GPT-6 Astra');
});

test('Fast toggle persists independently of the model and effort, and its indicator follows it', () => {
  const fixture = component(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'medium' }));
  assert.equal(fixture.find('codex-fast-toggle').props['aria-pressed'], false);
  assert.equal(fixture.find('codex-fast-toggle').props.children[0].type, 'svg');
  assert.equal(fixture.find('codex-fast-toggle').props.children[0].props.fill, 'none');
  assert.equal(fixture.find('codex-reasoning-selector').props.children[0], null);
  fixture.find('codex-fast-toggle').props.onClick();
  assert.deepEqual(fixture.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: true });
  assert.equal(fixture.find('codex-fast-toggle').props['aria-pressed'], true);
  assert.equal(fixture.find('codex-fast-toggle').props.children[0].props.fill, 'currentColor');
  assert.equal(fixture.find('codex-fast-indicator').props.children.type, 'svg');
  assert.deepEqual(plain(fixture.enrich({ model: 'Codex' })), {
    model: 'Codex', codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: true,
  });
  const reloaded = component(fixture.saved.get(ui.STORAGE_KEY));
  assert.equal(reloaded.find('codex-fast-toggle').props['aria-pressed'], true);
  reloaded.find('codex-model-gpt-6.1-sol').props.onClick();
  reloaded.find('codex-reasoning-slider').props.onInput({ target: { value: '2' } });
  assert.deepEqual(reloaded.read(), { codexModel: 'gpt-6.1-sol', codexReasoning: 'high', codexFast: true });
  reloaded.find('codex-reasoning-reset').props.onClick();
  assert.deepEqual(reloaded.read(), { codexModel: 'gpt-6.1-sol', codexReasoning: 'ultra', codexFast: true });
  reloaded.find('codex-fast-toggle').props.onClick();
  assert.deepEqual(reloaded.read(), { codexModel: 'gpt-6.1-sol', codexReasoning: 'ultra', codexFast: false });
  assert.equal(reloaded.find('codex-reasoning-selector').props.children[0], null);
  assert.equal(reloaded.find('codex-fast-toggle').props.children[0].props.fill, 'none');
  const tooltip = reloaded.find('codex-fast-tooltip');
  assert.equal(tooltip.props.role, 'tooltip');
  assert.deepEqual(plain(tooltip.props.children.map(child => child.props.children)), ['Fast mode', 'More usage']);
});

test('one footer control opens a centered effort popup with its model choice inside', () => {
  const initial = { codexModel: 'gpt-6-astra', codexReasoning: 'xhigh', codexFast: true };
  const fixture = component(JSON.stringify(initial));
  const controls = fixture.render().props.children.filter(child => child.type !== 'style');
  assert.equal(controls.length, 1);
  let footer = fixture.find('codex-reasoning-selector');
  assert.equal(footer.props.children[1], 'GPT-6 Astra');
  assert.equal(footer.props.children[2].props.children, 'Extra High');
  assert.equal(fixture.find('codex-reasoning-menu').props.align, 'center');
  assert.equal(fixture.find('codex-model-menu').props.align, 'center');
  assert.ok(fixture.pathTo('codex-model-selector').some(node => node.props?.['data-testid'] === 'codex-reasoning-menu'));
  fixture.popoverFor('codex-reasoning-selector').props.onOpenChange(true);
  footer = fixture.find('codex-reasoning-selector');
  assert.equal(footer.props.children[0], 'Select effort');
  assert.equal(footer.props.children.length, 2);
  assert.deepEqual(fixture.read(), initial);
  fixture.popoverFor('codex-model-selector').props.onOpenChange(true);
  assert.equal(fixture.popoverFor('codex-model-selector').props.open, true);
  fixture.find('codex-model-gpt-6.1-sol').props.onClick();
  assert.equal(fixture.popoverFor('codex-model-selector').props.open, false);
  assert.equal(fixture.popoverFor('codex-reasoning-selector').props.open, true);
  fixture.popoverFor('codex-model-selector').props.onOpenChange(true);
  fixture.popoverFor('codex-reasoning-selector').props.onOpenChange(false);
  assert.equal(fixture.popoverFor('codex-model-selector').props.open, false);
  footer = fixture.find('codex-reasoning-selector');
  assert.equal(footer.props.children[1], 'GPT-6.1 Sol');
  assert.equal(footer.props.children[2].props.children, 'Extra High');
  assert.equal(fixture.find('codex-fast-indicator').props.children.type, 'svg');
});

test('range changes cover the five reference reasoning levels and reset retains the chosen model', () => {
  const fixture = component();
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  for (const [index, effort] of ui.EFFORTS.entries()) {
    fixture.find('codex-reasoning-slider').props.onChange({ target: { value: String(index) } });
    assert.equal(fixture.enrich({ model: 'Codex' }).codexReasoning, effort);
    assert.equal(fixture.find('codex-reasoning-slider').props.value, index);
  }
  fixture.find('codex-reasoning-slider').props.onChange({ target: { value: '0' } });
  fixture.find('codex-reasoning-reset').props.onClick();
  assert.deepEqual(fixture.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'ultra', codexFast: false });
  fixture.find('codex-reasoning-slider').props.onChange({ target: { value: '999' } });
  assert.equal(fixture.read().codexReasoning, 'ultra');
});

test('dragging updates the visible effort and request before the range is released', () => {
  const fixture = component();
  const labels = ['Low', 'Medium', 'High', 'Extra High', 'Ultra'];
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  // Native range input emits input events while dragging, before its change event.
  // A live drag must update every displayed state without relying on release.
  for (const index of [0, 1, 2, 3, 4, 2, 0]) {
    const slider = fixture.find('codex-reasoning-slider');
    assert.equal(typeof slider.props.onInput, 'function');
    slider.props.onInput({ target: { value: String(index) } });
    assert.equal(fixture.find('codex-reasoning-label').props.children, labels[index]);
    assert.equal(fixture.find('codex-reasoning-selector').props['aria-label'], 'Thinking effort: ' + labels[index]);
    assert.equal(fixture.find('codex-reasoning-slider').props.value, index);
    assert.equal(fixture.find('codex-reasoning-slider').props['aria-valuetext'], labels[index]);
    assert.deepEqual(plain(fixture.enrich({ model: 'Codex' })), {
      model: 'Codex', codexModel: 'gpt-6-astra', codexReasoning: ui.EFFORTS[index], codexFast: false,
    });
  }
  fixture.find('codex-reasoning-reset').props.onClick();
  assert.equal(fixture.find('codex-reasoning-label').props.children, 'Ultra');
  assert.equal(fixture.find('codex-reasoning-slider').props.value, 4);
  assert.deepEqual(fixture.read(), { codexModel: 'gpt-6-astra', codexReasoning: 'ultra', codexFast: false });
});

test('progress fill meets the native thumb at every reference stop and changes color live', () => {
  const fixture = component();
  assert.deepEqual(ui.EFFORTS, ['low', 'medium', 'high', 'xhigh', 'ultra']);
  const sliderCss = fixture.render().props.children[0].props.children;
  const thumbWidth = Number(/::-webkit-slider-thumb\{[^}]*width:(\d+)px/.exec(sliderCss)?.[1]);
  assert.ok(thumbWidth > 0);
  for (const index of [0, 1, 2, 3, 4, 1]) {
    fixture.find('codex-reasoning-slider').props.onInput({ target: { value: String(index) } });
    const style = fixture.find('codex-reasoning-slider').props.style;
    const endpoint = style['--aura-codex-fill'];
    const match = /^calc\(([\d.]+)%\s*([+-])\s*([\d.]+)px\)$/.exec(endpoint);
    assert.ok(match, `Invalid slider fill position ${endpoint}`);
    const proportion = Number(match[1]) / 100;
    const inset = Number(match[3]) * (match[2] === '-' ? -1 : 1);
    for (const trackWidth of [180, 240, 360]) {
      assert.equal(trackWidth * proportion + inset, thumbWidth / 2 + (trackWidth - thumbWidth) * index / 4,
        `Fill must meet the ${thumbWidth}px thumb at stop ${index} on a ${trackWidth}px track`);
    }
    const ticks = fixture.find('codex-reasoning-ticks').props.children;
    assert.equal(ticks.length, 5);
    assert.equal(ticks[index].props.style.left, endpoint);
    for (const [stop, tick] of ticks.entries()) {
      assert.equal(tick.props.style.background, stop <= index ? '#ffffff80' : '#00000040');
    }
    if (index === 4) {
      assert.match(style.background, /#4338ca.*#a855f7/);
      assert.equal(fixture.find('codex-reasoning-label').props.style.color, '#8b5cf6');
    } else {
      assert.match(style.background, /#3b82f6/);
      assert.match(style.background, /#e5e5e5/);
      assert.equal(style.background.split('var(--aura-codex-fill)').length, 3);
      assert.equal(fixture.find('codex-reasoning-label').props.style.color, '#3b82f6');
    }
  }
});

test('Codex controls hide when the thread selects another provider', () => {
  const fixture = component();
  fixture.state.model = 'DeepSeek Harness';
  assert.equal(fixture.render(), null);
  fixture.state.threadState.thread = { selectedModel: 'Codex' };
  assert.ok(fixture.render());
  fixture.state.threadState.thread.selectedModel = 'Auto';
  assert.equal(fixture.render(), null);
});

test('quota failure preserves the latest session choice instead of reverting to old persisted settings', () => {
  const old = JSON.stringify({ codexModel: 'gpt-6.1-sol', codexReasoning: 'ultra' });
  const fixture = component(old, { writeFails: true });
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  fixture.find('codex-reasoning-slider').props.onChange({ target: { value: '1' } });
  fixture.find('codex-fast-toggle').props.onClick();
  assert.equal(fixture.saved.get(ui.STORAGE_KEY), old);
  assert.equal(fixture.find('codex-model-selector').props['aria-label'], 'Codex model: GPT-6 Astra');
  assert.deepEqual(plain(fixture.enrich({ model: 'Codex' })), { model: 'Codex', codexModel: 'gpt-6-astra', codexReasoning: 'medium', codexFast: true });
});

test('blocked storage still supports live UI changes and requests', () => {
  const fixture = component(undefined, { readFails: true, writeFails: true });
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  fixture.find('codex-fast-toggle').props.onClick();
  assert.equal(fixture.enrich({ model: 'Codex' }).codexModel, 'gpt-6-astra');
  assert.equal(fixture.enrich({ model: 'Codex' }).codexFast, true);
});

test('storage updates synchronize an open composer and clear stale session values', () => {
  const fixture = component();
  fixture.find('codex-model-gpt-6-astra').props.onClick();
  fixture.saved.set(ui.STORAGE_KEY, JSON.stringify({ codexModel: 'gpt-6.1-sol', codexReasoning: 'high', codexFast: true }));
  fixture.context.window.dispatchEvent({ type: 'storage', key: 'unrelated' });
  assert.equal(fixture.read().codexModel, 'gpt-6-astra');
  fixture.context.window.dispatchEvent({ type: 'storage', key: ui.STORAGE_KEY });
  assert.equal(fixture.find('codex-reasoning-label').props.children, 'High');
  assert.equal(fixture.find('codex-fast-toggle').props['aria-pressed'], true);
  assert.equal(fixture.enrich({ model: 'Codex' }).codexModel, 'gpt-6.1-sol');
  fixture.saved.delete(ui.STORAGE_KEY);
  fixture.context.window.dispatchEvent({ type: 'storage', key: null });
  assert.deepEqual(fixture.read(), ui.DEFAULTS);
});

test('all renderer patches compile, retain native anchors and are idempotent', () => {
  for (const [fixtureName, builder, marker] of [
    ['composer', ui.buildComposer, 'AURA_CODEX_SETTINGS_UI_V4'],
    ['transport', ui.buildTransport, 'AURA_CODEX_SETTINGS_TRANSPORT_V3'],
    ['agentTransport', ui.buildAgentTransport, 'AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V3'],
  ]) {
    const source = ui.FIXTURES[fixtureName];
    const patched = builder(source);
    assert.doesNotThrow(() => new vm.Script(patched));
    assert.equal(builder(patched), patched);
    assert.equal(patched.split(marker).length, 2);
    assert.throws(() => builder('unsupported renderer'), /expected one known renderer anchor/);
    assert.throws(() => builder(source + source), /expected one known renderer anchor/);
  }
});

test('installed legacy renderer patches upgrade without stacking helpers or composer controls', () => {
  for (const version of [1, 2, 3]) {
    const legacy = require(`./tests/fixtures/codex-settings-ui-v${version}.cjs`);
    for (const [fixtureName, method, marker] of [
      ['composer', 'buildComposer', 'AURA_CODEX_SETTINGS_UI'],
      ['transport', 'buildTransport', 'AURA_CODEX_SETTINGS_TRANSPORT'],
      ['agentTransport', 'buildAgentTransport', 'AURA_CODEX_SETTINGS_AGENT_TRANSPORT'],
    ]) {
      const installed = legacy[method](legacy.FIXTURES[fixtureName]);
      const upgraded = ui[method](installed);
      assert.doesNotThrow(() => new vm.Script(upgraded));
      assert.equal(upgraded.includes(marker + '_V1'), false);
      assert.equal(upgraded.includes(marker + '_V2'), false);
      assert.equal(upgraded.split(marker + (fixtureName === 'composer' ? '_V4' : '_V3')).length, 2);
      assert.equal(upgraded.split('function auraCodexSettingsNormalize(').length, 2);
      assert.equal(ui[method](upgraded), upgraded);
      const altered = installed.replace(legacy.runtimeSource(), legacy.runtimeSource().replace('function auraCodexSettingsNormalize', 'function alteredSettingsNormalize'));
      assert.throws(() => ui[method](altered), /incomplete|different version|modified/);
    }
  }
});

test('partial renderer patches fail closed before any installation', () => {
  assert.throws(() => ui.buildComposer('/* AURA_CODEX_SETTINGS_UI_V1 */'), /incomplete/);
  assert.throws(() => ui.buildComposer('/* AURA_CODEX_SETTINGS_UI_V2 */'), /incomplete/);
  assert.throws(() => ui.buildComposer('/* AURA_CODEX_SETTINGS_UI_V3 */'), /incomplete/);
  assert.throws(() => ui.buildComposer('/* AURA_CODEX_SETTINGS_UI_V4 */'), /incomplete/);
  assert.throws(() => ui.buildTransport('/* AURA_CODEX_SETTINGS_TRANSPORT_V1 */'), /incomplete/);
  assert.throws(() => ui.buildTransport('/* AURA_CODEX_SETTINGS_TRANSPORT_V2 */'), /incomplete/);
  assert.throws(() => ui.buildTransport('/* AURA_CODEX_SETTINGS_TRANSPORT_V3 */'), /incomplete/);
  assert.throws(() => ui.buildAgentTransport('/* AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V1 */'), /incomplete/);
  assert.throws(() => ui.buildAgentTransport('/* AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V2 */'), /incomplete/);
  assert.throws(() => ui.buildAgentTransport('/* AURA_CODEX_SETTINGS_AGENT_TRANSPORT_V3 */'), /incomplete/);
  for (const [name, builder] of [['composer', ui.buildComposer], ['transport', ui.buildTransport], ['agentTransport', ui.buildAgentTransport]]) {
    const missingRuntime = builder(ui.FIXTURES[name]).replace(ui.runtimeSource(), '');
    assert.throws(() => builder(missingRuntime), /incomplete/);
  }
});

test('native main transport adds picks before shaping legacy or cloud generation envelopes', () => {
  const fixture = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'high', codexFast: true }));
  fixture.context.n = { _: generator => function (...args) { return generator(...args).next().value; } };
  fixture.context.a = { _: (...args) => Object.assign(...args) };
  fixture.context.o = fixture.context.a;
  vm.runInContext(ui.buildTransport(ui.FIXTURES.transport), fixture.context);
  assert.deepEqual(plain(fixture.context.z({ body: { model: 'Codex' } })), {
    model: 'Codex', codexModel: 'gpt-6-astra', codexReasoning: 'high', codexFast: true, diagSendSource: 'fixture',
  });
  assert.deepEqual(plain(fixture.context.z({ body: { model: 'DeepSeek Harness' } })), { model: 'DeepSeek Harness', diagSendSource: 'fixture' });
});

test('native agent transport carries current picks and retains existing thinking flags', () => {
  const fixture = runtime(JSON.stringify({ codexModel: 'gpt-6-astra', codexReasoning: 'xhigh', codexFast: true }));
  fixture.context.self = { webpackChunk_N_E: [] };
  fixture.context.a = { jL: { getState: () => ({ maxThinking: true }) } };
  const source = ui.FIXTURES.agentTransport.replace('function transport(){var t=Object.assign({},', 't.transport=function transport(body){var t=Object.assign({},body,');
  vm.runInContext(ui.buildAgentTransport(source), fixture.context);
  const exports = {};
  fixture.context.self.webpackChunk_N_E[0][1][34599]({}, exports, () => {});
  assert.deepEqual(plain(exports.transport({ model: 'Codex', toolDefinitions: { tool: {} } })), {
    model: 'Codex', toolDefinitions: { tool: {} }, maxThinking: true,
    codexModel: 'gpt-6-astra', codexReasoning: 'xhigh', codexFast: true,
  });
  assert.deepEqual(plain(exports.transport({ model: 'DeepSeek Harness' })), { model: 'DeepSeek Harness', maxThinking: true });
});
