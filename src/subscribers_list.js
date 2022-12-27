import {
  SuprsendError,
  SuprsendApiError,
  validate_list_broadcast_body_schema,
  get_apparent_list_broadcast_body_size,
  uuid,
  epoch_milliseconds,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";

class SubscribersListBroadcast {
  constructor(body, kwargs = {}) {
    if (!(body instanceof Object)) {
      throw new SuprsendError("broadcast body must be a json/dictionary");
    }
    this.body = body;
    this.idempotency_key = kwargs?.idempotency_key;
    this.brand_id = kwargs?.brand_id;
  }

  get_final_json() {
    this.body["$insert_id"] = uuid();
    this.body["$time"] = epoch_milliseconds();
    if (this.idempotency_key) {
      this.body["$idempotency_key"] = this.idempotency_key;
    }
    if (this.brand_id) {
      this.body["brand_id"] = this.brand_id;
    }
    this.body = validate_list_broadcast_body_schema(this.body);
    const apparent_size = get_apparent_list_broadcast_body_size(this.body);
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `SubscriberListBroadcast body too big - ${apparent_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [this.body, apparent_size];
  }
}

class SubscribersListApi {
  constructor(config) {
    this.config = config;
    this.subscriber_list_url = `${this.config.base_url}v1/subscriber_list/`;
    this.broadcast_url = `${this.config.base_url}${this.config.workspace_key}/broadcast/`;
    this.__headers = this.__common_headers();
    this.non_error_default_response = { success: true };
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

  _validate_list_id(list_id) {
    if (typeof list_id != "string") {
      throw new SuprsendError("list_id must be a string");
    }
    let cleaned_list_id = list_id.trim();
    if (!cleaned_list_id) {
      throw new SuprsendError("missing list_id");
    }
    return list_id;
  }

  async create(payload) {
    if (!payload) {
      throw new SuprsendError("missing payload");
    }
    let list_id = payload["list_id"];
    if (!list_id) {
      throw new SuprsendError("missing list_id in payload");
    }
    list_id = this._validate_list_id(list_id);
    payload["list_id"] = list_id;

    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify(payload);

    const signature = get_request_signature(
      this.subscriber_list_url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(
        this.subscriber_list_url,
        content_text,
        { headers }
      );
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  cleaned_limit_offset(limit, offset) {
    let cleaned_limit =
      typeof limit === "number" && limit > 0 && limit <= 1000 ? limit : 20;
    let cleaned_offset = typeof offset === "number" && offset >= 0 ? offset : 0;
    return [cleaned_limit, cleaned_offset];
  }

  async get_all(kwargs = {}) {
    let limit = kwargs?.limit;
    let offset = kwargs?.offset;
    const [cleaned_limit, cleaner_offset] = this.cleaned_limit_offset(
      limit,
      offset
    );
    const final_url_obj = new URL(`${this.config.base_url}v1/subscriber_list`);
    final_url_obj.searchParams.append("limit", cleaned_limit);
    final_url_obj.searchParams.append("offset", cleaner_offset);
    const url = final_url_obj.href;

    const headers = { ...this.__headers, ...this.__dynamic_headers() };

    const signature = get_request_signature(
      url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  __subscriber_list_detail_url(list_id) {
    return `${this.config.base_url}v1/subscriber_list/${list_id}/`;
  }

  async get(list_id) {
    const cleaned_list_id = this._validate_list_id(list_id);

    const url = this.__subscriber_list_detail_url(cleaned_list_id);

    const headers = { ...this.__headers, ...this.__dynamic_headers() };

    const signature = get_request_signature(
      url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async add(list_id, distinct_ids) {
    const cleaned_list_id = this._validate_list_id(list_id);
    if (!Array.isArray(distinct_ids)) {
      throw new SuprsendError("distinct_ids must be list of strings");
    }
    if (distinct_ids.length === 0) {
      return this.non_error_default_response;
    }

    const url = `${this.__subscriber_list_detail_url(
      cleaned_list_id
    )}subscriber/add`;
    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify({ distinct_ids: distinct_ids });

    const signature = get_request_signature(
      url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(url, content_text, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async remove(list_id, distinct_ids = []) {
    const cleaned_list_id = this._validate_list_id(list_id);
    if (!Array.isArray(distinct_ids)) {
      throw new SuprsendError("distinct_ids must be list of strings");
    }
    if (distinct_ids.length === 0) {
      return this.non_error_default_response;
    }

    const url = `${this.__subscriber_list_detail_url(
      cleaned_list_id
    )}subscriber/remove`;
    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify({ distinct_ids: distinct_ids });

    const signature = get_request_signature(
      url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(url, content_text, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  // async broadcast(broadcast_instance) {
  //   if (!(broadcast_instance instanceof SubscribersListBroadcast)) {
  //     throw new SuprsendError(
  //       "argument must be an instance of suprsend.SubscriberListBroadcast"
  //     );
  //   }
  //   const [broadcast_body, body_size] = broadcast_instance.get_final_json(
  //     this.config
  //   );
  //   const headers = { ...this.__headers, ...this.__dynamic_headers() };
  //   const content_text = JSON.stringify(broadcast_body);

  //   const signature = get_request_signature(
  //     this.broadcast_url,
  //     "POST",
  //     content_text,
  //     headers,
  //     this.config.workspace_secret
  //   );
  //   headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

  //   try {
  //     const response = await axios.post(this.broadcast_url, content_text, {
  //       headers,
  //     });
  //     const ok_response = Math.floor(response.status / 100) == 2;
  //     if (ok_response) {
  //       return {
  //         success: true,
  //         status: "success",
  //         status_code: response.status,
  //         message: response.statusText,
  //       };
  //     } else {
  //       return {
  //         success: false,
  //         status: "fail",
  //         status_code: response.status,
  //         message: response.statusText,
  //       };
  //     }
  //   } catch (err) {
  //     return {
  //       success: false,
  //       status: "fail",
  //       status_code: err.status || 500,
  //       message: err.message,
  //     };
  //   }
  // }
}

export { SubscribersListApi, SubscribersListBroadcast };
