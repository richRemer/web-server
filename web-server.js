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
    requestListener = decorated(options.trust_proxy, requestListener);
  }

  const server = module.createServer(opts, requestListener);

  return Object.assign(server, {secure});
}

function decorated(trusted, requestListener) {
  return async function decorated(req, res, next) {
    req.getCertificate = getCertificate;
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

function getCertificate() {
  try {
    const cert = "cert" in req.forwarded
      ? req.forwarded.cert
      : req.connection.getPeerCertificate()?.raw;

    return new X509Certificate(cert);
  } catch (err) {
    return null;
  }
}
