import get_request_signature from "./signature";
import https from "https";

class Workflow {
  constructor(ss_instance, data) {
    this.ss_instance = ss_instance;
    this.config = this.ss_instance.config;
    this.data = data;
    this.url = this._get_url();
  }

  _get_url() {
    let url_template = "/trigger/";
    if (this.config.include_signature_param) {
      if (this.config.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    url_formatted = `${this.ss_instance.base_url}/${this.ss_instance.env_key}/${url_template}`;
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
    if (this.config.auth_enabled) {
      const signature = await get_request_signature(
        this.url,
        "POST",
        this.data,
        headers,
        this.ss_instance.env_secret
      );
      headers["Authorization"] = `${this.ss_instance.env_key}:${signature}`;
    }

    // make api call
    const request_object = {
      method: "POST",
      headers: headers,
    };

    const request = https.request(this.url, request_object, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data = data + chunk.toString();
      });

      response.on("end", () => {
        return {
          status_code: response.statusCode,
          success: true,
          message: response.statusMessage,
        };
      });
    });

    request.on("error", (error) => {
      throw new Error("Suprsend: API Error", error);
    });

    req.write(content_text);
    request.end();
  }
}

export default Workflow;
