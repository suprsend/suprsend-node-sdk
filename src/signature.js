import crypto from "crypto";

function get_path(url) {
  const url_info = new URL(url);
  return url_info.pathname + url_info.search;
}

export default function get_request_signature(
  url,
  http_verb,
  content,
  headers,
  secret
) {
  if (http_verb === "GET") {
    return "";
  }
  const content_md5 = crypto.createHash("md5").update(content).digest("hex");
  const request_uri = get_path(url);
  const sign_string =
    http_verb +
    "\n" +
    content_md5 +
    "\n" +
    headers["Content-Type"] +
    "\n" +
    headers["Date"] +
    "\n" +
    request_uri;
  const hash = crypto.createHmac("sha256", secret).update(sign_string);
  return hash.digest("base64");
}
