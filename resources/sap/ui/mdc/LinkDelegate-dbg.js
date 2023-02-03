/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([], function() {
	"use strict";
	/**
	   * Base Delegate for {@link sap.ui.mdc.Link}. Extend this object in your project to use all functionalites of the {@link sap.ui.mdc.Link}.
	   * <b>Note:</b>
	   * The class is experimental and the API/behaviour is not finalized and hence this should not be used for productive usage.
	   * @author SAP SE
	   * @private
	   * @experimental
	   * @since 1.74
	   * @alias sap.ui.mdc.LinkDelegate
	   */
	var LinkDelegate = {
		/**
		 * Fetches the relevant {@link sap.ui.mdc.link.LinkItem} for the Link and returns them.
		 * @public
		 * @param {Object} oPayload - The Payload of the Link given by the application
		 * @param {Object} oBindingContext - The binding context of the Link
		 * @param {Object} oInfoLog - The InfoLog of the Link
		 * @returns {Promise} once resolved <code>null</code> or an array of {@link sap.ui.mdc.link.LinkItem} is returned
		 * In case <code>null</code> is returned the mdc.Link won't cache the LinkItems
		 */
		fetchLinkItems: function(oPayload, oBindingContext, oInfoLog) {
			return Promise.resolve(null);
		},
		/**
		 * Calculates the type of link that should be displayed
		 * @param {Object} oPayload - The Payload of the Link given by the application
		 * @returns {Promise} once resolved an object oLinkType is returned
		 * @returns {Number} oLinkType.type - 0 (Text) | 1 (Direct Link) | 2 (Popup)
		 * @returns {sap.ui.mdc.link.LinkItem} oLinkType.directLink - instance of {@link sap.ui.mdc.link.LinkItem} which should be used for direct navigation
		 * In case oLinkType.type is 0 the Link will get rendered as a text
		 * In case oLinkType.type is 1 the Link will get rendered as a Link but it won't have a Popover - it will trigger a direct navigation on press
		 * In case oLinkType.type is 2 the Link will get rendered as a Link and will open a Popover (default)
		 */
		fetchLinkType: function(oPayload) {
			return Promise.resolve({
				type: 2,
				directLink: undefined
			});
		},
		/**
		 * Fetches the relevant additionalContent for the Link and retuns it as an array.
		 * @public
		 * @param {Object} oPayload - The Payload of the Link given by the application
		 * @param {Object} oBindingContext - The binding context of the Link
		 * @returns {Promise} once resolved an array of {@link sap.ui.core.Control} is returned
		 */
		fetchAdditionalContent: function(oPayload, oBindingContext) {
			return Promise.resolve([]);
		},
		/**
		 * Enables the modification of LinkItems before the popover opens. This enables additional parameters
		 * to be added to the link
		 * @param {Object} oPayload - The payload of the Link given by the application
		 * @param {Object} oBindingContext - The binding context of the Link
		 * @param {sap.ui.mdc.link.LinkItem} aLinkItems - The LinkItems of the Link that can be modified
		 * @returns {Promise} once resolved an array of {@link sap.ui.mdc.link.LinkItem} is returned
		 */
		modifyLinkItems: function(oPayload, oBindingContext, aLinkItems) {
			return Promise.resolve(aLinkItems);
		},
		/**
		 * Allows interception before the actual navigation happens
		 * @param {Object} oPayload - The payload of the Link given by the application
		 * @param {Object} oEvent - The pressLink event which gets fired by the Link
		 * @returns {Promise} once resolved a boolean value which decides whether the navigation should be done or not
		 */
		beforeNavigationCallback: function(oPayload, oEvent) {
			return Promise.resolve(true);
		}
	};
	return LinkDelegate;
}, /* bExport= */ true);
