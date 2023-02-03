/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/ui/core/util/XMLPreprocessor","sap/fe/macros/PhantomUtil","./Chart.metadata","./Field.metadata","./FilterField.metadata","./FilterBar.metadata","./Form.metadata","./FormContainer.metadata","./MicroChart.metadata","./Table.metadata","./ValueHelp.metadata","./Contact.metadata","./field/QuickViewForm.metadata"],function(X,P,C,F,a,b,c,d,M,T,V,e,Q){"use strict";var n="sap.fe.macros",f=[T,c,d,F,b,a,C,V,M,e,Q].map(function(E){if(typeof E==="string"){return{name:E,namespace:n,metadata:{metadataContexts:{},properties:{},events:{}}};}return E;});function r(){f.forEach(function(E){P.register(E);});}function g(){f.forEach(function(E){X.plugIn(null,E.namespace,E.name);});}r();return{register:r,deregister:g};});
