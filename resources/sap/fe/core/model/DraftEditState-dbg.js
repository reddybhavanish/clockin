/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(
	["sap/ui/mdc/condition/FilterOperatorUtil", "sap/ui/mdc/condition/Operator", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
	function(FilterOperatorUtil, Operator, Filter, FilterOperator) {
		"use strict";

		var feBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");
		/**
		 * Enum for edit state of a document in an draft enabled service collection.
		 * Allows to simplify filtering on a set of documents as described by the
		 * individual state
		 *
		 * @readonly
		 * @enum {String}
		 * @private
		 * @sap-restricted
		 */
		var EDITSTATE = {
			/**
			 * Active documents that don't have a corresponding draft and all own draft documents
			 * @private
			 * @sap-restricted
			 */
			ALL: {
				id: "ALL",
				display: feBundle.getText("draft.ALL_FILTER")
			},
			/**
			 * Active documents that don't have a draft document
			 * @private
			 * @sap-restricted
			 */
			UNCHANGED: {
				id: "UNCHANGED",
				display: feBundle.getText("draft.UNCHANGED_FILTER")
			},
			/**
			 * Own draft documents
			 * @private
			 * @sap-restricted
			 */
			OWN_DRAFT: {
				id: "OWN_DRAFT",
				display: feBundle.getText("draft.OWN_DRAFT_FILTER")
			},
			/**
			 * Active documents that are locked by other users
			 * @private
			 * @sap-restricted
			 */
			LOCKED: {
				id: "LOCKED",
				display: feBundle.getText("draft.LOCKED_FILTER")
			},
			/**
			 * Active documents that have draft documents by other users
			 * @private

			 * @sap-restricted
			 */
			UNSAVED_CHANGES: {
				id: "UNSAVED_CHANGES",
				display: feBundle.getText("draft.UNSAVED_CHANGES_FILTER")
			}
		};

		function getFilterForEditState(sEditState) {
			switch (sEditState) {
				case EDITSTATE.UNCHANGED.id:
					return new Filter({
						filters: [
							new Filter({ path: "IsActiveEntity", operator: FilterOperator.EQ, value1: true }),
							new Filter({ path: "HasDraftEntity", operator: FilterOperator.EQ, value1: false })
						],
						and: true
					});
				case EDITSTATE.OWN_DRAFT.id:
					return new Filter({ path: "IsActiveEntity", operator: FilterOperator.EQ, value1: false });
				case EDITSTATE.LOCKED.id:
					return new Filter({
						filters: [
							new Filter({ path: "IsActiveEntity", operator: FilterOperator.EQ, value1: true }),
							new Filter({
								path: "SiblingEntity/IsActiveEntity",
								operator: FilterOperator.EQ,
								value1: null
							}),
							new Filter({
								path: "DraftAdministrativeData/InProcessByUser",
								operator: FilterOperator.NE,
								value1: ""
							})
						],
						and: true
					});
				case EDITSTATE.UNSAVED_CHANGES.id:
					return new Filter({
						filters: [
							new Filter({ path: "IsActiveEntity", operator: FilterOperator.EQ, value1: true }),
							new Filter({
								path: "SiblingEntity/IsActiveEntity",
								operator: FilterOperator.EQ,
								value1: null
							}),
							new Filter({
								path: "DraftAdministrativeData/InProcessByUser",
								operator: FilterOperator.EQ,
								value1: ""
							})
						],
						and: true
					});
				default:
					// ALL
					return new Filter({
						filters: [
							new Filter({ path: "IsActiveEntity", operator: FilterOperator.EQ, value1: false }),
							new Filter({
								path: "SiblingEntity/IsActiveEntity",
								operator: FilterOperator.EQ,
								value1: null
							})
						],
						and: false
					});
			}
		}

		FilterOperatorUtil.addOperator(
			new Operator({
				name: "DRAFT_EDIT_STATE",
				valueTypes: ["self"],
				tokenParse: "^(.*)$",
				format: function(vValue) {
					return vValue && vValue.values;
				},
				getModelFilter: function(oCondition, sFieldPath) {
					return getFilterForEditState(oCondition.values[0]);
				}
			})
		);

		return EDITSTATE;
	},
	true
);
