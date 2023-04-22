import path from "path";
import mime from "mime-types";
import { base64Encode, resolveTilde } from "./utils";

function check_is_web_url(file_path = "") {
  return file_path.startsWith("http://") || file_path.startsWith("https://");
}

function get_attachment_json_for_file(file_path, file_name, ignore_if_error) {
  try {
    const abs_path = path.resolve(resolveTilde(file_path));
    let final_file_name = path.basename(abs_path);
    if (file_name && file_name.trim()) {
      final_file_name = file_name.trim();
    }
    return {
      filename: final_file_name,
      contentType: mime.lookup(abs_path),
      data: base64Encode(abs_path),
      url: null,
      ignore_if_error: ignore_if_error,
    };
  } catch (ex) {
    if (ignore_if_error) {
      console.log(
        "WARNING: ignoring error while processing attachment file.",
        ex
      );
      return;
    } else {
      throw ex;
    }
  }
}

function get_attachment_json_for_url(file_url, file_name, ignore_if_error) {
  return {
    filename: file_name,
    contentType: null,
    data: null,
    url: file_url,
    ignore_if_error: ignore_if_error,
  };
}

export default function get_attachment_json(
  file_path,
  file_name,
  ignore_if_error = false
) {
  if (check_is_web_url(file_path)) {
    return get_attachment_json_for_url(file_path, file_name, ignore_if_error);
  } else {
    return get_attachment_json_for_file(file_path, file_name, ignore_if_error);
  }
}
