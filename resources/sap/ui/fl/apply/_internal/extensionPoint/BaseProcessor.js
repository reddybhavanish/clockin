/*!
* OpenUI5
 * (c) Copyright 2009-2020 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.define(["sap/ui/fl/registry/ExtensionPointRegistry","sap/ui/core/util/reflection/JsControlTreeModifier","sap/base/util/merge"],function(E,J,m){'use strict';var B={createDefaultContent:function(e){return e.createDefault().then(function(c){c.forEach(function(n,i){J.insertAggregation(e.targetControl,e.aggregationName,n,e.index+i,e.view);});e.ready(c);return c;});},applyExtensionPoint:function(e){var o=E.getInstance();var a=m({defaultContent:[]},e);o.registerExtensionPoints(a);return B.createDefaultContent(e).then(function(c){a.defaultContent=a.defaultContent.concat(c.map(function(C){return C.getId();}));});}};return B;});
