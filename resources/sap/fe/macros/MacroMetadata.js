/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define([],function(){"use strict";var a=function(p,c,i){if(c){var C=c[i];var t=this;if(C){Object.keys(C).forEach(function(s){if(t.metadata.properties.hasOwnProperty(s)&&t.metadata.properties[s].configurable){p[s]=C[s];}});}}return p;};var M={extend:function(n,c){c.hasValidation=true;c.applyOverrides=a.bind(c);return c;}};return M;});
