/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(['sap/ui/mdc/field/FieldValueHelpDelegate','sap/ui/mdc/util/BaseType'],function(F,B){"use strict";var O=Object.assign({},F);O.isSearchSupported=function(p,l){return!!l.changeParameters;};O.executeSearch=function(p,l,s){if(s){l.changeParameters({$search:s});}else{l.changeParameters({$search:undefined});}};return O;});
