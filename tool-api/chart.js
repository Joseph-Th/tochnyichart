#!/usr/bin/env node
'use strict';

// Public chart-author entrypoint. The implementation remains in tools/chart.js
// so existing integrations keep working while author agents receive a distinct
// and intentionally narrow surface.
require('../tools/chart.js');
