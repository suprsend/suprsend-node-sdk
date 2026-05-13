import get_request_signature from "./signature";
import { SuprsendApiError } from "./utils";
import axios from "axios";

const MULTI_VALUE_KEYS = ["recipient_id", "status", "category"];

function build_list_query(options) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(options)) {
    if (MULTI_VALUE_KEYS.includes(key) && Array.isArray(val)) {
      for (const item of val) {
        params.append(`${key}[]`, item);
      }
    } else {
      params.append(key, val);
    }
  }
  return params.toString();
}

export default class MessagesApi {
  constructor(config) {
    this.config = config;
    this.list_url = `${this.config.base_url}v1/message/`;
    this.bulk_url = `${this.config.base_url}v1/bulk/message/`;
  }

  __get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
      Date: new Date().toISOString(),
    };
  }

  async list(options = null) {
    const encoded_params = options ? build_list_query(options) : "";
    const url = `${this.list_url}${encoded_params ? `?${encoded_params}` : ""}`;
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
      const resp = await axios.get(url, { headers });
      return resp.data;
    } catch (error) {
      throw new SuprsendApiError(error);
    }
  }

  async bulk_update(messages) {
    const payload = { messages };
    const url = this.bulk_url;
    const headers = this.__get_headers();
    const content_text = JSON.stringify(payload);

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

  // _validate_message_id(message_id) {
  //   if (!message_id || !message_id.trim()) {
  //     throw new Error("missing message_id");
  //   }
  //   return message_id.trim();
  // }

  // async get_content(message_id) {
  //   message_id = this._validate_message_id(message_id);
  //   const message_id_encoded = encodeURIComponent(message_id);
  //   const url = `${this.list_url}/${message_id_encoded}/content`;
  //   const headers = this.__get_headers();
  //
  //   const sig = get_request_signature(
  //     url,
  //     "GET",
  //     "",
  //     headers,
  //     this.config.workspace_secret
  //   );
  //   headers["Authorization"] = `${this.config.workspace_key}:${sig}`;
  //
  //   try {
  //     const resp = await axios.get(url, { headers });
  //     return resp.data;
  //   } catch (error) {
  //     throw new SuprsendApiError(error);
  //   }
  // }
}
