/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/ui/core/util/XMLPreprocessor","sap/fe/macros/PhantomUtil","./SubSectionBlockContent.metadata"],function(X,P,S){"use strict";var n="sap.fe.templates.ObjectPage.macros",c=[S].map(function(e){if(typeof e==="string"){return{name:e,namespace:n,metadata:{metadataContexts:{},properties:{},events:{}}};}return e;});function r(){c.forEach(function(e){P.register(e);});}function d(){c.forEach(function(e){X.plugIn(null,e.namespace,e.name);});}r();return{register:r,deregister:d};});
