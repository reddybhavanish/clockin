/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

sap.ui.define([
], function() {
	"use strict";

	/**
	 * Viewport renderer.
	 * @namespace
	 */
	var ViewportRenderer = {};

	ViewportRenderer.render = function(rm, control) {
		rm.write("<div");
		rm.writeControlData(control);
		rm.addClass("sapVizKitViewport");
		rm.writeClasses();
		rm.writeAttribute("tabindex", 0);
		rm.writeAttribute("aria-label", "Image");
		rm.addStyle("width", control.getWidth());
		rm.addStyle("height", control.getHeight());
		rm.writeStyles();
		rm.write(">");

		// Render Safe Area
		if (control.getSafeArea()){
			rm.renderControl(control.getSafeArea());
		}

		var i, l;

		// Render gizmos of active tools
		var oTools = control.getTools();
		for (i = 0, l = oTools.length; i < l; i++) { // loop over all oTools
			var _tool =  sap.ui.getCore().byId(oTools[i]); // get control for associated control
			var _gizmo = _tool.getGizmoForContainer(control);
			if (_gizmo && _gizmo.hasDomElement()) {
				rm.renderControl(_gizmo);
			}
		}

		var aContent = control.getContent();
		for (i = 0, l = aContent.length; i < l; i++) {
			rm.renderControl(aContent[i]);
		}

		// Render annotations
		var oAnnotations = control.getAnnotations();
		if (oAnnotations && oAnnotations.length > 0) {
			rm.write("<div");
			rm.addClass("sapUiVizKitAnnotationContainer");
			rm.writeClasses();
			rm.write(">");
			oAnnotations.forEach(function(oAnnotation) {
				// WARNING: this is just a temporary fix to avoid crash. Must be removed after new architecture is applied
				oAnnotation._viewport = control;

				rm.renderControl(oAnnotation);
			});
			rm.write("</div>");
		}

		rm.write("</div>");
	};

	return ViewportRenderer;

}, /* bExport = */ true);
