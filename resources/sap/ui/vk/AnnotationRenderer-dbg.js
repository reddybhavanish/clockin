/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

sap.ui.define([
], function() {
	"use strict";

	/**
	 * Annotation renderer.
	 * @namespace
	 */
	var AnnotationRenderer = {};

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
	AnnotationRenderer.render = function(oRm, oControl) {

		oRm.write("<div");
		oRm.writeControlData(oControl);
		var style = oControl.getEditable() && oControl.getSelected() ? "Editing" : oControl.getStyle();
		oRm.addClass("sapUiVizKitAnnotation" + style);
		oRm.writeClasses();
		oRm.write(">");

		for (var i = 0; i < 8; i++) {
			oRm.write("<div");
			oRm.addClass("sapUiVizKitAnnotationElement" + i);
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");
		}

		oRm.write("<div");
		oRm.addClass("sapUiVizKitAnnotationNode" + style);
		oRm.writeClasses();
		oRm.write(">");
		oRm.write("</div>");

		oRm.write("<div");
		oRm.addClass("sapUiVizKitAnnotationLeader" + style);
		oRm.writeClasses();
		oRm.write(">");
		oRm.write("</div>");

		if (oControl._textDiv) {
			oRm.renderControl(oControl._textDiv);
		}

		oRm.write("</div>");
	};

	return AnnotationRenderer;

}, /* bExport= */ true);
