const PANEL_DEFINITION_JSON_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "sessionCatalogMethod": {
      "type": "string",
      "minLength": 1
    },
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
              "telemetry": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "provider": {
                    "enum": [
                      "codex",
                      "claude"
                    ]
                  },
                  "model": {
                    "type": "string",
                    "pattern": "^[^\\u0000]*$"
                  },
                  "effort": {
                    "type": "string",
                    "pattern": "^[^\\u0000]*$"
                  },
                  "tokensPerSecond": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1e5
                  },
                  "progressPercent": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100
                  }
                }
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
                  },
                  "elapsedMs": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 9007199254740991
                  }
                }
              },
              "pages": {
                "type": "array",
                "maxItems": 8,
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
                        },
                        "elapsedMs": {
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
                          },
                          "description": {
                            "type": "string",
                            "pattern": "^[^\\u0000]*$"
                          },
                          "buttonLabel": {
                            "type": "string",
                            "pattern": "^[^\\u0000]*$",
                            "minLength": 1
                          },
                          "icon": {
                            "enum": [
                              "open-in-new"
                            ]
                          }
                        },
                        "dependencies": {
                          "buttonLabel": [
                            "description"
                          ]
                        }
                      }
                    },
                    "layout": {
                      "const": "decision"
                    }
                  }
                }
              },
              "activity": {
                "type": "string",
                "pattern": "^[^\\u0000]*$"
              },
              "slot": {
                "type": "integer",
                "minimum": 1,
                "maximum": 8
              }
            }
          }
        },
        "pagination": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "offset",
            "total"
          ],
          "properties": {
            "offset": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "total": {
              "type": "integer",
              "minimum": 1,
              "maximum": 9007199254740991
            }
          }
        },
        "layout": {
          "const": "sessions"
        },
        "noticeIcon": {
          "enum": [
            "power",
            "loading",
            "link-off",
            "inbox"
          ]
        },
        "navigation": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "token",
            "view",
            "item"
          ],
          "properties": {
            "token": {
              "type": "string",
              "minLength": 1,
              "pattern": "^[^\\u0000]*$",
              "maxLength": 64
            },
            "view": {
              "enum": [
                "overview",
                "detail"
              ]
            },
            "item": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "pattern": "^[^\\u0000]*$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "page": {
              "type": "string",
              "minLength": 1,
              "pattern": "^[^\\u0000]*$"
            },
            "action": {
              "type": "string",
              "minLength": 1,
              "pattern": "^[^\\u0000]*$"
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "view": {
                    "const": "overview"
                  }
                }
              },
              "then": {
                "not": {
                  "anyOf": [
                    {
                      "required": [
                        "page"
                      ]
                    },
                    {
                      "required": [
                        "action"
                      ]
                    }
                  ]
                }
              },
              "else": {
                "properties": {
                  "item": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^[^\\u0000]*$"
                  }
                }
              }
            }
          ]
        }
      }
    }
  }
};
export {
  PANEL_DEFINITION_JSON_SCHEMA
};
