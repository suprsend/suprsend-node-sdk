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
const workflow_trigger_schema = require("./request_json/workflow_trigger.json");
const event_schema = require("./request_json/event.json");
const list_broadcast_schema = require("./request_json/list_broadcast.json");

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

export class SuprsendApiError extends Error {
  constructor(error) {
    let message;
    if (error.response) {
      message = `${error.response.status}: ${error.response.data.message}`;
    } else {
      message = error.message;
    }
    super(message);
    this.name = "SuprsendApiError";
  }
}

export class InputValueError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputValueError";
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
  } else {
    return !value;
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
    throw new InputValueError("data must be a object");
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

export function validate_workflow_trigger_body_schema(body) {
  if (!body?.data) {
    body.data = {};
  }
  if (!(body.data instanceof Object)) {
    throw new InputValueError("data must be a object");
  }
  const schema = workflow_trigger_schema;
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

export function validate_track_event_schema(body) {
  if (!body?.properties) {
    body.properties = {};
  }
  const schema = event_schema;
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

export function validate_list_broadcast_body_schema(body) {
  if (!body?.data) {
    body.data = {};
  }
  if (!(body.data instanceof Object)) {
    throw new InputValueError("data must be a object");
  }
  const schema = list_broadcast_schema;
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

export function get_apparent_event_size(event, is_part_of_bulk) {
  let extra_bytes = 0;
  let apparent_body = event;
  if (event?.properties?.["$attachments"]) {
    const num_attachments = event.properties["$attachments"].length;
    if (is_part_of_bulk) {
      if (ALLOW_ATTACHMENTS_IN_BULK_API) {
        if (ATTACHMENT_UPLOAD_ENABLED) {
          extra_bytes +=
            num_attachments * ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES;
          apparent_body = cloneDeep(event);
          for (let attach_data of apparent_body["properties"]["$attachments"]) {
            delete attach_data["data"];
          }
        } else {
          // pass
        }
      } else {
        apparent_body = cloneDeep(body);
        delete apparent_body["properties"]["$attachments"];
      }
    } else {
      if (ATTACHMENT_UPLOAD_ENABLED) {
        extra_bytes += num_attachments * ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES;
        apparent_body = cloneDeep(body);
        for (let attach_data of apparent_body["properties"]["$attachments"]) {
          delete attach_data["data"];
        }
      } else {
        // pass
      }
    }
  }
  const body_size = JSON.stringify(apparent_body).length;
  const apparent_size = body_size + extra_bytes;
  return apparent_size;
}

export function get_apparent_identity_event_size(event) {
  const body_size = JSON.stringify(event).length;
  return body_size;
}

export function get_apparent_list_broadcast_body_size(body) {
  const body_size = JSON.stringify(body).length;
  return body_size;
}

export function invalid_record_json(failed_record, err) {
  let err_str;
  if (err instanceof InputValueError) {
    err_str = err.message;
  } else {
    // includes SuprsendValidationError,
    // OR any other error
    err_str = `${err.message}\n${err.stack}`;
  }
  return { record: failed_record, error: err_str, code: 500 };
}
