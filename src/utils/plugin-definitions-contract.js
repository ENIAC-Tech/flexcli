// Generated from FlexStudio plugin contracts. Run script/sync-plugin-contracts.mjs; do not edit.
// src/common/plugin-panel-model.ts
var PANEL_LIMITS = Object.freeze({ modelBytes: 12288, items: 8, pagesPerItem: 4, actionsPerPage: 4, linesPerPage: 4, lineBytes: 240, defaultStaleAfterMs: 3e4 });
var PLUGIN_UNIT_STATES = ["idle", "active", "attention", "success", "error", "disabled"];
var PanelValidationError = class extends Error {
  code;
  constructor(code) {
    super(code);
    this.name = "PanelValidationError";
    this.code = code;
  }
};
var fail = (code = "panel-invalid") => {
  throw new PanelValidationError(code);
};
var bytes = (value) => new TextEncoder().encode(value).byteLength;
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
  object(value, ["since"], ["since"]);
  integer(value.since);
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
  object(model, ["v", "notice", "defaultItem", "staleAfterMs", "items"], ["v", "items"]);
  if (model.v !== 1) fail("panel-version-unsupported");
  if (model.notice !== null) text(model.notice);
  if (model.defaultItem !== void 0 && model.defaultItem !== null) id(model.defaultItem);
  if (model.staleAfterMs !== void 0) integer(model.staleAfterMs, 1);
  array(model.items, PANEL_LIMITS.items);
  unique(model.items);
  for (const item of model.items) {
    object(item, ["id", "title", "subtitle", "state", "stateText", "badge", "timer", "pages"], ["id", "title", "state", "pages"]);
    text(item.title, true);
    text(item.subtitle);
    text(item.stateText);
    if (!PLUGIN_UNIT_STATES.includes(item.state)) fail();
    if (item.badge !== void 0) integer(item.badge);
    timer(item.timer);
    array(item.pages, PANEL_LIMITS.pagesPerItem);
    unique(item.pages);
    for (const page of item.pages) {
      object(page, ["id", "title", "timer", "lines", "progress", "actions"], ["id", "lines", "actions"]);
      text(page.title);
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
        object(action, ["id", "label", "style", "confirm", "priority", "requireFullLabel", "enabled"], ["id", "label"]);
        text(action.label, true);
        if (action.style !== void 0 && !["normal", "primary", "danger"].includes(action.style)) fail();
        if (action.confirm !== void 0 && action.confirm !== "hold") fail();
        if (action.priority !== void 0 && !Number.isFinite(action.priority)) fail();
        bool(action.requireFullLabel);
        bool(action.enabled);
      }
    }
  }
  if (model.defaultItem != null && !model.items.some((item) => item.id === model.defaultItem)) fail("panel-default-item-missing");
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
function resolvePluginPanelDefinition(value) {
  object(value, ["defaultItemCount", "staleAfterMs", "exampleModel"]);
  const defaultItemCount = value.defaultItemCount ?? 3, staleAfterMs = value.staleAfterMs ?? PANEL_LIMITS.defaultStaleAfterMs;
  integer(defaultItemCount, 1);
  if (defaultItemCount > PANEL_LIMITS.items) fail();
  integer(staleAfterMs, 1);
  if (value.exampleModel !== void 0) validatePanelModel(value.exampleModel);
  return { defaultItemCount, staleAfterMs, ...value.exampleModel ? { exampleModel: buildPanelModel(value.exampleModel) } : {} };
}

// src/main/plugin/plugin-definitions-validate.ts
import Ajv from "ajv";

// src/common/plugin-panel-schema.ts
var PANEL_DEFINITION_JSON_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "defaultItemCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 8
    },
    "staleAfterMs": {
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "exampleModel": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "v",
        "items"
      ],
      "properties": {
        "v": {
          "const": 1
        },
        "notice": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^[^\\u0000]*$"
        },
        "defaultItem": {
          "type": [
            "string",
            "null"
          ],
          "pattern": "^[^\\u0000]*$"
        },
        "staleAfterMs": {
          "type": "integer",
          "minimum": 1,
          "maximum": 9007199254740991
        },
        "items": {
          "type": "array",
          "maxItems": 8,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "title",
              "state",
              "pages"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "pattern": "^[^\\u0000]*$"
              },
              "title": {
                "type": "string",
                "pattern": "^[^\\u0000]*$"
              },
              "subtitle": {
                "type": "string",
                "pattern": "^[^\\u0000]*$"
              },
              "state": {
                "enum": [
                  "idle",
                  "active",
                  "attention",
                  "success",
                  "error",
                  "disabled"
                ]
              },
              "stateText": {
                "type": "string",
                "pattern": "^[^\\u0000]*$"
              },
              "badge": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "timer": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "since"
                ],
                "properties": {
                  "since": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                }
              },
              "pages": {
                "type": "array",
                "maxItems": 4,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "id",
                    "lines",
                    "actions"
                  ],
                  "properties": {
                    "id": {
                      "type": "string",
                      "minLength": 1,
                      "pattern": "^[^\\u0000]*$"
                    },
                    "title": {
                      "type": "string",
                      "pattern": "^[^\\u0000]*$"
                    },
                    "timer": {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "since"
                      ],
                      "properties": {
                        "since": {
                          "type": "integer",
                          "minimum": 0,
                          "maximum": 9007199254740991
                        }
                      }
                    },
                    "lines": {
                      "type": "array",
                      "maxItems": 4,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "text"
                        ],
                        "properties": {
                          "text": {
                            "type": "string",
                            "pattern": "^[^\\u0000]*$"
                          },
                          "mono": {
                            "type": "boolean"
                          },
                          "secondary": {
                            "type": "boolean"
                          }
                        }
                      }
                    },
                    "progress": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 2,
                      "items": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 9007199254740991
                      }
                    },
                    "actions": {
                      "type": "array",
                      "maxItems": 4,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "id",
                          "label"
                        ],
                        "properties": {
                          "id": {
                            "type": "string",
                            "minLength": 1,
                            "pattern": "^[^\\u0000]*$"
                          },
                          "label": {
                            "type": "string",
                            "pattern": "^[^\\u0000]*$"
                          },
                          "style": {
                            "enum": [
                              "normal",
                              "primary",
                              "danger"
                            ]
                          },
                          "confirm": {
                            "const": "hold"
                          },
                          "priority": {
                            "type": "number"
                          },
                          "requireFullLabel": {
                            "type": "boolean"
                          },
                          "enabled": {
                            "type": "boolean"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// src/common/data/appearance-schema.ts
var APPEARANCE_SCHEMA_DEFINITIONS = {
  backgroundStyle: {
    type: "object",
    required: ["borderWidth", "borderColor", "borderStyle", "backgroundColor"],
    additionalProperties: false,
    properties: {
      borderWidth: { type: "number" },
      borderColor: { type: "string" },
      borderStyle: { type: "string" },
      backgroundColor: { type: "string" },
      backgroundImage: { type: "string" },
      borderRadius: { type: "number" },
      backgroundFit: { type: "string", enum: ["cover", "contain", "stretch", "tile"] },
      backgroundPosition: { type: "string" }
    }
  },
  geometry: {
    type: "object",
    required: ["x", "y", "width", "height"],
    additionalProperties: true,
    properties: {
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      rotate: { type: "number" },
      config: { type: "object", additionalProperties: true }
    }
  },
  elementConfig: {
    type: "object",
    additionalProperties: false,
    properties: {
      pinned: { type: "boolean" },
      removable: { type: "boolean" },
      maxCount: { type: "number" }
    }
  },
  element: {
    oneOf: [
      { $ref: "#/definitions/textElement" },
      { $ref: "#/definitions/iconElement" },
      { $ref: "#/definitions/imageElement" }
    ]
  },
  textElement: {
    type: "object",
    required: ["typeId", "uuid", "config", "geometry", "style", "data"],
    additionalProperties: false,
    properties: {
      typeId: { const: "text" },
      uuid: { type: "string", minLength: 1 },
      name: { type: "string" },
      identifier: { type: "string" },
      config: { $ref: "#/definitions/elementConfig" },
      geometry: { $ref: "#/definitions/geometry" },
      style: {
        type: "object",
        required: [
          "backgroundColor",
          "color",
          "fontFamily",
          "fontSize",
          "fontWeight",
          "fontStyle",
          "textShadow",
          "background"
        ],
        additionalProperties: true,
        properties: {
          backgroundColor: { type: "string" },
          color: { type: "string" },
          fontFamily: { type: "string" },
          fontSize: { type: "number" },
          fontWeight: { type: "string" },
          fontStyle: { type: "string" },
          textShadow: { type: "string" },
          background: { $ref: "#/definitions/backgroundStyle" }
        }
      },
      data: {
        type: "object",
        required: ["text"],
        additionalProperties: false,
        properties: {
          text: { type: "string" }
        }
      }
    }
  },
  iconElement: {
    type: "object",
    required: ["typeId", "uuid", "config", "geometry", "style", "data"],
    additionalProperties: false,
    properties: {
      typeId: { const: "icon" },
      uuid: { type: "string", minLength: 1 },
      name: { type: "string" },
      identifier: { type: "string" },
      config: { $ref: "#/definitions/elementConfig" },
      geometry: { $ref: "#/definitions/geometry" },
      style: {
        type: "object",
        required: ["backgroundColor", "color", "fontSize", "textShadow", "background"],
        additionalProperties: true,
        properties: {
          backgroundColor: { type: "string" },
          color: { type: "string" },
          fontSize: { type: "number" },
          textShadow: { type: "string" },
          background: { $ref: "#/definitions/backgroundStyle" }
        }
      },
      data: {
        type: "object",
        required: ["value", "type"],
        additionalProperties: true,
        properties: {
          value: { type: "string" },
          type: { type: "string", enum: ["icon", "emoji", "custom"] },
          emojiSet: { type: "string", enum: ["native", "apple", "google", "twitter", "facebook"] },
          emojiUnified: { type: "string" },
          emojiSheetX: { type: "number" },
          emojiSheetY: { type: "number" }
        }
      }
    }
  },
  imageElement: {
    type: "object",
    required: ["typeId", "uuid", "config", "geometry", "style", "data"],
    additionalProperties: false,
    properties: {
      typeId: { const: "image" },
      uuid: { type: "string", minLength: 1 },
      name: { type: "string" },
      identifier: { type: "string" },
      config: { $ref: "#/definitions/elementConfig" },
      geometry: { $ref: "#/definitions/geometry" },
      style: {
        type: "object",
        required: ["backgroundColor", "background"],
        additionalProperties: true,
        properties: {
          backgroundColor: { type: "string" },
          background: { $ref: "#/definitions/backgroundStyle" }
        }
      },
      data: {
        type: "object",
        required: ["value"],
        additionalProperties: false,
        properties: {
          value: { type: "string" }
        }
      }
    }
  }
};

// src/main/plugin/plugin-definitions-schema.ts
var PLUGIN_DEFINITIONS_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://flexsdk.local/schemas/plugin-definitions-payload.json",
  type: "object",
  required: ["libraries", "units"],
  additionalProperties: false,
  properties: {
    libraries: {
      type: "array",
      items: { $ref: "#/definitions/pluginLibraryDefinition" }
    },
    units: {
      type: "array",
      items: { $ref: "#/definitions/pluginUnitDefinitionRuntime" }
    },
    builtinUnits: {
      type: "array",
      items: { $ref: "#/definitions/builtinUnitTemplate" }
    },
    revision: { type: "string" }
  },
  definitions: {
    builtinUnitTemplate: {
      type: "object",
      required: ["uuid", "typeId", "name", "icon", "config", "geometry", "appearance", "data"],
      additionalProperties: false,
      not: { required: ["plugin"] },
      properties: {
        uuid: { type: "string", minLength: 1 },
        typeId: { type: "string", minLength: 1 },
        name: { $ref: "#/definitions/requiredPluginDisplayText" },
        icon: { type: "string" },
        fixedAppearance: { type: "boolean" },
        config: {
          type: "object",
          additionalProperties: true
        },
        geometry: { $ref: "#/definitions/geometry" },
        appearance: {
          type: "array",
          items: { $ref: "#/definitions/builtinAppearance" }
        },
        data: {
          type: "object",
          additionalProperties: true
        },
        pluginTemplate: { $ref: "#/definitions/pluginBuiltinTemplateBinding" },
        _metadata: {
          type: "object",
          additionalProperties: true
        }
      }
    },
    pluginBuiltinTemplateBinding: {
      type: "object",
      required: ["pluginUUID", "unitId", "editorTypeId"],
      additionalProperties: false,
      properties: {
        pluginUUID: { type: "string", minLength: 1 },
        unitId: { type: "string", minLength: 1 },
        editorTypeId: { type: "string", minLength: 1 }
      }
    },
    pluginUnit: {
      type: "object",
      required: ["type", "pluginUUID", "pluginVersion", "unitId"],
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["standard", "custom", "canvas", "cycled", "slider", "value-label", "label", "button-group", "panel"] },
        pluginUUID: { type: "string", minLength: 1 },
        pluginVersion: { type: "string", minLength: 1 },
        unitId: { type: "string", minLength: 1 }
      }
    },
    pluginUnitDefaultActivationConfig: {
      type: "object",
      required: ["mode"],
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["tap", "hold"] },
        holdDurationMs: { type: "number" }
      }
    },
    pluginLibraryDefinition: {
      type: "object",
      required: ["libraryUUID", "name"],
      additionalProperties: false,
      properties: {
        libraryUUID: { type: "string", minLength: 1 },
        name: { $ref: "#/definitions/requiredPluginDisplayText" },
        icon: { type: "string" },
        categoryId: { type: "string" }
      }
    },
    pluginUnitDefinitionRuntime: {
      type: "object",
      required: ["unitId", "typeId", "name", "categoryId", "plugin"],
      additionalProperties: false,
      properties: {
        unitId: { type: "string", minLength: 1 },
        typeId: { type: "string", minLength: 1 },
        name: { $ref: "#/definitions/requiredPluginDisplayText" },
        categoryId: { type: "string", minLength: 1 },
        plugin: { $ref: "#/definitions/pluginUnit" },
        interactionMode: { type: "string", enum: ["click", "continuous", "display"] },
        defaultActivation: { $ref: "#/definitions/pluginUnitDefaultActivationConfig" },
        icon: { type: "string" },
        hasFunctionEditor: { type: "boolean" },
        hasAppearanceEditor: { type: "boolean" },
        hasView: { type: "boolean" },
        visibleInLibrary: { type: "boolean" },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["win32", "darwin", "linux"] }
        },
        libraryUUID: { type: "string" },
        defaultData: { $ref: "#/definitions/unitDefaultData" },
        appearanceOverride: { $ref: "#/definitions/appearanceOverride" },
        functions: {
          type: "array",
          minItems: 2,
          items: { $ref: "#/definitions/cycledFunctionDefinition" }
        },
        slider: { $ref: "#/definitions/sliderDefinition" },
        valueLabel: { $ref: "#/definitions/valueLabelDefinition" },
        label: { $ref: "#/definitions/labelDefinition" },
        panel: PANEL_DEFINITION_JSON_SCHEMA,
        tapAction: { const: "page" },
        buttonGroup: { $ref: "#/definitions/buttonGroupDefinition" }
      },
      allOf: [
        {
          if: { properties: { plugin: { properties: { type: { const: "panel" } } } } },
          then: {
            required: ["panel"],
            properties: { hasView: { const: false }, hasAppearanceEditor: { const: false }, interactionMode: false, defaultActivation: false, functions: false, slider: false, valueLabel: false, label: false, buttonGroup: false, tapAction: false }
          },
          else: { properties: { panel: false } }
        },
        {
          if: { properties: { plugin: { properties: { type: { enum: ["label", "value-label"] } } } } },
          else: { properties: { tapAction: false } }
        },
        {
          if: { $ref: "#/definitions/isStandardUnitDefinition" },
          then: {
            properties: {
              buttonGroup: false
            },
            not: {
              anyOf: [
                { required: ["functions"] },
                { required: ["slider"] },
                { required: ["valueLabel"] },
                { required: ["label"] },
                { required: ["buttonGroup"] }
              ]
            }
          }
        },
        {
          if: { $ref: "#/definitions/isCycledUnitDefinition" },
          then: {
            required: ["functions"],
            not: {
              anyOf: [
                { required: ["slider"] },
                { required: ["valueLabel"] },
                { required: ["label"] },
                { required: ["buttonGroup"] }
              ]
            }
          }
        },
        {
          if: { $ref: "#/definitions/isSliderUnitDefinition" },
          then: {
            required: ["slider"],
            not: {
              anyOf: [
                { required: ["functions"] },
                { required: ["valueLabel"] },
                { required: ["label"] },
                { required: ["buttonGroup"] }
              ]
            }
          }
        },
        {
          if: { $ref: "#/definitions/isCustomUnitDefinition" },
          then: {
            not: {
              anyOf: [
                { required: ["appearanceOverride"] },
                { required: ["functions"] },
                { required: ["slider"] },
                { required: ["valueLabel"] },
                { required: ["label"] },
                { required: ["buttonGroup"] }
              ]
            }
          }
        },
        {
          if: { $ref: "#/definitions/isCanvasUnitDefinition" },
          then: {
            not: {
              anyOf: [
                { required: ["appearanceOverride"] },
                { required: ["functions"] },
                { required: ["slider"] },
                { required: ["valueLabel"] },
                { required: ["label"] },
                { required: ["buttonGroup"] }
              ]
            }
          }
        },
        {
          if: { $ref: "#/definitions/isValueLabelUnitDefinition" },
          then: {
            required: ["valueLabel"],
            properties: {
              hasView: { const: false },
              functions: false,
              slider: false,
              label: false,
              buttonGroup: false
            }
          }
        },
        {
          if: { $ref: "#/definitions/isLabelUnitDefinition" },
          then: {
            required: ["label"],
            properties: {
              hasView: { const: false },
              functions: false,
              slider: false,
              valueLabel: false,
              buttonGroup: false
            }
          }
        },
        {
          if: { $ref: "#/definitions/isButtonGroupUnitDefinition" },
          then: {
            required: ["buttonGroup"],
            properties: {
              hasView: { const: false },
              appearanceOverride: false,
              functions: false,
              slider: false,
              valueLabel: false,
              label: false
            }
          }
        }
      ]
    },
    isStandardUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "standard" }
          }
        }
      }
    },
    isCycledUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "cycled" }
          }
        }
      }
    },
    isSliderUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "slider" }
          }
        }
      }
    },
    isCustomUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "custom" }
          }
        }
      }
    },
    isCanvasUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "canvas" }
          }
        }
      }
    },
    isValueLabelUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "value-label" }
          }
        }
      }
    },
    isLabelUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "label" }
          }
        }
      }
    },
    isButtonGroupUnitDefinition: {
      type: "object",
      required: ["plugin"],
      properties: {
        plugin: {
          type: "object",
          required: ["type"],
          properties: {
            type: { const: "button-group" }
          }
        }
      }
    },
    unitDefaultData: {
      type: "object",
      additionalProperties: true,
      not: { required: ["appearance"] }
    },
    cycledFunctionDefinition: {
      type: "object",
      required: ["functionId"],
      additionalProperties: false,
      properties: {
        functionId: { type: "string", minLength: 1 },
        name: { $ref: "#/definitions/pluginDisplayText" },
        data: { $ref: "#/definitions/unitDefaultData" },
        appearanceOverride: { $ref: "#/definitions/appearanceOverride" }
      }
    },
    sliderDefinition: {
      type: "object",
      required: ["format", "min", "max"],
      additionalProperties: false,
      properties: {
        format: { type: "string", minLength: 1 },
        min: { type: "number" },
        max: { type: "number" },
        step: { type: "number" }
      }
    },
    valueLabelDefinition: {
      oneOf: [
        {
          type: "object",
          required: ["mode", "format"],
          additionalProperties: false,
          properties: {
            mode: { const: "format" },
            format: { type: "string", minLength: 1 },
            customCharacters: { type: "string" }
          }
        },
        {
          type: "object",
          required: ["mode"],
          additionalProperties: false,
          properties: {
            mode: { const: "custom" },
            customCharacters: { type: "string" }
          }
        }
      ]
    },
    labelDefinition: {
      type: "object",
      required: ["fontFamily"],
      additionalProperties: false,
      properties: {
        fontFamily: { type: "string", enum: ["puhuiti", "consola"] }
      }
    },
    buttonGroupDefinition: {
      type: "object",
      required: ["buttons"],
      additionalProperties: false,
      properties: {
        buttons: {
          type: "array",
          minItems: 2,
          items: { $ref: "#/definitions/buttonGroupButtonDefinition" }
        },
        selectionMode: { type: "string", enum: ["single", "multiple"] },
        mandatory: { type: "boolean" },
        displayMode: { type: "string", enum: ["text", "icon", "icon-text", "icon-over-text"] },
        defaultActiveButtonIds: {
          type: "array",
          items: { type: "string" }
        },
        inactiveBackgroundColor: { type: "string" },
        foregroundColor: { type: "string" },
        activeColor: { type: "string" }
      }
    },
    buttonGroupButtonDefinition: {
      type: "object",
      required: ["buttonId"],
      additionalProperties: false,
      properties: {
        buttonId: { type: "string", minLength: 1 },
        name: { $ref: "#/definitions/pluginDisplayText" },
        data: {
          type: "object",
          additionalProperties: true
        },
        appearanceOverride: { $ref: "#/definitions/appearanceOverride" }
      }
    },
    pluginDisplayText: {
      anyOf: [
        { type: "string" },
        { $ref: "#/definitions/localizedText" }
      ]
    },
    requiredPluginDisplayText: {
      anyOf: [
        { type: "string", minLength: 1 },
        { $ref: "#/definitions/localizedText" }
      ]
    },
    localizedText: {
      type: "object",
      required: ["default"],
      additionalProperties: false,
      properties: {
        default: { type: "string", minLength: 1 },
        translations: {
          type: "object",
          additionalProperties: { type: "string" }
        }
      }
    },
    appearanceOverride: {
      type: "object",
      additionalProperties: false,
      properties: {
        background: { $ref: "#/definitions/backgroundStyleOverride" },
        elements: {
          type: "array",
          items: { $ref: "#/definitions/appearanceElementOverride" }
        }
      }
    },
    backgroundStyleOverride: {
      type: "object",
      additionalProperties: false,
      properties: {
        borderWidth: { type: "number" },
        borderColor: { type: "string" },
        borderStyle: { type: "string" },
        backgroundColor: { type: "string" },
        backgroundImage: { type: "string" },
        borderRadius: { type: "number" },
        backgroundFit: { type: "string", enum: ["cover", "contain", "stretch", "tile"] },
        backgroundPosition: { type: "string" }
      }
    },
    appearanceElementOverride: {
      anyOf: [
        {
          type: "object",
          required: ["identifier"],
          additionalProperties: false,
          properties: {
            identifier: { type: "string", minLength: 1 },
            typeId: { type: "string" },
            uuid: { type: "string" },
            name: { type: "string" },
            config: {
              type: "object",
              additionalProperties: true
            },
            geometry: {
              type: "object",
              additionalProperties: true
            },
            style: {
              type: "object",
              additionalProperties: true
            },
            data: {
              type: "object",
              additionalProperties: true
            }
          }
        },
        {
          allOf: [
            { $ref: "#/definitions/element" },
            {
              not: { required: ["identifier"] }
            }
          ]
        }
      ]
    },
    appearance: {
      type: "object",
      required: ["background", "elements"],
      additionalProperties: false,
      properties: {
        background: { $ref: "#/definitions/backgroundStyle" },
        elements: {
          type: "array",
          items: { $ref: "#/definitions/element" }
        }
      }
    },
    builtinAppearance: {
      type: "object",
      required: ["background", "elements"],
      additionalProperties: false,
      properties: {
        background: { $ref: "#/definitions/backgroundStyle" },
        elements: {
          type: "array",
          items: { $ref: "#/definitions/builtinAppearanceElement" }
        }
      }
    },
    builtinAppearanceElement: {
      type: "object",
      required: ["typeId", "uuid", "config", "geometry", "style", "data"],
      additionalProperties: true,
      properties: {
        typeId: { type: "string", minLength: 1 },
        uuid: { type: "string", minLength: 1 },
        name: { type: "string" },
        identifier: { type: "string" },
        config: {
          type: "object",
          additionalProperties: true
        },
        geometry: { $ref: "#/definitions/geometry" },
        style: {
          type: "object",
          additionalProperties: true
        },
        data: {
          type: "object",
          additionalProperties: true
        }
      }
    },
    ...APPEARANCE_SCHEMA_DEFINITIONS
  }
};

// src/common/plugin-numeric-format.ts
var MAX_DECIMALS = 6;
function parsePluginNumericFormat(format, subject) {
  let placeholder;
  let placeholderIndex = -1;
  let decimals = 0;
  for (let index = 0; index < format.length; ) {
    if (format[index] !== "%") {
      index++;
      continue;
    }
    if (format[index + 1] === "%") {
      index += 2;
      continue;
    }
    const match = matchNumericPlaceholder(format, index);
    if (!match) {
      throw new Error(`Unsupported ${subject} format placeholder at position ${index}`);
    }
    if (placeholder) {
      throw new Error(`${capitalize(subject)} format must contain exactly one supported %f placeholder`);
    }
    placeholder = match.placeholder;
    placeholderIndex = index;
    decimals = match.decimals;
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      throw new Error(`${capitalize(subject)} format precision must be between 0 and ${MAX_DECIMALS} decimals`);
    }
    index += placeholder.length;
  }
  if (!placeholder) {
    throw new Error(`${capitalize(subject)} format must contain exactly one supported %f placeholder`);
  }
  return {
    decimals,
    placeholder,
    placeholderIndex
  };
}
function collectPluginNumericFormatLiterals(format) {
  parsePluginNumericFormat(format, "numeric");
  const literals = [];
  for (let index = 0; index < format.length; ) {
    if (format[index] === "%") {
      if (format[index + 1] === "%") {
        literals.push("%");
        index += 2;
        continue;
      }
      const match = matchNumericPlaceholder(format, index);
      if (match) {
        index += match.placeholder.length;
        continue;
      }
    }
    const grapheme = readGrapheme(format, index);
    if (!grapheme.includes("\n") && !grapheme.includes("\r")) {
      literals.push(grapheme);
    }
    index += grapheme.length;
  }
  return literals;
}
function matchNumericPlaceholder(format, index) {
  const match = format.slice(index).match(/^%(?:0)?(?:\d+)?(?:\.(\d+))?f/);
  if (!match) {
    return void 0;
  }
  return {
    placeholder: match[0],
    decimals: match[1] ? Number(match[1]) : 0
  };
}
function readGrapheme(input, index) {
  return splitGraphemes(input.slice(index))[0] ?? "";
}
function splitGraphemes(input) {
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter(void 0, { granularity: "grapheme" }).segment(input), (segment) => segment.segment);
  }
  return [...input];
}
function capitalize(input) {
  return input.length > 0 ? input[0].toUpperCase() + input.slice(1) : input;
}

// src/common/plugin-slider.ts
var EPSILON = 1e-9;
function parseSliderFormat(format) {
  return parsePluginNumericFormat(format, "slider");
}
function resolvePluginSliderConfig(input) {
  const { decimals } = parseSliderFormat(input.format);
  const min = input.min;
  const max = input.max;
  const step = input.step ?? defaultStepForDecimals(decimals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("Slider min and max must be finite numbers");
  }
  const range = max - min;
  if (max <= min) {
    throw new Error("Slider max must be greater than min");
  }
  if (!Number.isFinite(step)) {
    throw new Error("Slider step must be a finite number");
  }
  if (step <= 0) {
    throw new Error("Slider step must be greater than 0");
  }
  if (step - range > EPSILON) {
    throw new Error("Slider step must not exceed range");
  }
  if (!isRepresentableByDecimals(min, decimals) || !isRepresentableByDecimals(max, decimals)) {
    throw new Error("Slider min and max must be represented by display precision");
  }
  if (!isNearlyInteger(range / step)) {
    throw new Error("Slider step must evenly divide range");
  }
  if (!isRepresentableByDecimals(step, decimals)) {
    throw new Error("Slider step cannot be represented by display precision");
  }
  return {
    format: input.format,
    min,
    max,
    step,
    decimals
  };
}
function defaultStepForDecimals(decimals) {
  return decimals === 0 ? 1 : 1 / 10 ** decimals;
}
function isRepresentableByDecimals(value, decimals) {
  return isNearlyInteger(value * 10 ** decimals);
}
function isNearlyInteger(value) {
  return Math.abs(value - Math.round(value)) <= EPSILON;
}

// src/common/plugin-value-label.ts
var VALUE_LABEL_FORMAT_DEFAULT_CHARSET = "0123456789.-";
var VALUE_LABEL_CUSTOM_DEFAULT_CHARSET = "0123456789.";
var VALUE_LABEL_MAX_CUSTOM_GRAPHEMES = 128;
function splitGraphemes2(input) {
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter(void 0, { granularity: "grapheme" }).segment(input), (segment) => segment.segment);
  }
  return [...input];
}
function dedupeGraphemes(input) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const grapheme of input) {
    if (seen.has(grapheme)) {
      continue;
    }
    seen.add(grapheme);
    result.push(grapheme);
  }
  return result;
}
function resolvePluginValueLabelConfig(input) {
  if (input.mode === "format") {
    const { decimals } = parsePluginNumericFormat(input.format, "value-label");
    const charset = dedupeGraphemes([
      ...splitGraphemes2(VALUE_LABEL_FORMAT_DEFAULT_CHARSET),
      ...collectPluginNumericFormatLiterals(input.format)
    ]);
    return {
      mode: "format",
      format: input.format,
      decimals,
      charset
    };
  }
  const customCharacters = input.customCharacters ?? "";
  const customGraphemes = dedupeGraphemes(splitGraphemes2(customCharacters));
  if (customGraphemes.length > VALUE_LABEL_MAX_CUSTOM_GRAPHEMES) {
    throw new Error(`Value-label customCharacters must contain at most ${VALUE_LABEL_MAX_CUSTOM_GRAPHEMES} unique graphemes`);
  }
  return {
    mode: "custom",
    customCharacters,
    charset: dedupeGraphemes([...splitGraphemes2(VALUE_LABEL_CUSTOM_DEFAULT_CHARSET), ...customGraphemes])
  };
}

// src/types/element.ts
var PRIMARY_TEXT_IDENTIFIER = "primary-text";
var PRIMARY_ICON_IDENTIFIER = "primary-icon";

// src/main/plugin/plugin-definitions-validate.ts
var BUILTIN_UNIT_REQUIRED_KEYS = [
  "uuid",
  "typeId",
  "name",
  "icon",
  "config",
  "geometry",
  "appearance",
  "data"
];
var BUILTIN_UNIT_ALLOWED_KEYS = /* @__PURE__ */ new Set([
  ...BUILTIN_UNIT_REQUIRED_KEYS,
  "pluginTemplate",
  "_metadata",
  "fixedAppearance",
  "plugin"
]);
var GEOMETRY_REQUIRED_KEYS = ["x", "y", "width", "height"];
var BUILTIN_APPEARANCE_ELEMENT_REQUIRED_KEYS = [
  "typeId",
  "uuid",
  "config",
  "geometry",
  "style",
  "data"
];
var validateCompiled = null;
function getCompiledValidator() {
  if (!validateCompiled) {
    const ajv = new Ajv({ allErrors: true, verbose: true });
    validateCompiled = ajv.compile(PLUGIN_DEFINITIONS_JSON_SCHEMA);
  }
  return validateCompiled;
}
function validatePluginDefinitionsPayload(payload) {
  const compiled = getCompiledValidator();
  const ok = Boolean(compiled(payload));
  if (!ok) {
    const detail = compiled.errors?.map((e) => {
      const path = e.instancePath ?? e.dataPath ?? "";
      return `${path === "" ? "/" : path} ${e.message}`.trim();
    }).join("; ") || "unknown error";
    throw new Error(`Plugin definitions validation failed: ${detail}`);
  }
  validatePluginDefinitionsSemantics(payload);
}
function validatePluginDefinitionsSemantics(payload) {
  const libSeen = /* @__PURE__ */ new Set();
  for (const lib of payload.libraries) {
    if (libSeen.has(lib.libraryUUID)) {
      throw new Error(`Duplicate libraryUUID in payload: ${lib.libraryUUID}`);
    }
    libSeen.add(lib.libraryUUID);
  }
  const unitIdSeen = /* @__PURE__ */ new Set();
  const typeIdSeen = /* @__PURE__ */ new Set();
  const unitByTypeId = /* @__PURE__ */ new Map();
  for (const unit of payload.units) {
    if (unitIdSeen.has(unit.unitId)) {
      throw new Error(`Duplicate unitId in payload: ${unit.unitId}`);
    }
    unitIdSeen.add(unit.unitId);
    if (typeIdSeen.has(unit.typeId)) {
      throw new Error(`Duplicate typeId in payload: ${unit.typeId}`);
    }
    typeIdSeen.add(unit.typeId);
    unitByTypeId.set(unit.typeId, unit);
  }
  for (const unit of payload.units) {
    if (unit.libraryUUID && !libSeen.has(unit.libraryUUID)) {
      throw new Error(`Unit ${unit.typeId} references unknown libraryUUID ${unit.libraryUUID}`);
    }
    if (unit.plugin.unitId !== unit.unitId) {
      throw new Error(`Unit ${unit.typeId}: plugin.unitId must match unitId`);
    }
    if (unit.defaultData && Object.prototype.hasOwnProperty.call(unit.defaultData, "appearance")) {
      throw new Error(`Unit ${unit.typeId}: defaultData.appearance is not allowed`);
    }
    validateUnitTypeFields(unit);
    validateAppearanceReferences(unit);
  }
  const builtinUnitUuidSeen = /* @__PURE__ */ new Set();
  for (const unit of payload.builtinUnits ?? []) {
    validateBuiltinUnitTree(
      unit,
      `builtinUnits.${unit.uuid || "<unknown>"}`,
      unitByTypeId,
      builtinUnitUuidSeen,
      true
    );
  }
}
function validateBuiltinUnitTree(unit, path, unitByTypeId, builtinUnitUuidSeen, isRoot = false) {
  if (!unit || typeof unit !== "object" || Array.isArray(unit)) {
    throw new Error(`builtinUnits entry ${path} must be an object`);
  }
  const candidate = unit;
  const label = typeof candidate.uuid === "string" && candidate.uuid.length > 0 ? candidate.uuid : path;
  if (Object.prototype.hasOwnProperty.call(candidate, "plugin")) {
    if (isRoot) throw new Error(`Builtin unit ${label}: plugin metadata is not allowed on the root template`);
    const definition = unitByTypeId.get(String(candidate.typeId));
    const plugin = candidate.plugin;
    if (!definition || !plugin || plugin.pluginUUID !== definition.plugin.pluginUUID || plugin.pluginVersion !== definition.plugin.pluginVersion || plugin.unitId !== definition.unitId || plugin.type !== definition.plugin.type) {
      throw new Error(`Builtin unit ${label}: nested plugin unit metadata must match a registered plugin unit`);
    }
  }
  validateBuiltinUnitTemplateShape(candidate, label);
  if (typeof candidate.uuid === "string") {
    if (builtinUnitUuidSeen.has(candidate.uuid)) {
      throw new Error(`Duplicate builtin unit uuid in payload: ${candidate.uuid}`);
    }
    builtinUnitUuidSeen.add(candidate.uuid);
  }
  if (candidate.pluginTemplate !== void 0) {
    validateBuiltinPluginTemplateBinding(candidate.pluginTemplate, label, unitByTypeId);
  }
  const nested = candidate.data?.layoutData;
  if (!Array.isArray(nested)) return;
  nested.forEach((child, index) => {
    validateBuiltinUnitTree(
      child,
      `${label}.data.layoutData[${index}]`,
      unitByTypeId,
      builtinUnitUuidSeen
    );
  });
}
function validateBuiltinUnitTemplateShape(candidate, label) {
  for (const key of BUILTIN_UNIT_REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
      throw new Error(`Builtin unit ${label}: required field ${key} is missing`);
    }
  }
  for (const key of Object.keys(candidate)) {
    if (!BUILTIN_UNIT_ALLOWED_KEYS.has(key)) {
      throw new Error(`Builtin unit ${label}: unexpected top-level key ${key} is not allowed`);
    }
  }
  if (candidate.fixedAppearance !== void 0 && typeof candidate.fixedAppearance !== "boolean") {
    throw new Error(`Builtin unit ${label}: fixedAppearance must be a boolean`);
  }
  for (const key of ["uuid", "typeId"]) {
    if (typeof candidate[key] !== "string" || candidate[key].length === 0) {
      throw new Error(`Builtin unit ${label}: ${key} must be a non-empty string`);
    }
  }
  if (!isPluginDisplayText(candidate.name)) {
    throw new Error(`Builtin unit ${label}: name must be a non-empty string or localized text`);
  }
  if (typeof candidate.icon !== "string") {
    throw new Error(`Builtin unit ${label}: icon must be a string`);
  }
  if (!isPlainObject(candidate.config)) {
    throw new Error(`Builtin unit ${label}: config must be an object`);
  }
  validateBuiltinGeometry(candidate.geometry, `Builtin unit ${label}: geometry`);
  if (!Array.isArray(candidate.appearance)) {
    throw new Error(`Builtin unit ${label}: appearance must be an array`);
  }
  validateBuiltinAppearance(candidate.appearance, label);
  if (!isPlainObject(candidate.data)) {
    throw new Error(`Builtin unit ${label}: data must be an object`);
  }
}
function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isPluginDisplayText(value) {
  if (typeof value === "string") return value.length > 0;
  if (!isPlainObject(value) || typeof value.default !== "string" || value.default.length === 0) return false;
  if (value.translations === void 0) return true;
  if (!isPlainObject(value.translations)) return false;
  return Object.values(value.translations).every((translation) => typeof translation === "string");
}
function validateBuiltinGeometry(value, path) {
  if (!isPlainObject(value)) {
    throw new Error(`${path} must be an object`);
  }
  for (const key of GEOMETRY_REQUIRED_KEYS) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      throw new Error(`${path}.${key} must be a finite number`);
    }
  }
}
function validateBuiltinAppearance(appearance, label) {
  appearance.forEach((entry, appearanceIndex) => {
    const appearancePath = `Builtin unit ${label}: appearance[${appearanceIndex}]`;
    if (!isPlainObject(entry)) {
      throw new Error(`${appearancePath} must be an object`);
    }
    if (!isPlainObject(entry.background)) {
      throw new Error(`${appearancePath}.background must be an object`);
    }
    if (!Array.isArray(entry.elements)) {
      throw new Error(`${appearancePath}.elements must be an array`);
    }
    entry.elements.forEach((element, elementIndex) => {
      validateBuiltinAppearanceElement(
        element,
        `${appearancePath}.elements[${elementIndex}]`
      );
    });
  });
}
function validateBuiltinAppearanceElement(element, path) {
  if (!isPlainObject(element)) {
    throw new Error(`${path} must be an object`);
  }
  for (const key of BUILTIN_APPEARANCE_ELEMENT_REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(element, key)) {
      throw new Error(`${path}.${key} is required`);
    }
  }
  for (const key of ["typeId", "uuid"]) {
    if (typeof element[key] !== "string" || element[key].length === 0) {
      throw new Error(`${path}.${key} must be a non-empty string`);
    }
  }
  for (const key of ["config", "style", "data"]) {
    if (!isPlainObject(element[key])) {
      throw new Error(`${path}.${key} must be an object`);
    }
  }
  validateBuiltinGeometry(element.geometry, `${path}.geometry`);
}
function validateBuiltinPluginTemplateBinding(pluginTemplate, label, unitByTypeId) {
  if (!pluginTemplate || typeof pluginTemplate !== "object" || Array.isArray(pluginTemplate)) {
    throw new Error(`Builtin unit ${label}: pluginTemplate must be an object`);
  }
  const binding = pluginTemplate;
  const allowedKeys = /* @__PURE__ */ new Set(["pluginUUID", "unitId", "editorTypeId"]);
  for (const key of Object.keys(binding)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Builtin unit ${label}: pluginTemplate.${key} is not allowed`);
    }
  }
  for (const key of ["pluginUUID", "unitId", "editorTypeId"]) {
    if (typeof binding[key] !== "string" || binding[key].length === 0) {
      throw new Error(`Builtin unit ${label}: pluginTemplate.${key} must be a non-empty string`);
    }
  }
  const editor = unitByTypeId.get(binding.editorTypeId);
  if (!editor) {
    throw new Error(
      `Builtin unit ${label}: pluginTemplate.editorTypeId ${binding.editorTypeId} is not registered`
    );
  }
  if (editor.plugin.pluginUUID !== binding.pluginUUID) {
    throw new Error(
      `Builtin unit ${label}: pluginTemplate editor ${binding.editorTypeId} pluginUUID ${editor.plugin.pluginUUID} does not match ${binding.pluginUUID}`
    );
  }
  if (editor.hasFunctionEditor !== true) {
    throw new Error(
      `Builtin unit ${label}: pluginTemplate editor ${binding.editorTypeId} must declare hasFunctionEditor: true`
    );
  }
}
function validateUnitTypeFields(unit) {
  const type = unit.plugin.type;
  if (type === "panel") resolvePluginPanelDefinition(unit.panel);
  const disallowClick = /* @__PURE__ */ new Set(["slider", "button-group", "value-label", "label"]);
  if (unit.interactionMode === "click" && disallowClick.has(type)) {
    throw new Error(`Unit ${unit.typeId}: plugin.type '${type}' cannot declare interactionMode 'click'`);
  }
  if (unit.defaultActivation) {
    const clickCapable = (type === "standard" || type === "custom") && unit.interactionMode === "click" || type === "cycled" && unit.interactionMode !== "display" && unit.interactionMode !== "continuous";
    if (!clickCapable) {
      throw new Error(`Unit ${unit.typeId}: defaultActivation requires a click-capable unit`);
    }
    const ms = unit.defaultActivation.holdDurationMs;
    if (ms !== void 0 && (!Number.isFinite(ms) || ms < 300 || ms > 3e3 || ms % 100 !== 0)) {
      throw new Error(`Unit ${unit.typeId}: defaultActivation.holdDurationMs must be 300-3000 in 100ms steps`);
    }
  }
  if (type === "custom") {
    if (!unit.hasView) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'custom' requires hasView: true`);
    }
    return;
  }
  if (unit.hasView) {
    throw new Error(`Unit ${unit.typeId}: plugin.type '${type}' cannot have hasView: true`);
  }
  if (unit.hasAppearanceEditor) {
    throw new Error(
      `Unit ${unit.typeId}: hasAppearanceEditor is only allowed for plugin.type 'custom'`
    );
  }
  if (type === "canvas") {
    if (unit.appearanceOverride) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'canvas' cannot have appearanceOverride`);
    }
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'canvas' cannot have functions`);
    }
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'canvas' cannot have slider`);
    }
    validateNoRuntimeLabelFields(unit);
    return;
  }
  if (type === "standard") {
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'standard' cannot have functions`);
    }
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'standard' cannot have slider`);
    }
    validateNoRuntimeLabelFields(unit);
    return;
  }
  if (type === "cycled") {
    validateCycledFunctions(unit);
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'cycled' cannot have slider`);
    }
    validateNoRuntimeLabelFields(unit);
    return;
  }
  if (type === "slider") {
    if (!unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'slider' requires slider`);
    }
    resolvePluginSliderConfig(unit.slider);
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'slider' cannot have functions`);
    }
    validateNoRuntimeLabelFields(unit);
    return;
  }
  if (type === "button-group") {
    if (!unit.buttonGroup) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' requires buttonGroup`);
    }
    validateButtonGroupDefinition(unit);
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' cannot have functions`);
    }
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' cannot have slider`);
    }
    if (unit.valueLabel) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' cannot have valueLabel`);
    }
    if (unit.label) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' cannot have label`);
    }
    if (unit.appearanceOverride) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'button-group' cannot have appearanceOverride`);
    }
    return;
  }
  if (type === "value-label") {
    if (!unit.valueLabel) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'value-label' requires valueLabel`);
    }
    resolvePluginValueLabelConfig(unit.valueLabel);
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'value-label' cannot have functions`);
    }
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'value-label' cannot have slider`);
    }
    if (unit.label) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'value-label' cannot have label`);
    }
    return;
  }
  if (type === "label") {
    if (!unit.label) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'label' requires label`);
    }
    if (unit.label.fontFamily !== "puhuiti" && unit.label.fontFamily !== "consola") {
      throw new Error(`Unit ${unit.typeId}: label.fontFamily must be 'puhuiti' or 'consola'`);
    }
    if (unit.functions) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'label' cannot have functions`);
    }
    if (unit.slider) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'label' cannot have slider`);
    }
    if (unit.valueLabel) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'label' cannot have valueLabel`);
    }
  }
}
function validateButtonGroupDefinition(unit) {
  if (unit.plugin.type !== "button-group") return;
  const buttons = unit.buttonGroup?.buttons ?? [];
  if (buttons.length < 2) {
    throw new Error(`button-group '${unit.typeId}' must declare at least two buttons`);
  }
  const seen = /* @__PURE__ */ new Set();
  for (const button of buttons) {
    const id2 = button.buttonId;
    const normalizedId = id2.trim();
    if (!normalizedId) {
      throw new Error(`button-group '${unit.typeId}' has an empty buttonId`);
    }
    if (normalizedId !== id2) {
      throw new Error(`button-group '${unit.typeId}' buttonId '${id2}' must not have leading or trailing whitespace`);
    }
    if (seen.has(id2)) {
      throw new Error(`Duplicate button-group buttonId '${id2}' in '${unit.typeId}'`);
    }
    seen.add(id2);
  }
  const defaultSeen = /* @__PURE__ */ new Set();
  const defaultActiveButtonIds = unit.buttonGroup?.defaultActiveButtonIds ?? [];
  const selectionMode = unit.buttonGroup?.selectionMode ?? "single";
  const hasExplicitDefaultActiveButtonIds = unit.buttonGroup !== void 0 && Object.prototype.hasOwnProperty.call(unit.buttonGroup, "defaultActiveButtonIds");
  if (hasExplicitDefaultActiveButtonIds && defaultActiveButtonIds.length === 0 && unit.buttonGroup?.mandatory !== false) {
    throw new Error(`button-group '${unit.typeId}' mandatory groups cannot declare empty defaultActiveButtonIds`);
  }
  for (const activeId of defaultActiveButtonIds) {
    const normalizedActiveId = activeId.trim();
    if (!normalizedActiveId) {
      throw new Error(`button-group '${unit.typeId}' defaultActiveButtonIds contains an empty buttonId`);
    }
    if (normalizedActiveId !== activeId) {
      throw new Error(
        `button-group '${unit.typeId}' defaultActiveButtonIds buttonId '${activeId}' must not have leading or trailing whitespace`
      );
    }
    if (defaultSeen.has(activeId)) {
      throw new Error(`Duplicate button-group defaultActiveButtonId '${activeId}' in '${unit.typeId}'`);
    }
    defaultSeen.add(activeId);
    if (!seen.has(activeId)) {
      throw new Error(`button-group '${unit.typeId}' defaultActiveButtonIds contains unknown buttonId '${activeId}'`);
    }
  }
  if (selectionMode === "single" && defaultActiveButtonIds.length > 1) {
    throw new Error(`button-group '${unit.typeId}' selectionMode 'single' cannot declare multiple defaultActiveButtonIds`);
  }
}
function validateNoRuntimeLabelFields(unit) {
  if (unit.valueLabel) {
    throw new Error(`Unit ${unit.typeId}: plugin.type '${unit.plugin.type}' cannot have valueLabel`);
  }
  if (unit.label) {
    throw new Error(`Unit ${unit.typeId}: plugin.type '${unit.plugin.type}' cannot have label`);
  }
}
function validateAppearanceReferences(unit) {
  const overrides = unit.plugin.type === "cycled" ? (unit.functions ?? []).map((fn) => fn.appearanceOverride) : unit.plugin.type === "standard" || unit.plugin.type === "slider" ? [unit.appearanceOverride] : [];
  for (const override of overrides) {
    for (const element of override?.elements ?? []) {
      if (element.identifier !== void 0) {
        if (element.identifier !== PRIMARY_TEXT_IDENTIFIER && element.identifier !== PRIMARY_ICON_IDENTIFIER) {
          throw new Error(`Unit ${unit.typeId}: Unknown plugin appearance element identifier: ${element.identifier}`);
        }
      } else if (!element.typeId || !element.uuid || !isPlainObject(element.config) || !isPlainObject(element.style) || !isPlainObject(element.data) || !isPlainObject(element.geometry) || !GEOMETRY_REQUIRED_KEYS.every((key) => Number.isFinite(element.geometry?.[key]))) {
        throw new Error(`Unit ${unit.typeId}: Plugin appearance appended element must be a complete element`);
      }
    }
  }
}
function validateCycledFunctions(unit) {
  if (!Array.isArray(unit.functions) || unit.functions.length < 2) {
    throw new Error(`Unit ${unit.typeId}: plugin.type 'cycled' requires at least 2 functions`);
  }
  const functionIds = /* @__PURE__ */ new Set();
  for (const fn of unit.functions) {
    const functionId = fn.functionId;
    if (typeof functionId !== "string") {
      throw new Error(`Unit ${unit.typeId}: cycled functionId must be a non-empty string`);
    }
    const normalizedFunctionId = functionId.trim();
    if (normalizedFunctionId.length === 0) {
      throw new Error(`Unit ${unit.typeId}: cycled functionId must be a non-empty string`);
    }
    if (normalizedFunctionId !== functionId) {
      throw new Error(`Unit ${unit.typeId}: cycled functionId must not have leading or trailing whitespace`);
    }
    if (functionIds.has(normalizedFunctionId)) {
      throw new Error(`Unit ${unit.typeId}: Duplicate functionId '${normalizedFunctionId}'`);
    }
    functionIds.add(normalizedFunctionId);
  }
}
export {
  PLUGIN_DEFINITIONS_JSON_SCHEMA,
  validatePluginDefinitionsPayload
};
