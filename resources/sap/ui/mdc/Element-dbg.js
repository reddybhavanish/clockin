/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"sap/ui/core/Element", "sap/ui/mdc/mixin/DelegateMixin"
], function(CoreElement, DelegateMixin) {
	"use strict";

	/**
	 * The base class for MDC composite elements
	 *
	 * @experimental
	 * @private
	 * @since 1.74
	 * @alias sap.ui.mdc.Element
	 */
	var Element = CoreElement.extend("sap.ui.mdc.Element", /** @lends sap.ui.mdc.Element.prototype */ {
		metadata: {
			library: "sap.ui.mdc",
			properties: {
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
				}
			}
		},
		renderer: CoreElement.renderer
	});

	DelegateMixin.call(Element.prototype);

	return Element;
});
