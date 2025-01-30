import get_request_signature from "./signature";
import { SuprsendApiError } from "./utils";
import axios from "axios";

export default class UsersApi {
  constructor(config) {
    this.config = config;
    this.list_url = `${this.config.base_url}v1/user/`;
  }

  get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toISOString(), // Adjust to your header date format
    };
  }

  validate_distinct_id(distinct_id) {
    if (!distinct_id || distinct_id.trim() === "") {
      throw new Error("missing distinct_id");
    }
    return distinct_id.trim();
  }

  detail_url(distinct_id) {
    return `${this.list_url}${encodeURIComponent(distinct_id)}/`;
  }

  async get(distinct_id) {
    const validated_distinct_id = this.validate_distinct_id(distinct_id);
    const url = this.detail_url(validated_distinct_id);
    const headers = this.get_headers();
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

  async delete(distinct_id) {
    const validated_distinct_id = this.validate_distinct_id(distinct_id);
    const url = this.detail_url(validated_distinct_id);
    const headers = this.get_headers();
    const signature = get_request_signature(
      url,
      "DELETE",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.delete(url, { headers });
      if (response.status >= 200 && response.status < 300) {
        return { success: true, status_code: response.status };
      } else {
        throw new SuprsendApiError(response.statusText);
      }
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get_objects_subscribed_to(distinct_id, options = {}) {
    const validated_distinct_id = this.validate_distinct_id(distinct_id);
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(validated_distinct_id);
    const subscription_url = `${url}subscribed_to/object/?${params}`;
    const headers = this.get_headers();
    const signature = get_request_signature(
      subscription_url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.get(subscription_url, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get_lists_subscribed_to(distinct_id, options = {}) {
    const validated_distinct_id = this.validate_distinct_id(distinct_id);
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(validated_distinct_id);
    const subscription_url = `${url}subscribed_to/list/?${params}`;
    const headers = this.get_headers();
    const signature = get_request_signature(
      subscription_url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.get(subscription_url, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }
}
