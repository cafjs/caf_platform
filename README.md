# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Platform
[![Build Status](http://ci.cafjs.com/api/badges/cafjs/caf_platform/status.svg)](http://ci.cafjs.com/cafjs/caf_platform)


This repository contains CAF platform components. 

They allow you to multiplex many CAs of one application in a single node.js process, use Redis to checkpoint their state, interact with them using web sockets, and integrate with a PaaS to scale to many processes. 

They also provide a simplified programming model that we hope will be more familiar to front-end programmers than raw node.js. 

