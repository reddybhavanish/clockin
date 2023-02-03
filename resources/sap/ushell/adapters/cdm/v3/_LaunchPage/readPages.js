// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define(["sap/base/util/ObjectPath","sap/base/util/values"],function(O,o){"use strict";var r={};r.getVisualizationReferences=function(p){var v;var V=[];var s=O.get("payload.sections",p)||{};o(s).forEach(function(S){v=O.get("layout.vizOrder",S)||[];v.forEach(function(a){if(S.viz[a]){V.push(S.viz[a]);}});});return V;};return r;});
