/*!
 * Copyright (c) 2009-2020 SAP SE, All Rights Reserved
 */
sap.ui.define(["sap/ui/model/odata/v2/ODataModel"],function(O){"use strict";var F=O.extend("sap.ushell.plugins.ghostapp.FakeModel",{constructor:function(s,p){O.apply(this,arguments);this.setDeferredGroups(["undefined",this.sDefaultChangeGroup]);},setDeferredGroups:function(){O.prototype.setDeferredGroups.apply(this,arguments);this.mDeferredGroups["undefined"]="undefined";}});F.getMetadata().getName=function(){return"sap.ui.model.odata.v2.ODataModel";};return F;});
