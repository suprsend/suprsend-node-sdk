import {
  SuprsendError,
  SuprsendApiError,
  validate_list_broadcast_body_schema,
  get_apparent_list_broadcast_body_size,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";

class SubscribersListBroadcast {
  constructor(body, kwargs = {}) {
    if (!(body instanceof Object)) {
      throw new SuprsendError("broadcast body must be a json/dictionary");
    }
    this.body = body;
    this.idempotency_key = kwargs?.idempotency_key;
  }

  get_final_json() {
    // add idempotency key in body if present
    if (this.idempotency_key) {
      this.body["$idempotency_key"] = this.idempotency_key;
    }
    this.body = validate_list_broadcast_body_schema(this.body);
    const apparent_size = get_apparent_list_broadcast_body_size(this.body);
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `workflow body too big - ${apparent_size} Bytes, must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [this.body, apparent_size];
  }
}

class SubscribersListApi {
  constructor(config) {
    this.config = config;
    this.url = this._get_url();
  }

  _get_headers() {
    return {
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
      "Content-Type": "application/json; charset=utf-8",
    };
  }

  _get_url() {
    let url_template = "/list_broadcast/";
    const url_formatted = `${this.config.base_url}${this.config.workspace_key}${url_template}`;
    return url_formatted;
  }

  async create(body = {}) {
    if (!body) {
      throw new SuprsendError("Missing body");
    }
    if (!body["list_id"]) {
      throw new SuprsendError("Missing list ID");
    }

    const valid_body = {
      list_id: body["list_id"],
      list_name: body["list_name"],
      list_description: body["list_description"],
    };

    const url = `${this.config.base_url}v1/subscriber_list`;
    const headers = this._get_headers();
    const content_text = JSON.stringify(valid_body);

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

  cleaned_limit_offset(limit, offset) {
    let cleaned_limit =
      typeof limit === "number" && limit > 0 && limit <= 1000 ? limit : 20;
    let cleaned_offset = typeof offset === "number" && offset >= 0 ? offset : 0;
    return [cleaned_limit, cleaned_offset];
  }

  async get_all({ limit, offset }) {
    const [cleaned_limit, cleaner_offset] = this.cleaned_limit_offset(
      limit,
      offset
    );
    const final_url_obj = new URL(`${this.config.base_url}v1/subscriber_list`);
    final_url_obj.searchParams.append("limit", cleaned_limit);
    final_url_obj.searchParams.append("offset", cleaner_offset);
    const final_url_string = final_url_obj.href;

    const headers = this._get_headers();

    const signature = get_request_signature(
      final_url_string,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.get(final_url_string, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get(id) {
    if (!id) {
      throw new SuprsendError("Missing List ID");
    }

    const url = `${this.config.base_url}v1/subscriber_list/${id}`;
    const headers = this._get_headers();

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

  async add(list_id, distinct_ids = []) {
    if (!list_id) {
      throw new SuprsendError("Missing List ID");
    } else if (
      !distinct_ids ||
      (distinct_ids && Array.isArray(distinct_ids) && distinct_ids.length === 0)
    ) {
      return;
    }

    const url = `${this.config.base_url}v1/subscriber_list/${list_id}/subscriber/add`;
    const headers = this._get_headers();
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
    if (!list_id) {
      throw new SuprsendError("Missing List ID");
    } else if (
      !distinct_ids ||
      (distinct_ids && Array.isArray(distinct_ids) && distinct_ids.length === 0)
    ) {
      return;
    }

    const url = `${this.config.base_url}v1/subscriber_list/${list_id}/subscriber/remove`;
    const headers = this._get_headers();
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

  async broadcast(subscriber_list) {
    if (!(data instanceof SubscribersListBroadcast)) {
      throw new SuprsendError(
        "broadcast needs SubscribersListBroadcast instance as paramenter"
      );
    }
    const [subscriber_list_body, body_size] = subscriber_list.get_final_json(
      this.config
    );
    const headers = this._get_headers();
    headers["Content-Type"] = "application/json; charset=utf-8";
    const content_text = JSON.stringify(subscriber_list_body);
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

export { SubscribersListApi, SubscribersListBroadcast };
