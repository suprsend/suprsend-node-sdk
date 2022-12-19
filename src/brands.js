import get_request_signature from "./signature";
import { SuprsendApiError } from "./utils";
import axios from "axios";

class BrandsApi {
  constructor(config) {
    this.config = config;
    this.list_url = this.__list_url();
    this.__headers = this.__common_headers();
  }

  __list_url() {
    const list_uri_template = `${this.config.base_url}v1/brand/`;
    return list_uri_template;
  }

  __common_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
    };
  }

  cleaned_limit_offset(limit, offset) {
    let cleaned_limit =
      typeof limit === "number" && limit > 0 && limit <= 1000 ? limit : 20;
    let cleaned_offset = typeof offset === "number" && offset >= 0 ? offset : 0;
    return [cleaned_limit, cleaned_offset];
  }

  __dynamic_headers() {
    return {
      Date: new Date().toUTCString(),
    };
  }

  async list(kwargs = {}) {
    const limit = kwargs?.limit;
    const offset = kwargs?.offset;
    const [cleaned_limit, cleaner_offset] = this.cleaned_limit_offset(
      limit,
      offset
    );
    const final_url_obj = new URL(this.list_url);
    final_url_obj.searchParams.append("limit", cleaned_limit);
    final_url_obj.searchParams.append("offset", cleaner_offset);
    const final_url_string = final_url_obj.href;

    const headers = { ...this.__headers, ...this.__dynamic_headers() };

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

  detail_url(brand_id = "") {
    const cleaned_brand_id = brand_id.toString().trim();
    const brand_id_encoded = encodeURI(cleaned_brand_id);
    const url = `${this.list_url}${brand_id_encoded}/`;
    return url;
  }

  async get(brand_id = "") {
    const url = this.detail_url(brand_id);

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

  async upsert(brand_id = "", brand_payload = {}) {
    const url = this.detail_url(brand_id);

    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify(brand_payload);

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
}

export default BrandsApi;
