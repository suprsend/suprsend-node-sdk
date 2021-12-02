import get_request_signature from "./signature";
import https from "https";
import { Validator, SchemaError, ValidationError } from "jsonschema";
import { _get_schema } from "./utils";
import axios from "axios";

class Workflow {
  constructor(ss_instance, data) {
    this.ss_instance = ss_instance;
    this.data = data;
    this.url = this._get_url();
  }

  _get_url() {
    let url_template = "/trigger/";
    if (this.ss_instance.include_signature_param) {
      if (this.ss_instance.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    const url_formatted = `${this.ss_instance.base_url}${this.ss_instance.env_key}${url_template}`;
    return url_formatted;
  }

  _get_headers() {
    return {
      "Content-Type": "application/json",
      Date: new Date().toUTCString(),
      "User-Agent": this.ss_instance.user_agent,
    };
  }

  async execute_workflow() {
    const headers = this._get_headers();
    const content_text = JSON.stringify(this.data);
    if (this.ss_instance.auth_enabled) {
      const signature = get_request_signature(
        this.url,
        "POST",
        this.data,
        headers,
        this.ss_instance.env_secret
      );
      headers["Authorization"] = `${this.ss_instance.env_key}:${signature}`;
    }
    try {
      const response = await axios.post(this.url, content_text, { headers });
      return {
        status_code: response.status,
        success: true,
        message: response.statusText,
      };
    } catch (err) {
      return {
        status_code: 400,
        success: false,
        message: err.message,
      };
    }
  }

  validate_data() {
    if (!this.data?.data) {
      this.data.data = {};
    }
    if (!(this.data.data instanceof Object)) {
      throw new Error("SuprsendError: data must be a object");
    }
    const schema = _get_schema("workflow");
    try {
      var v = new Validator();
      v.validate(this.data, schema);
    } catch (e) {
      if (e instanceof SchemaError) {
        throw new Error(`SuprsendSchemaError:${e.message}`);
      } else if (e instanceof ValidationError) {
        throw new Error(`SuprsendValidationError:${e.message}`);
      }
    }
    return this.data;
  }
}

export default Workflow;
