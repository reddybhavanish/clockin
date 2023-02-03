/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"sap/ui/core/Control",  "sap/ui/mdc/mixin/DelegateMixin"
], function(CoreControl, DelegateMixin) {
	"use strict";

	/**
	 * The base class for MDC composite controls
	 *
	 * @experimental
	 * @private
	 * @since 1.61
	 * @alias sap.ui.mdc.Control
	 */
	var Control = CoreControl.extend("sap.ui.mdc.Control", /** @lends sap.ui.mdc.Control.prototype */ {
		metadata: {
			library: "sap.ui.mdc",
			properties: {
				/**
				 * The width
				 */
				width: {
					type: "sap.ui.core.CSSSize",
					group: "Dimension",
					defaultValue: "100%",
					invalidate: true
				},
				/**
				 * The height
				 */
				height: {
					type: "sap.ui.core.CSSSize",
					group: "Dimension",
					defaultValue: "100%",
					invalidate: true
				},
				/**
				 * Path to <code>Delegate</code> module that provides the required APIs to execute model specific logic.<br>
				 * <b>Note:</b> Ensure that the related file can be requested (any required library has to be loaded before that).<br>
				 * Do not bind or modify the module. Once the required module is associated, this property might not be needed any longer.
				 *
				 * @experimental
				 */
				delegate: {
					type: "object",
					group: "Data"
				},
				/**
				 * The personalization
				 */
				personalization: {
					type: "any",
					multiple: false
				}
			}
		},
		renderer: CoreControl.renderer
	});

	DelegateMixin.call(Control.prototype);

	return Control;
});
