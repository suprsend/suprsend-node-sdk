import axios from "axios";
import {
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  MAX_IDENTITY_EVENTS_IN_BULK_API,
} from "./constants";
import get_request_signature from "./signature";
import { invalid_record_json, uuid, InputValueError } from "./utils";
import BulkResponse from "./bulk_response";
import UserEdit from "./user_edit";

class _BulkUsersEditChunk {
  constructor(config) {
    this._chunk_apparent_size_in_bytes = BODY_MAX_APPARENT_SIZE_IN_BYTES;
    this._max_records_in_chunk = MAX_IDENTITY_EVENTS_IN_BULK_API;
    this.config = config;
    this.__chunk = [];
    this.__url = `${this.config.base_url}event/`;
    this.__running_size = 0;
    this.__running_length = 0;
    this.response = null;
  }

  __get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toUTCString(),
    };
  }

  __add_event_to_chunk(event, event_size) {
    this.__running_size += event_size;
    this.__chunk.push(event);
    this.__running_length += 1;
  }

  __check_limit_reached() {
    return (
      this.__running_length >= this._max_records_in_chunk ||
      this.__running_size >= this._chunk_apparent_size_in_bytes
    );
  }

  try_to_add_into_chunk(event, event_size) {
    if (!event) return true;
    if (this.__check_limit_reached()) return false;

    if (event_size > IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `Event too big - ${event_size} Bytes, ` +
          `must not cross ${IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }

    if (this.__running_size + event_size > this._chunk_apparent_size_in_bytes) {
      return false;
    }

    this.__add_event_to_chunk(event, event_size);
    return true;
  }

  async trigger() {
    const headers = this.__get_headers();
    const content_text = JSON.stringify(this.__chunk);

    const sig = get_request_signature(
      this.__url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.post(this.__url, content_text, { headers });
      const ok_response = Math.floor(resp.status / 100) == 2;
      if (ok_response) {
        this.response = {
          status: "success",
          status_code: resp.status,
          total: this.__chunk.length,
          success: this.__chunk.length,
          failure: 0,
          failed_records: [],
        };
      } else {
        this.response = {
          status: "fail",
          status_code: resp.status,
          total: this.__chunk.length,
          success: 0,
          failure: this.__chunk.length,
          failed_records: this.__chunk.map((item) => ({
            record: item,
            error: resp.statusText,
            code: resp.status,
          })),
        };
      }
    } catch (error) {
      const error_status = err.status || 500;
      this.response = {
        status: "fail",
        status_code: error_status,
        total: this.__chunk.length,
        success: 0,
        failure: this.__chunk.length,
        failed_records: this.__chunk.map((c) => ({
          record: c,
          error: error.message,
          code: error_status,
        })),
      };
    }
  }
}

class BulkUsersEdit {
  constructor(config) {
    this.config = config;
    this.__users = [];
    this.__pending_records = [];
    this.__invalid_records = [];
    this.chunks = [];
    this.response = new BulkResponse();
  }

  __validate_users() {
    for (const u of this.__users) {
      try {
        const warnings_list = u.validate_body();
        if (warnings_list) {
          this.response.warnings = [
            ...this.response.warnings,
            ...warnings_list,
          ];
        }
        const pl = u.get_async_payload();
        const [pl_json, pl_size] = u.validate_payload_size(pl);
        this.__pending_records.push([pl_json, pl_size]);
      } catch (ex) {
        const inv_rec = invalid_record_json(u.as_json_async(), ex);
        this.__invalid_records.push(inv_rec);
      }
    }
  }

  __chunkify(start_idx = 0) {
    const curr_chunk = new _BulkUsersEditChunk(this.config);
    this.chunks.push(curr_chunk);
    const entries = this.__pending_records.slice(start_idx).entries();
    for (const [rel_idx, rec] of entries) {
      const is_added = curr_chunk.try_to_add_into_chunk(rec[0], rec[1]);
      if (!is_added) {
        this.__chunkify(start_idx + rel_idx);
        break;
      }
    }
  }

  append(...users) {
    if (!users) return;
    for (const u of users) {
      if (u && u instanceof UserEdit) {
        const u_copy = cloneDeep(u);
        this.__users.push(u_copy);
      }
    }
  }

  async save() {
    this.__validate_users();

    if (this.__invalid_records.length > 0) {
      const ch_response = BulkResponse.invalid_records_chunk_response(
        this.__invalid_records
      );
      this.response.merge_chunk_response(ch_response);
    }

    if (this.__pending_records.length > 0) {
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
    } else {
      // if no records. i.e. invalid_records.length and pending_records.length both are 0
      // then add empty success response
      if (this.__invalid_records.length === 0) {
        this.response.merge_chunk_response(
          BulkResponse.empty_chunk_success_response()
        );
      }
    }

    return this.response;
  }
}

export default BulkUsersEdit;
