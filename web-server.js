import http from "http";
import https from "https";
import {readFileSync} from "fs";

/**
 * @param {object}        [options]
 * @param {boolean}       [options.trust_proxy]
 * @param {object|false}  [options.tls]
 * @param {string}        [options.tls.cert]
 * @param {string}        [options.tls.key]
 * @param {function}      [requestListener]
 */
export function createServer(options, requestListener) {
  if (typeof options === "function") {
    [options, requestListener] = [{}, options];
  }

  const {tls, ...opts} = options;
  const secure = Boolean(tls);
  const module = secure ? https : http;

  if (tls) {
    for (const key of ["cert", "key", "ca", "pfx"]) {
      if (key in tls) {
        opts[key] = readFileSync(tls[key]);
      }
    }
  }

  if (typeof requestListener === "function") {
    requestListener = forwarded(options.trust_proxy, requestListener);
  }

  const server = module.createServer(opts, requestListener);

  return Object.assign(server, {secure});
}

function forwarded(trusted, requestListener) {
  return async function forwarded(req, res, next) {
    req.forwarded = {};

    if (trusted) {
      // TODO: handle multiple headers and quoted values
      const {forwarded} = req.headers;

      if (forwarded) {
        const params = forwarded.split(";").map(param => param.trim());
        const kvs = params.map(param => param.trim().split("="));

        for (const [key, value] of kvs) {
          // TODO: handle case
          req.forwarded[key] = decodeURIComponent(value);
        }
      }
    }

    return requestListener(req, res, next);
  };
}
