import os from "os";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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
    schema_body = _load_json_schema(schema_name);
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
