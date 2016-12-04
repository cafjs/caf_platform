# CAF.js (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app and gadgets.

See http://www.cafjs.com

## CAF Platform
[![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_platform/status.svg)](http://ci.cafjs.com/cafjs/caf_platform)

This repository contains CAF.js core platform components.

This platform multiplexes many (e.g., 1k-10K) CAs of one application in a single `node.js` process, and integrates with a PaaS to scale to many processes.

The goal is to host a billion CAs with a reasonable number of servers (e.g., < 30K), and each CA processing a simple message per second.

We use `Redis` to checkpoint CAs state before externalization. The state of a CA is assumed to be small, i.e., kilobytes not megabytes. See {@link external:caf_ca}.

External interaction with CAs uses a websocket pipeline based on `connect`. See {@link external:caf_cli}.
