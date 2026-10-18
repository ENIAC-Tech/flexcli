const PANEL_LIMITS = Object.freeze({ modelBytes: 12288, items: 8, pagesPerItem: 8, actionsPerPage: 4, linesPerPage: 4, lineBytes: 240, defaultStaleAfterMs: 3e4 });
const PLUGIN_UNIT_STATES = ["idle", "active", "attention", "success", "error", "disabled"];
class PanelValidationError extends Error {
  code;
  constructor(code) {
    super(code);
    this.name = "PanelValidationError";
    this.code = code;
  }
}
const fail = (code = "panel-invalid") => {
  throw new PanelValidationError(code);
};
const bytes = (value) => new TextEncoder().encode(value).byteLength;
function object(value, allowed, required = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail();
  if (Object.keys(value).some((key) => !allowed.includes(key)) || required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) fail();
}
function text(value, required = false) {
  if (value === void 0 && !required) return;
  if (typeof value !== "string" || value.includes("\0")) fail();
  if (bytes(value) > PANEL_LIMITS.lineBytes) fail("panel-line-too-large");
}
function id(value) {
  if (typeof value !== "string" || !value || value.includes("\0")) fail();
}
function integer(value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail();
}
function timer(value) {
  if (value === void 0) return;
  object(value, ["since", "elapsedMs"], ["since"]);
  integer(value.since);
  if (value.elapsedMs !== void 0) integer(value.elapsedMs);
}
function bool(value) {
  if (value !== void 0 && typeof value !== "boolean") fail();
}
function array(value, max) {
  if (!Array.isArray(value) || value.length > max) fail("panel-limit-exceeded");
}
function unique(entries) {
  const ids = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    id(entry?.id);
    if (ids.has(entry.id)) fail("panel-duplicate-id");
    ids.add(entry.id);
  }
}
function validatePanelModel(value) {
  const model = value;
  object(model, ["v", "layout", "noticeIcon", "notice", "defaultItem", "staleAfterMs", "pagination", "navigation", "items"], ["v", "items"]);
  if (model.v !== 1) fail("panel-version-unsupported");
  if (model.layout !== void 0 && model.layout !== "sessions") fail();
  if (model.noticeIcon !== void 0 && !["power", "loading", "link-off", "inbox"].includes(model.noticeIcon)) fail();
  if (model.pagination !== void 0) {
    object(model.pagination, ["offset", "total"], ["offset", "total"]);
    integer(model.pagination.offset);
    integer(model.pagination.total, 1);
    if (model.pagination.offset >= model.pagination.total || model.pagination.offset + (model.items?.length ?? 0) > model.pagination.total) fail();
  }
  if (model.notice !== null) text(model.notice);
  if (model.defaultItem !== void 0 && model.defaultItem !== null) id(model.defaultItem);
  if (model.staleAfterMs !== void 0) integer(model.staleAfterMs, 1);
  array(model.items, PANEL_LIMITS.items);
  unique(model.items);
  const occupiedSlots = /* @__PURE__ */ new Set();
  for (const item of model.items) {
    if (item.slot !== void 0) {
      integer(item.slot, 1);
      if (item.slot > 8 || occupiedSlots.has(item.slot)) fail();
      occupiedSlots.add(item.slot);
    }
    object(item, ["id", "slot", "title", "subtitle", "activity", "state", "stateText", "badge", "timer", "pages"], ["id", "title", "state", "pages"]);
    text(item.title, true);
    text(item.subtitle);
    text(item.activity);
    text(item.stateText);
    if (!PLUGIN_UNIT_STATES.includes(item.state)) fail();
    if (item.badge !== void 0) integer(item.badge);
    timer(item.timer);
    array(item.pages, PANEL_LIMITS.pagesPerItem);
    unique(item.pages);
    for (const page of item.pages) {
      object(page, ["id", "title", "layout", "timer", "lines", "progress", "actions"], ["id", "lines", "actions"]);
      text(page.title);
      if (page.layout !== void 0 && page.layout !== "decision") fail();
      timer(page.timer);
      array(page.lines, PANEL_LIMITS.linesPerPage);
      array(page.actions, PANEL_LIMITS.actionsPerPage);
      unique(page.actions);
      for (const line of page.lines) {
        object(line, ["text", "mono", "secondary"], ["text"]);
        text(line.text, true);
        bool(line.mono);
        bool(line.secondary);
      }
      if (page.progress !== void 0) {
        if (!Array.isArray(page.progress) || page.progress.length !== 2) fail();
        integer(page.progress[0]);
        integer(page.progress[1]);
        if (page.progress[0] > page.progress[1]) fail();
      }
      for (const action of page.actions) {
        object(action, ["id", "label", "description", "buttonLabel", "icon", "style", "confirm", "priority", "requireFullLabel", "enabled"], ["id", "label"]);
        text(action.label, true);
        text(action.description);
        text(action.buttonLabel);
        if (action.icon !== void 0 && action.icon !== "open-in-new") fail();
        if (action.buttonLabel !== void 0 && (!action.buttonLabel || action.description === void 0 || page.layout !== "decision")) fail();
        if (action.style !== void 0 && !["normal", "primary", "danger"].includes(action.style)) fail();
        if (action.confirm !== void 0 && action.confirm !== "hold") fail();
        if (action.priority !== void 0 && !Number.isFinite(action.priority)) fail();
        bool(action.requireFullLabel);
        bool(action.enabled);
      }
    }
  }
  if (model.defaultItem != null && !model.items.some((item) => item.id === model.defaultItem)) fail("panel-default-item-missing");
  if (model.navigation !== void 0) {
    const nav = model.navigation;
    object(nav, ["token", "view", "item", "page", "action"], ["token", "view", "item"]);
    id(nav.token);
    if (bytes(nav.token) > 64) fail();
    if (!["overview", "detail"].includes(nav.view)) fail();
    const item = model.items.find((item2) => item2.id === nav.item);
    if (nav.item !== null) {
      id(nav.item);
      if (!item) fail("panel-navigation-target-missing");
    }
    if (nav.view === "overview") {
      if (nav.page !== void 0 || nav.action !== void 0) fail();
    } else {
      if (!item) fail("panel-navigation-target-missing");
      if (nav.page !== void 0) id(nav.page);
      const page = nav.page === void 0 ? item.pages[0] : item.pages.find((page2) => page2.id === nav.page);
      if (nav.page !== void 0 && !page) fail("panel-navigation-target-missing");
      if (nav.action !== void 0) {
        id(nav.action);
        if (!page?.actions.some((action) => action.id === nav.action)) fail("panel-navigation-target-missing");
      }
    }
  }
  let serialized;
  try {
    serialized = JSON.stringify(model);
  } catch {
    fail();
  }
  if (bytes(serialized) > PANEL_LIMITS.modelBytes) fail("panel-model-too-large");
}
function buildPanelModel(model) {
  validatePanelModel(model);
  return JSON.parse(JSON.stringify(model));
}
function validatePanelEvent(value) {
  const event = value;
  if (!event || typeof event !== "object") fail("panel-event-invalid");
  if (event.event === "browse") {
    integer(event.offset);
  } else if (event.event === "select") {
    if (event.item !== null) id(event.item);
  } else if (event.event === "action") {
    for (const key of ["item", "page", "action", "token"]) id(event[key]);
  } else if (event.event === "longPress") {
    id(event.item);
    if (!["card", "info"].includes(event.area)) fail("panel-event-invalid");
  } else fail("panel-event-invalid");
}
function resolvePluginPanelDefinition(value) {
  object(value, ["defaultItemCount", "sessionCatalogMethod", "staleAfterMs", "exampleModel"]);
  const defaultItemCount = value.defaultItemCount ?? 3, staleAfterMs = value.staleAfterMs ?? PANEL_LIMITS.defaultStaleAfterMs;
  integer(defaultItemCount, 1);
  if (defaultItemCount > PANEL_LIMITS.items) fail();
  integer(staleAfterMs, 1);
  if (value.exampleModel !== void 0) validatePanelModel(value.exampleModel);
  if (value.sessionCatalogMethod !== void 0) id(value.sessionCatalogMethod);
  return { defaultItemCount, staleAfterMs, ...value.sessionCatalogMethod ? { sessionCatalogMethod: value.sessionCatalogMethod } : {}, ...value.exampleModel ? { exampleModel: buildPanelModel(value.exampleModel) } : {} };
}
function validatePanelDelivery(model, uuid, typeId) {
  const check = (event) => {
    if (new TextEncoder().encode(JSON.stringify({ uuid, typeId, ...event })).length > 1024)
      throw new Error("panel-event-size-exceeded");
  };
  for (const item of model.items) {
    check({ event: "select", item: item.id });
    check({ event: "longPress", item: item.id, area: "card" });
    check({ event: "longPress", item: item.id, area: "info" });
    for (const page of item.pages) for (const action of page.actions)
      check({ event: "action", item: item.id, page: page.id, action: action.id, token: "x".repeat(63) });
  }
}
export {
  PANEL_LIMITS,
  PLUGIN_UNIT_STATES,
  PanelValidationError,
  buildPanelModel,
  resolvePluginPanelDefinition,
  validatePanelDelivery,
  validatePanelEvent,
  validatePanelModel
};
