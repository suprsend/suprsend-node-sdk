import { SuprsendError, SuprsendApiError } from "./utils";
import get_request_signature from "./signature";
import axios from "axios";

class SubscribersListApi {
  constructor(config) {
    this.config = config;
  }

  _get_headers() {
    return {
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
    };
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
    headers["Content-Type"] = "application/json; charset=utf-8";
    const content_text = JSON.stringify(valid_body);
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }

    try {
      const response = await axios.post(url, content_text, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get_all() {
    const url = `${this.config.base_url}v1/subscriber_list`;
    const headers = this._get_headers();
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        url,
        "GET",
        "",
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }

    try {
      const response = await axios.get(url, { headers });
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
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        url,
        "GET",
        "",
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }
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
    headers["Content-Type"] = "application/json; charset=utf-8";
    const content_text = JSON.stringify({ distinct_ids: distinct_ids });
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }

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
    headers["Content-Type"] = "application/json; charset=utf-8";
    const content_text = JSON.stringify({ distinct_ids: distinct_ids });
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }

    try {
      const response = await axios.post(url, content_text, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }
}

export default SubscribersListApi;
