sap.ui.define(
	[
		"./BaseAPI",
		"sap/fe/test/Utils",
		"sap/fe/test/builder/HeaderBuilder",
		"sap/ui/test/OpaBuilder",
		"sap/fe/test/builder/FEBuilder",
		"sap/fe/test/builder/OverflowToolbarBuilder",
		"sap/fe/core/helpers/StableIdHelper"
	],
	function(BaseAPI, Utils, HeaderBuilder, OpaBuilder, FEBuilder, OverflowToolbarBuilder, StableIdHelper) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.HeaderBuilder} oHeaderBuilder the HeaderBuilder builder instance to operate on
		 * @param {string} [vHeaderDescription] the Header description (optional), used to log message
		 * @returns {sap.fe.test.api.HeaderAPI} the instance
		 * @constructor
		 * @private
		 */
		var HeaderAPI = function(oHeaderBuilder, vHeaderDescription) {
			if (!Utils.isOfType(oHeaderBuilder, HeaderBuilder)) {
				throw new Error("oHeaderBuilder parameter must be a HeaderBuilder instance");
			}
			return BaseAPI.call(this, oHeaderBuilder, vHeaderDescription);
		};
		HeaderAPI.prototype = Object.create(BaseAPI.prototype);
		HeaderAPI.prototype.constructor = HeaderAPI;

		/**
		 * Helper method to for creating an OverflowToolbarBuilder for the actions of the object page header title.
		 * Since there´s no stable id for the OverflowToolbar, it´s identified by checking the parent controls and
		 * the ObjectPageLayoutId.
		 *
		 * @param {string} sObjectPageLayoutId id of sap.uxap.ObjectPageLayout control.
		 * @returns {object} OverflowToolbarBuilder object
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderAPI.prototype.createOverflowToolbarBuilder = function(sObjectPageLayoutId) {
			return OverflowToolbarBuilder.create(this.getOpaInstance())
				.hasType("sap.m.OverflowToolbar")
				.check(function(aOverflowToolbar) {
					return aOverflowToolbar.some(function(oOverflowToolbar) {
						return (
							oOverflowToolbar
								.getParent()
								.getMetadata()
								.getName() === "sap.uxap.ObjectPageDynamicHeaderTitle" &&
							oOverflowToolbar
								.getParent()
								.getParent()
								.getMetadata()
								.getName() === "sap.uxap.ObjectPageLayout" &&
							oOverflowToolbar
								.getParent()
								.getParent()
								.getId() === sObjectPageLayoutId
						);
					});
				});
		};

		/**
		 * Helper method to for creating an OpaBuilder for object page header title.
		 * Since there´s no stable id for the header title control, it´s identified by using the
		 * ObjectPageLayout as direct ancestor.
		 *
		 * @param {string} sObjectPageLayoutId id of sap.uxap.ObjectPageLayout control.
		 * @returns {object} OpaBuilder object
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderAPI.prototype.getObjectPageDynamicHeaderTitleBuilder = function(sObjectPageLayoutId) {
			return OpaBuilder.create(this.getOpaInstance())
				.hasType("sap.uxap.ObjectPageDynamicHeaderTitle")
				.has(OpaBuilder.Matchers.ancestor(sObjectPageLayoutId, true));
		};

		/**
		 * Helper method to for creating an OpaBuilder for object page header content.
		 *
		 * @param {string} sHeaderContentId id of sap.uxap.ObjectPageDynamicHeaderContent control
		 * @returns {object} OpaBuilder object
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderAPI.prototype.getObjectPageDynamicHeaderContentBuilder = function(sHeaderContentId) {
			return OpaBuilder.create(this.getOpaInstance()).hasId(sHeaderContentId);
		};

		HeaderAPI.prototype.getFieldGroupFieldId = function(vFieldIdentifier, sViewId) {
			var sId = "fe::HeaderFacet";

			sId += "::Form";
			sId += "::" + StableIdHelper.prepareId(vFieldIdentifier.fieldGroup);
			sId += "::DataField";
			sId += "::" + vFieldIdentifier.field;
			sId += "::Field";

			sId = StableIdHelper.prepareId(sId);
			return sViewId ? sViewId + "--" + sId : sId;
		};

		/**
		 * Helper method to for creating an FEBuilder depending on given matchers and ancestor.
		 *
		 * @param {object} oMatcher matcher-object like paginator icon
		 * @param {string} sAncestor id of ancestor control
		 * @param {object} [mState] matcher-object like visibility and enablement
		 * @returns {object} FEBuilder object
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderAPI.prototype.createPaginatorBuilder = function(oMatcher, sAncestor, mState) {
			return FEBuilder.create(this.getOpaInstance())
				.hasType("sap.uxap.ObjectPageHeaderActionButton")
				.has(oMatcher)
				.hasState(mState)
				.has(OpaBuilder.Matchers.ancestor(sAncestor, false));
		};

		return HeaderAPI;
	}
);
