import config from "./config";
import Workflow from "../workflow";

const package = import("../package.json");

class Suprsend {
  init(workspace_env, workspace_secret, config = {}) {
    this.env = workspace_env;
    this.secret = workspace_secret;
    this.config = config;
    this.base_url = this._get_url(config.base_url);
    this.user_agent = `suprsend/${package.version};node/${process.version.slice(
      1
    )}`;
    this._validate();
  }

  _validate() {
    if (!this.env) {
      throw new Error("Surpsend: Missing Mandatory WORKSPACE_ENVIRONEMENT");
    } else if (!this.secret) {
      throw new Error("Surpsend: Missing Mandatory WORKSPACE_SECRET");
    } else if (!this.base_url) {
      throw new Error("Surpsend: Missing Mandatory base url");
    }
  }

  _get_url(base_url) {
    if (base_url) {
      base_url = base_url.trim();
    }
    if (!base_url) {
      if (config.is_staging) {
        base_url = config.staging;
      } else {
        base_url = config.prod;
      }
    }
    base_url = base_url.trim();
    if (!base_url.endsWith("/")) {
      base_url += "/";
    }
    return base_url;
  }

  trigger_workflow() {}
}
