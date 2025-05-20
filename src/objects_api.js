import { is_string, InputValueError, SuprsendApiError } from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import ObjectEdit from "./object_edit";

export default class ObjectsApi {
  constructor(config) {
    this.config = config;
    this.list_url = `${this.config.base_url}v1/object/`;
    this.bulk_url = `${this.config.base_url}v1/bulk/object/`;
  }

  __get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toISOString(),
    };
  }

  _validate_object_type(object_type) {
    if (!object_type || !is_string(object_type) || !object_type.trim()) {
      throw new InputValueError("missing object_type");
    }
    return object_type.trim();
  }

  _validate_object_id(object_id) {
    if (!object_id || !is_string(object_id) || !object_id.trim()) {
      throw new InputValueError("missing object_id");
    }
    return object_id.trim();
  }

  async list(object_type, options) {
    object_type = this._validate_object_type(object_type);
    const object_type_encoded = encodeURIComponent(object_type);
    const encoded_options = options
      ? new URLSearchParams(options).toString()
      : "";

    const url = `${this.list_url}${object_type_encoded}/${
      encoded_options ? `?${encoded_options}` : ""
    }`;
    const headers = this.__get_headers();
    const sig = get_request_signature(
      url,
      "GET",
      "",
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${sig}`;

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  detail_url(object_type, object_id) {
    object_type = this._validate_object_type(object_type);
    const object_type_encoded = encodeURIComponent(object_type);

    object_id = this._validate_object_id(object_id);
    const object_id_encoded = encodeURIComponent(object_id);

    return `${this.list_url}${object_type_encoded}/${object_id_encoded}/`;
  }

  async get(object_type, object_id) {
    const url = this.detail_url(object_type, object_id);
    const headers = this.__get_headers();
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

  async upsert(object_type, object_id, payload = {}) {
    const url = this.detail_url(object_type, object_id);
    payload = payload || {};
    const headers = this.__get_headers();
    const content_text = JSON.stringify(object_payload || {});
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

  async edit(edit_ins_or_object_type, object_id, edit_payload) {
    let payload, url;

    if (edit_ins_or_object_type instanceof ObjectEdit) {
      const edit_ins = edit_ins_or_object_type;
      edit_ins.validate_body();
      payload = edit_ins.get_payload();
      url = this.detail_url(edit_ins.object_type, edit_ins.object_id);
    } else {
      const object_type = edit_ins_or_object_type;
      payload = edit_payload || {};
      url = this.detail_url(object_type, object_id);
    }

    const content_text = JSON.stringify(payload || {});
    const headers = this.__get_headers();
    const signature = get_request_signature(
      url,
      "PATCH",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.patch(url, content_text, { headers });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async delete(object_type, object_id) {
    const url = this.detail_url(object_type, object_id);
    const headers = this.__get_headers();
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

  async bulk_delete(object_type, payload) {
    object_type = this._validate_object_type(object_type);
    const object_type_encoded = encodeURIComponent(object_type);
    const url = `${this.bulk_url}${object_type_encoded}/`;
    payload = payload || {};
    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);
    const signature = get_request_signature(
      url,
      "DELETE",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.delete(url, {
        headers: headers,
        data: content_text,
      });
      if (response.status >= 200 && response.status < 300) {
        return { success: true, status_code: response.status };
      } else {
        throw new SuprsendApiError(response.statusText);
      }
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get_subscriptions(object_type, object_id, options) {
    const encoded_options = options
      ? new URLSearchParams(options).toString()
      : "";
    const _detail_url = this.detail_url(object_type, object_id);
    const url = `${_detail_url}subscription/${
      encoded_options ? `?${encoded_options}` : ""
    }`;
    const headers = this.__get_headers();
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

  async create_subscriptions(object_type, object_id, payload) {
    const _detail_url = this.detail_url(object_type, object_id);
    const url = `${_detail_url}subscription/`;
    payload = payload || {};
    const content_text = JSON.stringify(payload);
    const headers = this.__get_headers();

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

  async delete_subscriptions(object_type, object_id, payload) {
    const _detail_url = this.detail_url(object_type, object_id);
    const url = `${_detail_url}subscription/`;
    payload = payload || {};
    const content_text = JSON.stringify(subscriptions);
    const headers = this.__get_headers();
    const signature = get_request_signature(
      url,
      "DELETE",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.delete(url, {
        headers: headers,
        data: content_text,
      });
      if (response.status >= 200 && response.status < 300) {
        return { success: true, status_code: response.status };
      } else {
        throw new SuprsendApiError(response.statusText);
      }
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async get_objects_subscribed_to(object_type, object_id, options = null) {
    const encoded_options = options
      ? new URLSearchParams(options).toString()
      : "";
    const _detail_url = this.detail_url(object_type, object_id);
    const url = `${_detail_url}subscribed_to/object/${
      encoded_options ? `?${encoded_options}` : ""
    }`;
    const headers = this.__get_headers();
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

  get_edit_instance(object_type, object_id) {
    object_type = this._validate_object_type(object_type);
    object_id = this._validate_object_id(object_id);
    return new ObjectEdit(this.config, object_type, object_id);
  }
}
