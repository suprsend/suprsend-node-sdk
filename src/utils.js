import os from "os";
import fs from "fs";
import { Validator } from "jsonschema";
import { v4 as uuidv4 } from "uuid";
import {
  WORKFLOW_RUNTIME_KEYS_POTENTIAL_SIZE_IN_BYTES,
  ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES,
  ATTACHMENT_UPLOAD_ENABLED,
  ALLOW_ATTACHMENTS_IN_BULK_API,
} from "./constants";
import { cloneDeep } from "lodash";

const workflow_schema = require("./request_json/workflow.json");

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

export class SuprsendConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "SuprsendConfigError";
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

export function validate_workflow_body_schema(body) {
  if (!body?.data) {
    body.data = {};
  }
  if (!(body.data instanceof Object)) {
    throw new SuprsendError("data must be a object");
  }
  const schema = workflow_schema;
  var v = new Validator();
  const validated_data = v.validate(body, schema);
  if (validated_data.valid) {
    return body;
  } else {
    const error_obj = validated_data.errors[0];
    const error_msg = `${error_obj.property} ${error_obj.message}`;
    throw new SuprsendError(error_msg);
  }
}

export function get_apparent_workflow_body_size(body, is_part_of_bulk) {
  let extra_bytes = WORKFLOW_RUNTIME_KEYS_POTENTIAL_SIZE_IN_BYTES;
  let apparent_body = body;
  if (body?.data["$attachments"]) {
    const num_attachments = body.data["$attachments"].length;
    if (is_part_of_bulk) {
      if (ALLOW_ATTACHMENTS_IN_BULK_API) {
        if (ATTACHMENT_UPLOAD_ENABLED) {
          extra_bytes +=
            num_attachments * ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES;
          apparent_body = cloneDeep(body);
          for (let attach_data of apparent_body["data"]["$attachments"]) {
            delete attach_data["data"];
          }
        } else {
          // pass
        }
      } else {
        apparent_body = cloneDeep(body);
        delete apparent_body["data"]["$attachments"];
      }
    } else {
      if (ATTACHMENT_UPLOAD_ENABLED) {
        extra_bytes += num_attachments * ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES;
        apparent_body = cloneDeep(body);
        for (let attach_data of apparent_body["data"]["$attachments"]) {
          delete attach_data["data"];
        }
      } else {
        // pass
      }
    }
  }
  const body_size = JSON.stringify(apparent_body).length;
  const apparent_body_size = body_size + extra_bytes;
  return apparent_body_size;
}
