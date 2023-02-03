/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(['sap/base/Log','sap/ui/mdc/util/ConditionValidated'],function(L,C){"use strict";var a=function(){};a.createItemCondition=function(k,d,i,o){var v=C.NotValidated;var V=[k,d];if(d===null||d===undefined){V.pop();}else{v=C.Validated;}return this.createCondition("EQ",V,i,o,v);};a.createCondition=function(o,v,i,O,V){var c={operator:o,values:v,isEmpty:null,validated:V};if(i){c.inParameters=i;}if(O){c.outParameters=O;}return c;};a._removeEmptyConditions=function(c){for(var i=c.length-1;i>-1;i--){if(c[i].isEmpty){c.splice(parseInt(i),1);}}return c;};return a;},true);
