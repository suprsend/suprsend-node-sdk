import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  MAX_WORKFLOWS_IN_BULK_API,
  ALLOW_ATTACHMENTS_IN_BULK_API,
} from "./constants";
import { SuprsendError } from "./utils";
import Workflow from "./workflow";
import { cloneDeep } from "lodash";
import axios from "axios";
import BulkResponse from "./bulk_response";
import get_request_signature from "./signature";

export class BulkWorkflowsFactory {
  constructor(config) {
    this.config = config;
  }

  new_instance() {
    return new BulkWorkflows(this.config);
  }
}

class _BulkWorkflowsChunk {
  constructor(config) {
    this.config = config;
    this.__chunk = [];
    this.__url = this.__get_url();
    this.__headers = this.__common_headers();

    this.__running_size = 0;
    this.__running_length = 0;
    this.response;
  }

  __get_url() {
    return `${this.config.base_url}${this.config.workspace_key}/trigger/`;
  }

  __common_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
    };
  }

  __dynamic_headers() {
    return {
      Date: new Date().toUTCString(),
    };
  }

  __add_body_to_chunk(body, body_size) {
    //  First add size, then body to reduce effects of race condition
    this.__running_size += body_size;
    this.__chunk.push(body);
    this.__running_length += 1;
  }

  __check_limit_reached() {
    if (
      this.__running_length >= MAX_WORKFLOWS_IN_BULK_API ||
      this.__running_size >= BODY_MAX_APPARENT_SIZE_IN_BYTES
    ) {
      return true;
    } else {
      return false;
    }
  }

  try_to_add_into_chunk(body, body_size) {
    if (!body) {
      return true;
    }
    if (this.__check_limit_reached()) {
      return false;
    }
    if (body_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `workflow body too big - ${body_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    if (this.__running_size + body_size > BODY_MAX_APPARENT_SIZE_IN_BYTES) {
      return false;
    }
    if (!ALLOW_ATTACHMENTS_IN_BULK_API) {
      delete body.data["$attachments"];
    }

    this.__add_body_to_chunk(body, body_size);
    return true;
  }

  async trigger() {
    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify(this.__chunk);

    const signature = get_request_signature(
      this.__url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(this.__url, content_text, { headers });
      const ok_response = Math.floor(response.status / 100) == 2;
      if (ok_response) {
        this.response = {
          status: "success",
          status_code: response.status,
          total: this.__chunk.length,
          success: this.__chunk.length,
          failure: 0,
          failed_records: [],
        };
      } else {
        this.response = {
          status: "fail",
          status_code: response.status,
          total: this.__chunk.length,
          success: 0,
          failure: this.__chunk.length,
          failed_records: this.__chunk.map((item) => ({
            record: item,
            error: response.statusText,
            code: response.status,
          })),
        };
      }
    } catch (err) {
      const error_status = err.status || 500;
      this.response = {
        status: "fail",
        status_code: error_status,
        message: err.message,
        total: this.__chunk.length,
        success: 0,
        failure: this.__chunk.length,
        failed_records: this.__chunk.map((item) => ({
          record: item,
          error: err.message,
          code: error_status,
        })),
      };
    }
  }
}

class BulkWorkflows {
  constructor(config) {
    this.config = config;
    this.__workflows = [];
    this.__pending_records = [];
    this.chunks = [];
    this.response = new BulkResponse();
  }

  __validate_workflows() {
    if (!this.__workflows) {
      throw new SuprsendError("workflow list is empty in bulk request");
    }
    for (let wf of this.__workflows) {
      const is_part_of_bulk = true;
      const [wf_body, body_size] = wf.get_final_json(
        this.config,
        is_part_of_bulk
      );
      this.__pending_records.push([wf_body, body_size]);
    }
  }

  __chunkify(start_idx = 0) {
    const curr_chunk = new _BulkWorkflowsChunk(this.config);
    this.chunks.push(curr_chunk);
    const entries = this.__pending_records.slice(start_idx).entries();
    for (const [rel_idx, rec] of entries) {
      const is_added = curr_chunk.try_to_add_into_chunk(rec[0], rec[1]);
      if (!is_added) {
        // create chunks from remaining records
        this.__chunkify(start_idx + rel_idx);
        // Don't forget to break. As current loop must not continue further
        break;
      }
    }
  }

  append(...workflows) {
    if (!workflows) {
      throw new SuprsendError(
        "workflow list empty. must pass one or more valid workflow instances"
      );
    }
    for (let wf of workflows) {
      if (!wf) {
        throw new SuprsendError("null/empty element found in bulk instance");
      }
      if (!(wf instanceof Workflow)) {
        throw new SuprsendError(
          "element must be an instance of suprsend.Workflow"
        );
      }
      const wf_copy = cloneDeep(wf);
      this.__workflows.push(wf_copy);
    }
  }

  async trigger() {
    this.__validate_workflows();
    this.__chunkify();
    for (const [c_idx, ch] of this.chunks.entries()) {
      if (this.config.req_log_level > 0) {
        console.log(`DEBUG: triggering api call for chunk: ${c_idx}`);
      }
      // do api call
      await ch.trigger();
      // merge response
      this.response.merge_chunk_response(ch.response);
    }
    return this.response;
  }
}
