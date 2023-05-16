The **@welib/web-server** package exports a function that can be used to setup
an **http.Server** or **https.Server** object, depending on the options.

@welib/web-server
=================
This package exports a single function (**createServer**), which accpets two
optional arguments: an options object and a request listener function.  This is
intended to work very much like the standard Node.js **createServer** functions
exported by the **http** and **https** modules, but the supported options are
limited and different.

Example: negotiate TLS
----------------------
In the following example, the configuration has a **tls** key, so the
**createServer** function will return an **https.Server**.  Otherwise, the
function would return an **http.Server**.  The **Server** instance will have
a *.secure* property set to true if TLS was provided.

When configuring TLS, the function will read files from the paths specified in
the **.tls.cert**, **.tls.key**, **.tls.ca**, and **.tls.pfx** options.  These
files must exist and be readable if set in the options.

```js
import {createServer} from "@welib/web-server";

const cert = "/path/to/cert.pem";
const key = "/path/to/key.pem";
const config = {tls: {cert, key}};
const server = createServer(config, requestListener);
const port = server.tls ? 443 : 80;

server.listen(port);

function requestListener(req, res) {
  res.writeHead(404);
  res.end("Not Found\n");
}
```

Example: handling Forwarded header
----------------------------------
If the server is running behind a trusted proxy, the **trust_proxy** option can
be used to process the Forwarded header.  This MUST NOT be used unless you are
running behind a proxy which is setting the Forwarded header in a safe manner.

In the following example, the server will response with the requested URL.  If
a Forwarded header is provided, the URL will use it to determine the URL.

```
import {createServer} from "@welib/web-server";

const config = {trust_proxy: true};
const server = createServer(config, requestListener);

server.listen(8000, "127.0.0.1");

function requestListener(req, res) {
  const proto = req.connection.encrypted ? "https" : "http";
  const {headers: {host}, url: path} = req;
  const url = new URL(`${proto}://${host}${path}`);

  if (req.forwarded.proto) url.protocol = `${req.forwarded.proto}:`;
  if (req.forwarded.host) url.port = "", url.host = req.forwarded.host;

  res.writeHead(200);
  res.end(`${url}\n`);
}
```
