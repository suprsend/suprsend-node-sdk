import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  ALLOW_ATTACHMENTS_IN_BULK_API,
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  MAX_EVENTS_IN_BULK_API,
} from "./constants";
import get_request_signature from "./signature";
import BulkResponse from "./bulk_response";
import Event from "./event";
import { SuprsendError } from "./utils";
import { cloneDeep } from "lodash";
import axios from "axios";

export class BulkEventsFactory {
  constructor(config) {
    this.config = config;
  }

  new_instance() {
    return new BulkEvents(this.config);
  }
}

class _BulkEventsChunk {
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
    let url_template = "event/";
    if (this.config.include_signature_param) {
      if (this.config.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    const url_formatted = `${this.config.base_url}${url_template}`;
    return url_formatted;
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

  __add_event_to_chunk(event, event_size) {
    //  First add size, then body to reduce effects of race condition
    this.__running_size += event_size;
    this.__chunk.push(event);
    this.__running_length += 1;
  }

  __check_limit_reached() {
    if (
      this.__running_length >= MAX_EVENTS_IN_BULK_API ||
      this.__running_size >= BODY_MAX_APPARENT_SIZE_IN_BYTES
    ) {
      return true;
    } else {
      return false;
    }
  }

  try_to_add_into_chunk(event, event_size) {
    if (!event) {
      return true;
    }
    if (this.__check_limit_reached()) {
      return false;
    }
    if (event_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `Event properties too big - ${event_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    if (this.__running_size + event_size > BODY_MAX_APPARENT_SIZE_IN_BYTES) {
      return false;
    }
    if (!ALLOW_ATTACHMENTS_IN_BULK_API) {
      delete event.properties["$attachments"];
    }

    this.__add_event_to_chunk(event, event_size);
    return true;
  }

  async trigger() {
    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify(this.__chunk);
    // Based on whether signature is required or not, add Authorization header
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        this.__url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }
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
      return {
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

class BulkEvents {
  constructor(config) {
    this.config = config;
    this.__events = [];
    this.__pending_records = [];
    this.chunks = [];
    this.response = new BulkResponse();
  }

  __validate_events() {
    if (!this.__events) {
      throw new SuprsendError("events list is empty in bulk request");
    }
    for (let ev of this.__events) {
      const is_part_of_bulk = true;
      const [ev_json, body_size] = ev.get_final_json(
        this.config,
        is_part_of_bulk
      );
      this.__pending_records.push([ev_json, body_size]);
    }
  }

  __chunkify(start_idx = 0) {
    const curr_chunk = new _BulkEventsChunk(this.config);
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

  append(...events) {
    if (!events) {
      throw new SuprsendError(
        "events list empty. must pass one or more events"
      );
    }
    for (let ev of events) {
      if (!ev) {
        throw new SuprsendError("null/empty element found in bulk instance");
      }
      if (!(ev instanceof Event)) {
        throw new SuprsendError(
          "element must be an instance of suprsend.Event"
        );
      }
      const ev_copy = cloneDeep(ev);
      this.__events.push(ev_copy);
    }
  }

  async trigger() {
    this.__validate_events();
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
