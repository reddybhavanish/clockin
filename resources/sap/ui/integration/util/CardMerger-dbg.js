/*!
 * OpenUI5
 * (c) Copyright 2009-2020 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/base/util/merge"], function(merge) {
	"use strict";

	var CardMerger = {
		mergeCardDelta: function(oManifest, aChanges) {
			var oInitialManifest = merge({}, oManifest),
				sSection = oInitialManifest["sap.card"] ? "sap.card" : "sap.widget";

			aChanges.forEach(function(oChange) {
				merge(oInitialManifest[sSection], oChange.content);
			});
			return oInitialManifest;
		}
	};

	return CardMerger;
});