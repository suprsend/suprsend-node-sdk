import config from "./config";
import Workflow from "./workflow";
import path from "path";
import mime from "mime-types";
import { base64Encode, resolveTilde, SuprsendError } from "./utils";
import UserIdentityFactory from "./identity";
import EventCollector from "./event";

const package_json = require("../package.json");

class Suprsend {
  constructor(workspace_env, workspace_secret, config = {}) {
    this.env_key = workspace_env;
    this.env_secret = workspace_secret;
    this.config = config;
    this.base_url = this._get_url(config.base_url);
    this.auth_enabled = config.auth_enabled !== false;
    this.include_signature_param = config.include_signature_param !== false;
    this.user_agent = `suprsend/${
      package_json.version
    };node/${process.version.slice(1)}`;
    this.user = new UserIdentityFactory(this);
    this._eventcollector = new EventCollector(this);
    this._validate();
  }

  _validate() {
    if (!this.env_key) {
      throw new SuprsendError("Missing Mandatory WORKSPACE_ENVIRONEMENT");
    } else if (!this.env_secret) {
      throw new SuprsendError("Missing Mandatory WORKSPACE_SECRET");
    } else if (!this.base_url) {
      throw new SuprsendError("Missing Mandatory base url");
    }
  }

  _get_url(base_url) {
    if (base_url) {
      base_url = base_url.trim();
    }
    if (!base_url) {
      if (this.config.is_staging) {
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

  add_attachment(body, file_path) {
    if (!body.data) {
      body.data = {};
    }
    if (!body.data instanceof Object) {
      throw new SuprsendError("data must be an object");
    }
    const attachment = this._get_attachment_json_for_file(file_path);
    if (!body.data["$attachments"]) {
      body["data"]["$attachments"] = [];
    }
    body["data"]["$attachments"].push(attachment);
    return body;
  }

  _get_attachment_json_for_file(file_path) {
    const abs_path = path.resolve(resolveTilde(file_path));
    return {
      filename: path.basename(abs_path),
      contentType: mime.lookup(abs_path),
      data: base64Encode(abs_path),
    };
  }

  trigger_workflow(data) {
    const wf = new Workflow(this, data);
    wf.validate_data();
    return wf.execute_workflow();
  }

  track(distinct_id, event_name, properties = {}) {
    return this._eventcollector.collect(distinct_id, event_name, properties);
  }
}

export default Suprsend;
