//Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define(["sap/ui/Device"],function(D){"use strict";var P={};P._sectionVisibility=function(v,a){return!(!a&&v.length===0&&(D.system.phone||(D.system.tablet&&!D.system.desktop)));};return P;});
