import axios from "axios";
import { cloneDeep } from "lodash";
import get_request_signature from "./signature";
import BulkResponse from "./bulk_response";
import { invalid_record_json, InputValueError } from "./utils";
import WorkflowTriggerRequest from "./workflow_request";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  MAX_WORKFLOWS_IN_BULK_API,
  ALLOW_ATTACHMENTS_IN_BULK_API,
} from "./constants";

export class _BulkWorkflowTriggerChunk {
  static _chunk_apparent_size_in_bytes = BODY_MAX_APPARENT_SIZE_IN_BYTES;
  static _chunk_apparent_size_in_bytes_readable =
    BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE;
  static _max_records_in_chunk = MAX_WORKFLOWS_IN_BULK_API;

  constructor(config) {
    this.config = config;
    this.url = this.__url = `${this.config.base_url}trigger/`;
    this.__chunk = [];
    this.__running_size = 0;
    this.__running_length = 0;
    this.response = null;
  }

  _get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toUTCString(),
    };
  }

  __add_body_to_chunk(body, body_size) {
    this.__running_size += body_size;
    this.__chunk.push(body);
    this.__running_length++;
  }

  _check_limit_reached() {
    return (
      this.__running_length >=
        _BulkWorkflowTriggerChunk._max_records_in_chunk ||
      this.__running_size >=
        _BulkWorkflowTriggerChunk._chunk_apparent_size_in_bytes
    );
  }

  try_to_add_into_chunk(body, body_size) {
    if (!body) {
      return true;
    }
    if (this._check_limit_reached()) {
      return false;
    }
    if (body_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `workflow body too big - ${body_size} Bytes, must not exceed ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    if (
      this.__running_size + body_size >
      _BulkWorkflowTriggerChunk._chunk_apparent_size_in_bytes
    ) {
      return false;
    }

    if (!ALLOW_ATTACHMENTS_IN_BULK_API) {
      delete body.data["$attachments"];
    }

    this.__add_body_to_chunk(body, body_size);
    return true;
  }

  async trigger() {
    const headers = this._get_headers();
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
      const resp = await axios.post(this.__url, content_text, {
        headers,
        transformResponse: [(data) => data], // dont assume type of response
      });
      this.response = {
        status: "success",
        status_code: resp.status,
        total: this.__chunk.length,
        success: this.__chunk.length,
        failure: 0,
        failed_records: [],
      };
    } catch (err) {
      if (err?.response) {
        const resp_data = err.response;
        this.response = {
          status: "fail",
          status_code: resp_data.status,
          total: this.__chunk.length,
          success: 0,
          failure: this.__chunk.length,
          failed_records: this.__chunk.map((record) => ({
            record: record,
            error: resp_data.data,
            code: resp_data.status,
          })),
        };
      } else {
        this.response = {
          status: "fail",
          status_code: 500,
          total: this.__chunk.length,
          success: 0,
          failure: this.__chunk.length,
          failed_records: this.__chunk.map((record) => ({
            record: record,
            error: err.message,
            code: 500,
          })),
        };
      }
    }
  }
}

export class BulkWorkflowTrigger {
  constructor(config) {
    this.config = config;
    this.__workflows = [];
    this.__pending_records = [];
    this.chunks = [];
    this.response = new BulkResponse();
    // invalid_record json: {"record": workflow-json, "error": error_str, "code": 500}
    this.__invalid_records = [];
  }

  __validate_workflows() {
    for (const wf of this.__workflows) {
      try {
        const is_part_of_bulk = true;
        const [wf_body, body_size] = wf.get_final_json(
          this.config,
          is_part_of_bulk
        );
        this.__pending_records.push([wf_body, body_size]);
      } catch (ex) {
        const inv_rec = invalid_record_json(wf.as_json(), ex);
        this.__invalid_records.push(inv_rec);
      }
    }
  }

  __chunkify(start_idx = 0) {
    const curr_chunk = new _BulkWorkflowTriggerChunk(this.config);
    this.chunks.push(curr_chunk);
    const entries = this.__pending_records.slice(start_idx).entries();
    for (const [rel_idx, rec] of entries) {
      const is_added = curr_chunk.try_to_add_into_chunk(rec[0], rec[1]);
      if (!is_added) {
        //  create chunks from remaining records
        this.__chunkify(start_idx + rel_idx);
        // Don't forget to break. As current loop must not continue further
        break;
      }
    }
  }

  append(...workflows) {
    if (!workflows.length) return;
    for (const wf of workflows) {
      if (wf instanceof WorkflowTriggerRequest) {
        const wf_copy = cloneDeep(wf);
        this.__workflows.push(wf_copy);
      }
    }
  }

  async trigger() {
    this.__validate_workflows();
    if (this.__invalid_records.length > 0) {
      const ch_response = BulkResponse.invalid_records_chunk_response(
        this.__invalid_records
      );
      this.response.merge_chunk_response(ch_response);
    }
    if (this.__pending_records.length) {
      this.__chunkify();
      for (const [c_idx, ch] of this.chunks.entries()) {
        if (this.config.req_log_level > 0) {
          console.log(`DEBUG: triggering api call for chunk: ${cIdx}`);
        }
        // do api call
        await ch.trigger();
        // merge response
        this.response.merge_chunk_response(ch.response);
      }
    } else {
      if (this.__invalid_records.length === 0)
        this.response.merge_chunk_response(
          BulkResponse.empty_chunk_success_response()
        );
    }
    return this.response;
  }
}
