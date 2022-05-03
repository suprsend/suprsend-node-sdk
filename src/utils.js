import os from "os";
import fs from "fs";
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
