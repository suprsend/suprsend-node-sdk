import { is_string, InputValueError, SuprsendApiError } from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import ObjectEdit from "./object_edit";

export default class ObjectsApi {
  constructor(config) {
    this.config = config;
    this.list_url = `${this.config.base_url}v1/object/`;
  }

  get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toISOString(), // Adjust to your header date format
    };
  }

  validate_object_type(object_type) {
    if (!is_string(object_type)) {
      throw new InputValueError("object_type must be a string");
    }
    object_type = object_type.trim();
    if (!object_type) {
      throw new InputValueError("missing object_type");
    }
    return object_type;
  }

  validate_object_id(object_id) {
    if (!is_string(object_id)) {
      throw new InputValueError("object_id must be a string");
    }
    object_id = object_id.trim();
    if (!object_id) {
      throw new InputValueError("missing object_id");
    }
    return object_id;
  }

  async list(object_type, options = {}) {
    const params = new URLSearchParams(options).toString();
    const validated_type = this.validate_object_type(object_type);
    const encoded_type = encodeURIComponent(validated_type);
    const url = `${this.list_url}${encoded_type}/?${params}`;
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

  detail_url(object_type, object_id) {
    const validated_type = this.validate_object_type(object_type);
    const encoded_type = encodeURIComponent(validated_type);

    const validated_id = this.validate_object_id(object_id);
    const encoded_id = encodeURIComponent(validated_id);

    return `${this.list_url}${encoded_type}/${encoded_id}/`;
  }

  async get(object_type, object_id) {
    const url = this.detail_url(object_type, object_id);
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

  async upsert(object_type, object_id, object_payload = {}) {
    const url = this.detail_url(object_type, object_id);
    const headers = this.get_headers();
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

  async edit(object_type, object_id, edit_payload = {}) {
    let url, payload;

    if (object_type instanceof ObjectEdit) {
      const edit_instance = object_type;
      edit_instance.validate_body();
      url = this.detail_url(
        edit_instance.get_object_type(),
        edit_instance.get_object_id()
      );
      payload = edit_instance.get_payload();
    } else {
      url = this.detail_url(object_type, object_id);
      payload = edit_payload;
    }

    const content_text = JSON.stringify(payload || {});
    const headers = this.get_headers();
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

  async bulk_ops_url(object_type) {
    const validatedType = this.validate_object_type(object_type);
    const encodedType = encodeURIComponent(validatedType);

    return `${this.config.base_url}v1/bulk/object/${encodedType}/`;
  }

  async bulk_delete(object_type, payload) {
    const url = await this.bulk_ops_url(object_type);
    const headers = this.get_headers();
    payload = payload || {};
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
        data: payload,
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

  async get_subscriptions(object_type, object_id, options = {}) {
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(object_type, object_id);
    const subscription_url = `${url}subscription/?${params}`;
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

  async create_subscriptions(object_type, object_id, subscriptions) {
    const url = this.detail_url(object_type, object_id);
    const subscription_url = `${url}subscription/`;
    const headers = this.get_headers();
    subscriptions = subscriptions || {};
    const content_text = JSON.stringify(subscriptions);
    const signature = get_request_signature(
      subscription_url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(subscription_url, content_text, {
        headers,
      });
      return response.data;
    } catch (err) {
      throw new SuprsendApiError(err);
    }
  }

  async delete_subscriptions(object_type, object_id, subscriptions) {
    const url = this.detail_url(object_type, object_id);
    const subscription_url = `${url}subscription/`;
    const headers = this.get_headers();
    subscriptions = subscriptions || {};
    const content_text = JSON.stringify(subscriptions);
    const signature = get_request_signature(
      subscription_url,
      "DELETE",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.delete(subscription_url, {
        headers: headers,
        data: subscriptions,
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

  async get_objects_subscribed_to(object_type, object_id, options = {}) {
    const params = new URLSearchParams(options).toString();
    const url = this.detail_url(object_type, object_id);
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

  get_instance(object_type, object_id) {
    const validated_type = this.validate_object_type(object_type);
    const validated_id = this.validate_object_id(object_id);

    return new ObjectEdit(this.config, validated_type, validated_id);
  }
}
