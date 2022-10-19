import axios from "axios";
import get_request_signature from "./signature";
import {
  SuprsendError,
  validate_workflow_body_schema,
  get_apparent_workflow_body_size,
} from "./utils";
import get_attachment_json from "./attachment";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";

export default class Workflow {
  constructor(body, idempotency_key) {
    if (!(body instanceof Object)) {
      throw new SuprsendError("workflow body must be a json/dictionary");
    }
    this.body = body;
    this.idempotency_key = idempotency_key;
  }

  add_attachment(file_path = "", file_name, ignore_if_error = false) {
    if (!this.body.data) {
      this.body.data = {};
    }
    if (!(this.body instanceof Object)) {
      throw new SuprsendError("data must be a dictionary");
    }
    const attachment = get_attachment_json(
      file_path,
      file_name,
      ignore_if_error
    );

    if (!this.body.data["$attachments"]) {
      this.body["data"]["$attachments"] = [];
    }
    this.body["data"]["$attachments"].push(attachment);
  }

  get_final_json(config, is_part_of_bulk = false) {
    // add idempotency key in body if present
    if (this.idempotency_key) {
      this.body["$idempotency_key"] = this.idempotency_key;
    }
    this.body = validate_workflow_body_schema(this.body);
    const apparent_size = get_apparent_workflow_body_size(
      this.body,
      is_part_of_bulk
    ); // review
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `workflow body too big - ${apparent_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [this.body, apparent_size];
  }
}

export class _WorkflowTrigger {
  constructor(config) {
    this.config = config;
    this.url = this._get_url();
  }

  _get_url() {
    let url_template = "/trigger/";
    if (this.config.include_signature_param) {
      if (this.config.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    const url_formatted = `${this.config.base_url}${this.config.workspace_key}${url_template}`;
    return url_formatted;
  }

  _get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
    };
  }

  trigger(workflow) {
    const is_part_of_bulk = false;
    const [workflow_body, body_size] = workflow.get_final_json(
      this.config,
      is_part_of_bulk
    );
    return this.send(workflow_body);
  }

  async send(workflow_body) {
    const headers = this._get_headers();
    const content_text = JSON.stringify(workflow_body);
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        this.url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }

    try {
      const response = await axios.post(this.url, content_text, { headers });
      const ok_response = Math.floor(response.status / 100) == 2;
      if (ok_response) {
        return {
          success: true,
          status: "success",
          status_code: response.status,
          message: response.statusText,
        };
      } else {
        return {
          success: false,
          status: "fail",
          status_code: response.status,
          message: response.statusText,
        };
      }
    } catch (err) {
      return {
        success: false,
        status: "fail",
        status_code: err.status || 500,
        message: err.message,
      };
    }
  }
}
