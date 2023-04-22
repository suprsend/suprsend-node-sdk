import {
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  MAX_IDENTITY_EVENTS_IN_BULK_API,
} from "./constants";
import get_request_signature from "./signature";
import BulkResponse from "./bulk_response";
import { Subscriber } from "./subscriber";
import { cloneDeep } from "lodash";
import axios from "axios";
import { invalid_record_json, InputValueError } from "./utils";

export default class BulkSubscribersFactory {
  constructor(config) {
    this.config = config;
  }

  new_instance() {
    return new BulkSubscribers(this.config);
  }
}

class _BulkSubscribersChunk {
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
    return `${this.config.base_url}event/`;
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
      this.__running_length >= MAX_IDENTITY_EVENTS_IN_BULK_API ||
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
    if (event_size > IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `Event too big - ${event_size} Bytes, must not cross ${IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    if (this.__running_size + event_size > BODY_MAX_APPARENT_SIZE_IN_BYTES) {
      return false;
    }

    this.__add_event_to_chunk(event, event_size);
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

class BulkSubscribers {
  constructor(config) {
    this.config = config;
    this.__subscribers = [];
    this.__pending_records = [];
    this.chunks = [];
    this.response = new BulkResponse();

    // invalid_record json: {"record": event-json, "error": error_str, "code": 500}
    this.__invalid_records = [];
  }

  __validate_subscriber_events() {
    for (let sub of this.__subscribers) {
      try {
        const is_part_of_bulk = true;
        const warnings_list = sub.validate_body(is_part_of_bulk);
        if (warnings_list) {
          this.response.warnings = [
            ...this.response.warnings,
            ...warnings_list,
          ];
        }
        const ev = sub.get_events();
        const [ev_json, body_size] = sub.validate_event_size(ev);
        this.__pending_records.push([ev_json, body_size]);
      } catch (ex) {
        const inv_rec = invalid_record_json(sub.as_json(), ex);
        this.__invalid_records.push(inv_rec);
      }
    }
  }

  __chunkify(start_idx = 0) {
    const curr_chunk = new _BulkSubscribersChunk(this.config);
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

  append(...subscribers) {
    if (!subscribers) {
      return;
    }
    for (let sub of subscribers) {
      if (sub && sub instanceof Subscriber) {
        const sub_copy = cloneDeep(sub);
        this.__subscribers.push(sub_copy);
      }
    }
  }

  trigger() {
    return this.save();
  }

  async save() {
    this.__validate_subscriber_events();
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
