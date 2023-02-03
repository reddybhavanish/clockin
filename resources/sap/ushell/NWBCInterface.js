//Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define(["sap/ushell/EventHub"],function(E){"use strict";var N={};N.notifyUserActivity=function(){E.emit("nwbcUserIsActive",Date.now());};return N;});
