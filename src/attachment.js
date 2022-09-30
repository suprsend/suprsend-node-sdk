import path from "path";
import mime from "mime-types";
import { base64Encode, resolveTilde } from "./utils";

export default function get_attachment_json_for_file(file_path) {
  const abs_path = path.resolve(resolveTilde(file_path));
  return {
    filename: path.basename(abs_path),
    contentType: mime.lookup(abs_path),
    data: base64Encode(abs_path),
  };
}
