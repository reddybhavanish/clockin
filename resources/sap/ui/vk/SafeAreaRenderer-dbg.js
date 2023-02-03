/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

sap.ui.define([
], function() {
	"use strict";

	/**
	 * SafeArea Renderer.
	 * @namespace
	 */
	var SafeAreaRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided
	 * {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm
	 *            the RenderManager that can be used for writing to
	 *            the Render-Output-Buffer
	 * @param {sap.ui.core.Control} oControl
	 *            the control to be rendered
	 */
	SafeAreaRenderer.render = function(oRm, oControl) {

		oRm.write("<div");
		oRm.writeControlData(oControl);
		var vp = oControl.getParent();
		if (vp) {
			if (vp.getShowSafeArea()) {
				oRm.addClass("sapVizKitSafeAreaVisible");
			} else {
				oRm.addClass("sapVizKitSafeAreaNotVisible");
			}
		}
		oRm.writeClasses();
		oRm.write(">");

		if (oControl.getSettingsControl()) {
			oRm.renderControl(oControl.getSettingsControl());
		}
		oRm.write("</div>");
	};

	return SafeAreaRenderer;

}, /* bExport= */ true);