import axios from "axios";
import get_request_signature from "./signature";
import {
  SuprsendError,
  validate_workflow_body_schema,
  get_apparent_workflow_body_size,
  InputValueError,
} from "./utils";
import get_attachment_json from "./attachment";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";

export default class Workflow {
  constructor(body, kwargs = {}) {
    if (!(body instanceof Object)) {
      throw new InputValueError("workflow body must be a json/dictionary");
    }
    this.body = body;
    this.idempotency_key = kwargs?.idempotency_key;
    this.tenant_id = kwargs?.tenant_id;
    this.brand_id = kwargs?.brand_id;
  }

  add_attachment(file_path = "", kwargs = {}) {
    const file_name = kwargs?.file_name;
    const ignore_if_error = kwargs?.ignore_if_error ?? false;
    if (!this.body?.data) {
      this.body.data = {};
    }
    // if body["data"] is not a dict, not raising error while adding attachment.
    if (!(this.body["data"] instanceof Object)) {
      console.log(
        `WARNING: attachment cannot be added. please make sure body['data'] is a dictionary. Workflow ${JSON.stringify(
          JSON.stringify(this.as_json())
        )}`
      );
      return;
    }
    const attachment = get_attachment_json(
      file_path,
      file_name,
      ignore_if_error
    );
    if (!attachment) {
      return;
    }
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
    if (this.tenant_id) {
      this.body["tenant_id"] = this.tenant_id;
    }
    if (this.brand_id) {
      this.body["brand_id"] = this.brand_id;
    }
    this.body = validate_workflow_body_schema(this.body);
    const apparent_size = get_apparent_workflow_body_size(
      this.body,
      is_part_of_bulk
    ); // review
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `workflow body too big - ${apparent_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [this.body, apparent_size];
  }

  as_json() {
    const body_dict = { ...this.body };
    if (this.idempotency_key) {
      body_dict["$idempotency_key"] = this.idempotency_key;
    }
    if (this.tenant_id) {
      body_dict["tenant_id"] = this.tenant_id;
    }
    if (this.brand_id) {
      body_dict["brand_id"] = this.brand_id;
    }
    return body_dict;
  }
}

export class _WorkflowTrigger {
  constructor(config) {
    this.config = config;
    this.url = this._get_url();
  }

  _get_url() {
    return `${this.config.base_url}${this.config.workspace_key}/trigger/`;
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

    const signature = get_request_signature(
      this.url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

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
