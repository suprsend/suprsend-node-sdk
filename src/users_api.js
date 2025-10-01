import get_request_signature from "./signature";
import { SuprsendApiError, InputValueError } from "./utils";
import axios from "axios";
import UserEdit from "./user_edit";
import BulkUsersEdit from "./users_edit_bulk";

export default class UsersApi {
  constructor(config) {
    this.config = config;
    this.list_url = `${this.config.base_url}v1/user/`;
    this.bulk_url = `${this.config.base_url}v1/bulk/user/`;
  }

  __get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toISOString(),
    };
  }

  async list(options = null) {
    const encoded_options = options
      ? new URLSearchParams(options).toString()
      : "";
    const url = `${this.list_url}${
      encoded_options ? `?${encoded_options}` : ""
    }`;
    const headers = this.__get_headers();

    // Signature and Authorization-header
    const sig = get_request_signature(
      url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.get(url, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  _validate_distinct_id(distinct_id) {
    if (!distinct_id || !distinct_id.trim()) {
      throw new Error("missing distinct_id");
    }
    return distinct_id.trim();
  }

  detail_url(distinct_id) {
    distinct_id = this._validate_distinct_id(distinct_id);
    const distinct_id_encoded = encodeURIComponent(distinct_id);
    return `${this.list_url}${distinct_id_encoded}/`;
  }

  async get(distinct_id) {
    const url = this.detail_url(distinct_id);
    const headers = this.__get_headers();

    // Signature and Authorization-header
    const sig = get_request_signature(
      url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.get(url, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async upsert(distinct_id, payload = null) {
    const url = this.detail_url(distinct_id);
    payload = payload || {};
    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);
    const sig = get_request_signature(
      url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.post(url, content_text, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async async_edit(edit_instance) {
    if (!edit_instance) {
      throw new InputValueError("instance is required");
    }
    edit_instance.validate_body();
    const a_payload = edit_instance.get_async_payload();
    edit_instance.validate_payload_size(a_payload);

    const content_text = JSON.stringify(a_payload);
    const url = `${this.config.base_url}event/`;
    const headers = this.__get_headers();
    const sig = get_request_signature(
      url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.post(url, content_text, { headers });
      if (resp.status >= 200 && resp.status < 300) {
        return {
          success: true,
          status: "success",
          status_code: resp.status,
          message: resp.data,
        };
      } else {
        throw new SuprsendApiError(resp.statusText);
      }
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async edit(edit_ins_or_distinct_id, edit_payload) {
    let payload, url;
    if (edit_ins_or_distinct_id instanceof UserEdit) {
      const edit_ins = edit_ins_or_distinct_id;
      edit_ins.validate_body();
      payload = edit_ins.get_payload();
      url = this.detail_url(edit_ins.distinct_id);
    } else {
      const distinct_id = edit_ins_or_distinct_id;
      payload = edit_payload || {};
      url = this.detail_url(distinct_id);
    }

    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);
    // Signature and Authorization-header
    const sig = get_request_signature(
      url,
      "PATCH",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.patch(url, content_text, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async merge(distinct_id, from_user_id) {
    const url = `${this.detail_url(distinct_id)}merge/`;
    const payload = { from_user_id: from_user_id };
    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);
    const sig = get_request_signature(
      url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.post(url, content_text, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async delete(distinct_id) {
    const url = this.detail_url(distinct_id);
    const headers = this.__get_headers();

    const sig = get_request_signature(
      url,
      "DELETE",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const response = await axios.delete(url, { headers });
      if (response.status >= 200 && response.status < 300) {
        return { success: true, status_code: response.status };
      } else {
        throw new SuprsendApiError(response.statusText);
      }
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async bulk_delete(payload) {
    payload = payload || {};
    const url = this.bulk_url;
    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);
    const sig = get_request_signature(
      url,
      "DELETE",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const resp = await axios.delete(url, { data: content_text, headers });
      if (resp.status >= 200 && resp.status < 300) {
        return { success: true, status_code: resp.status };
      } else {
        throw new SuprsendApiError(resp.statusText);
      }
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async get_objects_subscribed_to(distinct_id, options = {}) {
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(distinct_id);
    const subscription_url = `${url}subscribed_to/object/?${params}`;
    const headers = this.__get_headers();
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
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(distinct_id);
    const subscription_url = `${url}subscribed_to/list/?${params}`;
    const headers = this.__get_headers();
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

  get_edit_instance(distinct_id) {
    distinct_id = this._validate_distinct_id(distinct_id);
    return new UserEdit(this.config, distinct_id);
  }

  get_bulk_edit_instance() {
    return new BulkUsersEdit(this.config);
  }
}
