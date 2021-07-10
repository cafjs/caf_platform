# Caf.js

Co-design cloud assistants with your web app and IoT devices.

See https://www.cafjs.com

## CAF Platform

[![Build Status](https://github.com/cafjs/caf_platform/actions/workflows/push.yml/badge.svg)](https://github.com/cafjs/caf_platform/actions/workflows/push.yml)


This repository contains `Caf.js` core platform components.

The platform multiplexes many (e.g., 1k-10K) CAs of one application in a single `node.js` process, and integrates with a PaaS to scale to many processes.

The goal is to host a billion CAs with a reasonable number of servers (e.g., < 5K), and each CA processing a simple message per second.

We use `Redis` to checkpoint CAs before externalization. The state of a CA is assumed to be small, i.e., kilobytes not megabytes. See {@link external:caf_ca}.

External interactions with CAs use a websocket pipeline based on `connect`. See {@link external:caf_cli}.
