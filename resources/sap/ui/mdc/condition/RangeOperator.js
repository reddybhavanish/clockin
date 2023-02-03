/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
*/
sap.ui.define(['sap/ui/mdc/condition/Operator','sap/ui/model/Filter','sap/ui/mdc/util/DateUtil','sap/base/Log'],function(O,F,D,L){"use strict";var R=O.extend("sap.ui.mdc.condition.RangeOperator",{constructor:function(c){c.filterOperator="RANGE";c.tokenParse=c.tokenParse||"^#tokenText#$";c.tokenFormat=c.tokenFormat||"#tokenText#";O.apply(this,arguments);if(c.additionalInfo!==undefined){this.additionalInfo=c.additionalInfo;}if(c.calcRange){this.calcRange=c.calcRange;}if(c.formatRange){this.formatRange=c.formatRange;}else if(this.calcRange){this.formatRange=function(r,d){return d.formatValue(r[0],"string")+" - "+d.formatValue(r[1],"string");};}}});R.prototype.getModelFilter=function(c,f,t){var r=this._getRange(c.values[0],t);return new F({path:f,operator:"BT",value1:r[0],value2:r[1]});};R.prototype._getRange=function(d,t){var r=this.calcRange(d);for(var i=0;i<2;i++){if(t instanceof sap.ui.model.odata.type.Date||t instanceof sap.ui.model.type.Date){r[i].oDate=D.localToUtc(r[i].oDate);}r[i]=D.universalDateToType(r[i],t);}return r;};R.prototype.getStaticText=function(t){var r=this._getRange(null,t);return this.formatRange(r,t);};return R;},true);
