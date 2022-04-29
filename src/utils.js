import os from "os";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "http://github.com/suprsend/suprsend-node-sdk/request_json/workflow.json",
  title: "workflow_request",
  description: "Json schema for workflow request",
  $comment: "Json schema for workflow request",
  type: "object",
  properties: {
    name: {
      $ref: "#/definitions/non_empty_string",
      description: "name of workflow",
    },
    template: {
      $ref: "#/definitions/non_empty_string",
      description: "slug of Template",
    },
    notification_category: {
      $ref: "#/definitions/non_empty_string",
      description: "slug of Notification category",
    },
    delay: {
      type: ["string", "integer"],
      minimum: 0,
      description:
        "If string: format [XX]d[XX]h[XX]m[XX]s e.g 1d2h30m10s(for 1day 2hours 30minutes 10sec). If integer: value in number of seconds",
    },
    trigger_at: {
      $ref: "#/definitions/non_empty_string",
      description: "timestamp in ISO-8601 format. e.g 2021-08-27T20:14:51.643Z",
    },
    priority_algorithm: { type: "boolean" },
    users: {
      type: "array",
      items: { $ref: "#/definitions/user_setting" },
      minItems: 1,
      maxItems: 100,
      description:
        "user object to run workflow for. At least 1 user is required",
    },
    data: {
      type: "object",
      description:
        "variables to be used in workflow. e.g replacing templates variables.",
    },
  },
  required: ["name", "template", "notification_category", "users", "data"],
  definitions: {
    non_empty_string: {
      type: "string",
      minLength: 2,
    },
    mobile_number_pattern: {
      type: "string",
      minLength: 8,
      pattern: "^\\+[0-9\\s]+",
      message: {
        required:
          'Either a mobile-number or an array of mobile-numbers. e.g ["41446681800"]',
        pattern:
          "number must start with + and must contain country code. e.g. +41446681800",
      },
    },
    email_pattern: {
      type: "string",
      format: "email",
      pattern: "^\\S+@\\S+\\.\\S+$",
      description: "email of an user",
      minLength: 6,
      maxLength: 127,
      message: {
        required: "",
        pattern: "value in email format required. e.g. user@example.com",
      },
    },
    user_setting: {
      type: "object",
      properties: {
        distinct_id: { $ref: "#/definitions/non_empty_string" },
        $email: {
          oneOf: [
            { $ref: "#/definitions/email_pattern" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/email_pattern" },
            },
          ],
        },
        $sms: {
          oneOf: [
            { $ref: "#/definitions/mobile_number_pattern" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/mobile_number_pattern" },
            },
          ],
        },
        $androidpush: {
          oneOf: [
            { $ref: "#/definitions/non_empty_string" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/non_empty_string" },
            },
          ],
        },
        $iospush: {
          oneOf: [
            { $ref: "#/definitions/non_empty_string" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/non_empty_string" },
            },
          ],
        },
        $whatsapp: {
          oneOf: [
            { $ref: "#/definitions/mobile_number_pattern" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/mobile_number_pattern" },
            },
          ],
        },
        $webpush: {
          oneOf: [
            { type: "object", minProperties: 1 },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { type: "object", minProperties: 1 },
            },
          ],
        },
        $inbox: {
          oneOf: [
            { $ref: "#/definitions/non_empty_string" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/non_empty_string" },
            },
          ],
        },
        $messenger: {
          oneOf: [
            { $ref: "#/definitions/non_empty_string" },
            {
              type: "array",
              uniqueItems: true,
              maxItems: 10,
              minItems: 1,
              items: { $ref: "#/definitions/non_empty_string" },
            },
          ],
        },
      },
      required: ["distinct_id"],
      additionalProperties: false,
    },
  },
};

export function base64Encode(file) {
  var body = fs.readFileSync(file);
  return body.toString("base64");
}

export function resolveTilde(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "";
  }

  if (filePath.startsWith("~/") || filePath === "~") {
    return filePath.replace("~", os.homedir());
  }

  return filePath;
}

let __JSON_SCHEMAS = {};

export function _get_schema(schema_name) {
  var schema_body = __JSON_SCHEMAS[schema_name];
  if (!schema_body) {
    schema_body = schema;
    __JSON_SCHEMAS[schema_name] = schema_body;
  }
  return schema_body;
}

function _load_json_schema(schema_name) {
  var file_path = path.join(__dirname, `request_json/${schema_name}.json`);
  var json_schema;
  try {
    var schema_string = fs.readFileSync(file_path, "utf8");
    json_schema = JSON.parse(schema_string);
  } catch (e) {
    throw new SuprsendError("Missing Schema");
  }
  return json_schema;
}

export class SuprsendError extends Error {
  constructor(message) {
    super(message);
    this.name = "SuprsendError";
  }
}

export function is_string(value) {
  return typeof value === "string";
}

export function is_object(value) {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}

export function is_empty(value) {
  if (is_object(value)) {
    return Object.keys(value) <= 0;
  } else if (Array.isArray(value)) {
    return value.length <= 0;
  }
}

export const has_special_char = (str) => {
  return str.startsWith("$") || str?.toLowerCase()?.startsWith("ss_");
};

export function uuid() {
  return uuidv4();
}

export function epoch_milliseconds() {
  return Math.round(Date.now());
}
