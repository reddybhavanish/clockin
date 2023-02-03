/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/ui/mdc/odata/v4/FieldValueHelpDelegate","sap/fe/core/helpers/ValueListHelper"],function(F,V){"use strict";var O=Object.assign({},F);O.determineSearchSupported=function(p,f){return V.setValueListFilterFields(p.propertyPath,f,true,p.conditionModel);};O.contentRequest=function(p,f,s){return V.showValueListInfo(p.propertyPath,f,s,p.conditionModel);};return O;},false);
