/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

//Provides class sap.fe.core.model.DraftModel
sap.ui.define(
	[
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/odata/v4/ODataListBinding",
		"sap/ui/model/odata/v4/Context",
		"sap/ui/model/Filter",
		"sap/ui/base/ManagedObject",
		"sap/ui/model/ChangeReason",
		"sap/ui/model/resource/ResourceModel",
		"sap/ui/model/odata/v4/ODataContextBinding",
		"sap/base/Log",
		"sap/fe/core/model/DraftEditState"
	],
	function(
		JSONModel,
		ODataListBinding,
		Context,
		Filter,
		ManagedObject,
		ChangeReason,
		ResourceModel,
		ODataContextBinding,
		Log,
		EDITSTATE
	) {
		"use strict";

		var MODELUPGRADENAMESPACE = "_$DraftModel";
		/* Just for support one can switch this in the debugger to have the internal private data added to the model */
		var bAddPrivateDataToModel = false;

		/* Container for internal state per model. Needs to be destroyed with the model */
		var oPrivatModelData = {};

		/**
		 * Stores private data
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @param {String} sKey key that is the target for the data in the object
		 * @param {Object} oData data to be stored
		 */
		function storeData(oModel, sKey, oData) {
			var oModelId = typeof oModel === "string" ? oModel : oModel.getId(),
				oPrivateData = (oPrivatModelData[oModelId] = oPrivatModelData[oModelId] || {});
			oPrivateData[sKey] = oData;
			if (bAddPrivateDataToModel && !oModel[MODELUPGRADENAMESPACE]) {
				oModel[MODELUPGRADENAMESPACE] = oPrivateData;
			}
		}

		/**
		 * Retrieves private data from the model
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @param {String} sKey key that is the target for the data in the object
		 * @returns {Object} oData data to be stored
		 */
		function getData(oModel, sKey) {
			var oModelId = typeof oModel === "string" ? oModel : oModel.getId();
			return oPrivatModelData[oModelId] && oPrivatModelData[oModelId][sKey];
		}

		/**
		 * Get all EntitySets with all EntitySet annotations
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @returns {Array} Array of entity sets including annotations in @ and @sapui.name
		 */
		function getAllEntitySets(oModel) {
			var oMetaModel = oModel.getMetaModel(),
				aEntitySets = getData(oModel, "aEntitySets"),
				containerPromise = aEntitySets
					? Promise.resolve(aEntitySets)
					: oMetaModel &&
					  oMetaModel.requestObject("/").then(function(oEntityContainer) {
							var aPromises = [];
							Object.keys(oEntityContainer).forEach(function(key) {
								var oElement = oEntityContainer[key],
									oPromise;
								if (oElement.$kind === "EntitySet") {
									oPromise = oMetaModel.requestObject("/" + key + "@");
									/* eslint max-nested-callbacks: 0 */
									aPromises.push(
										oPromise.then(function(oEntitySetAnnotations) {
											var oEntitySetAnnotation = {};
											/* Merge annotations to the entitySet object */
											oEntitySetAnnotation["@"] = oEntitySetAnnotations;
											oEntitySetAnnotation["@sapui.name"] = key;
											return oEntitySetAnnotation;
										})
									);
								}
							});
							return Promise.all(aPromises);
					  });
			return containerPromise;
		}

		/**
		 * Creates an operation context binding for the given operation
		 * @param {sap.ui.model.odata.v4.Context} oContext The context that should be bound to the operation
		 * @param {String} sOperation The operation (action or function import)
		 * @return {sap.ui.model.odata.v4.ODataContextBinding} The context binding of the bound operation
		 */
		function createOperation(oContext, sOperation, oOptions) {
			var oModel = oContext.getModel();
			oOptions = oOptions || { $$inheritExpandSelect: false };
			return oModel.bindContext(sOperation + "(...)", oContext, oOptions);
		}

		/* function templates of operations */

		/**
		 * Activates a draft document. The draft will replace the sibling entity and will be deleted by the backend
		 * @function
		 * @name sap.fe.core.model.DraftModel.upgradedContext#executeDraftActivationAction
		 * @returns {Promise.<sap.ui.model.odata.v4.Context>} Resolve function returns the context of the operation
		 * @private
		 * @sap-restricted
		 */
		function executeDraftActivationAction() {
			if (!this.getProperty("IsActiveEntity")) {
				var oOperation = createOperation(this, arguments[0], { $$inheritExpandSelect: true });
				return oOperation.execute().then(function(oActiveDocumentContext) {
					return oActiveDocumentContext;
				});
			} else {
				throw new Error("The activation action cannot be executed on an active document");
			}
		}

		/**
		 * Execute a preparation action
		 * @function
		 * @name sap.fe.core.model.DraftModel.upgradedContext#executeDraftPreparationAction
		 * @param {String} [sideEffectsQualifier] Limits the prepare activities to a given side effects group specified by this qualifier
		 * @returns {Promise.<sap.ui.model.odata.v4.Context>} Resolve function returns the context of the operation
		 * @private
		 * @sap-restricted
		 */
		function executeDraftPreparationAction(sideEffectsQualifier) {
			if (!this.getProperty("IsActiveEntity")) {
				var oOperation = createOperation(this, arguments[0]);
				/* Fix arguments */
				sideEffectsQualifier = arguments[1];
				if (typeof sideEffectsQualifier === "undefined") {
					sideEffectsQualifier = "";
				}
				oOperation.setParameter("SideEffectsQualifier", sideEffectsQualifier);
				return oOperation.execute().then(function() {
					return oOperation;
				});
			} else {
				throw new Error("The preparation action cannot be executed on an active document");
			}
		}

		/**
		 * Executes validation of a draft function
		 * @function
		 * @name sap.fe.core.model.DraftModel.upgradedContext#executeDraftValidationFunction
		 * @returns {Promise.<sap.ui.model.odata.v4.Context>} Resolve function returns the context of the operation
		 * @private
		 * @sap-restricted
		 */
		function executeDraftValidationFunction() {
			if (!this.getProperty("IsActiveEntity")) {
				var oOperation = createOperation(this, arguments[0]);
				return oOperation.execute().then(function() {
					return oOperation;
				});
			} else {
				throw new Error("The validation function cannot be executed on an active document");
			}
		}

		/**
		 * Creates a new draft from an active document
		 * @function
		 * @name sap.fe.core.model.DraftModel.upgradedContext#executeDraftEditAction
		 * @param {Boolean} preserveChanges
		 *  <ul>
		 * 		<li>true - existing changes from another user that are not locked are preserved and an error message (http status 409) is send from the backend</li>
		 * 		<li>false - existing changes from another user that are not locked are overwritten</li>
		 * 	</ul>
		 * @returns {Promise.<sap.ui.model.odata.v4.Context>} Resolve function returns the context of the operation
		 * @private
		 * @sap-restricted
		 */
		function executeDraftEditAction(preserveChanges) {
			if (this.getProperty("IsActiveEntity")) {
				var oOperation = createOperation(this, arguments[0], { $$inheritExpandSelect: true });
				/* Fix arguments */
				preserveChanges = arguments[1];
				oOperation.setParameter("PreserveChanges", preserveChanges);
				return oOperation.execute().then(function(oDraftDocumentContext) {
					return oDraftDocumentContext;
				});
			} else {
				throw new Error("The edit action cannot be executed on a draft document");
			}
		}

		/**
		 * @classdesc
		 * Only for documentation of the methods that are mixed into the {@link sap.ui.model.odata.v4.Context}
		 * if the context is part of a draft entitySet
		 * @namespace
		 * @alias sap.fe.core.model.DraftModel.upgradedContext
		 * @experimental This module is only for experimental use!
		 * @private
		 * @sap-restricted
		 */
		var oOperationTemplates = {
			/* draftOperations: */
			"ActivationAction": executeDraftActivationAction,
			"PreparationAction": executeDraftPreparationAction,
			"ValidationFunction": executeDraftValidationFunction,
			/* documentOperations: */
			"EditAction": executeDraftEditAction
		};

		/**
		 * Adds methods for creating bound operations on the context object
		 * @param {sap.ui.model.odata.v4.Context} oContext The context object that should get the operations
		 * @param {Object} oEntitySet The entitySet for the context
		 */
		function addOperationsToContext(oContext, oEntitySet) {
			var oOperations =
				oEntitySet["@"]["@com.sap.vocabularies.Common.v1.DraftRoot"] ||
				oEntitySet["@"]["@com.sap.vocabularies.Common.v1.DraftNode"];
			Object.keys(oOperations).forEach(function(operationName) {
				var sOperation = oOperations[operationName];
				if (oOperationTemplates[operationName]) {
					oContext["executeDraft" + operationName] = oOperationTemplates[operationName].bind(oContext, sOperation);
				}
			});
		}

		/**
		 * Check if this is a draft model.<br/>
		 *
		 * A model is considered a draft model if at least one entitySet of the OData service is annotated with one of the terms
		 * <ul>
		 *   <li>com.sap.vocabularies.Common.v1.DraftRoot</li>
		 *   <li>com.sap.vocabularies.Common.v1.DraftNode</li>
		 * </ul>
		 *
		 * @function
		 * @name sap.fe.core.model.DraftModel#isDraftModel
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @returns {Promise.<Boolean>} True if Draft Model
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function isDraftModel(oModel) {
			/* Strategy: check if at least one entitySet is draft enabled */
			/* Load EntityContainer */
			// undefined means never evaluated before
			if (getData(oModel, "bIsDraftEnabled") === undefined) {
				return getAllEntitySets(oModel).then(function(aEntitySetWithAnnotations) {
					/* All entitySet annotations are avaialable */
					var aDraftEntitySetAnnotations = aEntitySetWithAnnotations.filter(function(oEntitySet) {
							var oAnnotations = oEntitySet["@"] || {};
							return (
								oAnnotations.hasOwnProperty("@com.sap.vocabularies.Common.v1.DraftRoot") ||
								oAnnotations.hasOwnProperty("@com.sap.vocabularies.Common.v1.DraftNode")
							);
						}),
						bIsDraft = Array.isArray(aDraftEntitySetAnnotations) && aDraftEntitySetAnnotations.length > 0;
					if (bIsDraft) {
						/* it is very likely that we need the entiySet data again so save it to the model */
						storeData(oModel, "aEntitySets", aEntitySetWithAnnotations);
						storeData(oModel, "aDraftEntitySets", aDraftEntitySetAnnotations);
					}
					storeData(oModel, "bIsDraftEnabled", bIsDraft);
					return bIsDraft;
				});
			} else {
				return Promise.resolve(getData(oModel, "bIsDraftEnabled"));
			}
		}

		/**
		 * Upgrades an OData v4 model to a draft model
		 *
		 * The model will overwrite the following methods to be able to serve data and keep state in an internal
		 * JSONModel:
		 *  <ul>
		 *        <li>bindList <ul>
		 *           <li>to add static filters to $filter and $expand to the binding for draft enabled EntitySets<li>
		 *        </ul></li>
		 * </ul>
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @private
		 */
		function _upgrade(oModel) {
			//No double upgrades
			if (getData(oModel, "bUpgraded")) {
				Log.warning("Model was already upgraded to DraftModel");
				return;
			}

			var fnOriginal = {},
				mListBindings = {},
				iListBindingIndex = -1, //index for mListBindings
				oModelData = {
					/**
					 * editStates
					 * @constant For filtering documents by state e.g. own drafts, unchanged documents, etc
					 * @type {map}
					 */
					"editStates": [
						{ id: EDITSTATE.ALL.id, name: EDITSTATE.ALL.display },
						{ id: EDITSTATE.UNCHANGED.id, name: EDITSTATE.UNCHANGED.display },
						{ id: EDITSTATE.OWN_DRAFT.id, name: EDITSTATE.OWN_DRAFT.display },
						{ id: EDITSTATE.LOCKED.id, name: EDITSTATE.LOCKED.display },
						{ id: EDITSTATE.UNSAVED_CHANGES.id, name: EDITSTATE.UNSAVED_CHANGES.display }
					],

					/*  We need the properties at least per entitySet (maybe even navigation props) */
					"entitySets": {}
				},
				oInternalModel,
				aDraftEntitySets = getData(oModel, "aDraftEntitySets");

			storeData(oModel, "mListBindings", mListBindings);

			/* Work on draft entity sets */
			aDraftEntitySets.forEach(function(entitySet) {
				/* Create a draft management section for each draft entity set */
				oModelData.entitySets[entitySet["@sapui.name"]] = {
					editState: EDITSTATE.ALL
				};
			});

			/* Provide access function */
			oInternalModel = new JSONModel(oModelData);

			storeData(oModel, "oDraftAccessModel", oInternalModel);
			oModel.getDraftAccessModel = getDraftAccessModel;

			/* Overwrite bindList */
			fnOriginal.bindList = oModel.bindList;
			oModel.bindList = function(sPath, oContext, vSorters, vFilters, mParameters) {
				/* Special handling for draft entity sets */
				var oEntitySetState = oInternalModel.getObject("/entitySets" + sPath),
					oListBinding;

				if (oEntitySetState) {
					/* upgrade mParameters of ListBindng of Draft EntitySets only */
					var sExpand = "";
					mParameters = mParameters || {};
					sExpand = mParameters.$expand;
					/* merge given $expand */
					if (sExpand) {
						if (sExpand.indexOf("DraftAdministrativeData") < 0) {
							sExpand += ",DraftAdministrativeData";
						}
					} else {
						sExpand = "DraftAdministrativeData";
					}
					mParameters.$expand = sExpand;
				}
				/* argument 4 is mParameters */
				arguments[4] = mParameters;
				oListBinding = fnOriginal.bindList.apply(this, arguments);

				if (oEntitySetState) {
					oListBinding._bDraftModelUpgrade = true;
					/* keep a list of overwritten ListBindings */
					mListBindings[++iListBindingIndex] = oListBinding;
					/* overwrite destroy to remove from list. Since iListBindingIndex is native type we need a factory function */
					oListBinding.destroy = (function(index) {
						return function() {
							delete mListBindings[index];
							return ODataListBinding.prototype.destroy.apply(this, arguments);
						};
					})(iListBindingIndex);
				}
				return oListBinding;
			};

			function upgradeContext(oContext) {
				var bFoundDraftEntitySet = false,
					sPath = oContext.getPath();
				/* Only manipulate if this is context of an upgraded model */
				if (getData(oModel, "bUpgraded") && sPath) {
					aDraftEntitySets.forEach(function(entitySet) {
						/* run only once so check if bFoundDraftEntitySet is not true already */
						var isDraftEntitySetPath =
							!bFoundDraftEntitySet &&
							sPath.substring(sPath.indexOf("/") + 1, sPath.indexOf("(")) === entitySet["@sapui.name"];
						if (isDraftEntitySetPath) {
							bFoundDraftEntitySet = true;
							addOperationsToContext(oContext, entitySet);
						}
					});
				}
				return oContext;
			}

			/* Overwrite Context contstructor to add methods for bound (draft) operations if needed */
			fnOriginal.create = Context.create;
			Context.create = function(oModel, oBinding, sPath, iIndex, oCreatePromise) {
				return upgradeContext(fnOriginal.create.apply(null, arguments));
			};

			fnOriginal.createReturnValueContext = Context.createReturnValueContext;
			Context.createReturnValueContext = function(oModel, oBinding, sPath) {
				return upgradeContext(fnOriginal.createReturnValueContext.apply(null, arguments));
			};

			/* Clean up internal data in the destroy method */
			fnOriginal.modelDestroy = oModel.destroy;
			oModel.destroy = function() {
				delete oPrivatModelData[this.getId()];
				return fnOriginal.modelDestroy.apply(this, arguments);
			};
			/* Mark it as upgraded */
			storeData(oModel, "bUpgraded", true);
			return true;
		}

		/**
		 * Upgrades an OData v4 model to a Draft Model. Throws an error if it is not a draft enabled service
		 * <p>The result of this function will mix new functions into instances of the following classes
		 * 	<ul>
		 * 		<li>{@link sap.ui.model.odata.v4.ODataModel}</li>
		 * 		<li>{@link sap.ui.model.odata.v4.Context}</li>
		 * </ul>
		 * Read the sections {@link sap.fe.core.model.DraftModel.upgradedModel}
		 * and {@link sap.fe.core.model.DraftModel.upgradedContext} for more information about the added functions
		 * </p>
		 * @example <caption>Example usage of upgrade</caption>
		 * var oModel = new ODataModel(...);
		 * DraftModel.upgrade(oModel).then(function() {
		 * 	oView.setModel(oModel);
		 * 	oView.setModel(oModel.getDraftAccessModel(), "$draft");
		 * });
		 * @function
		 * @name sap.fe.core.model.DraftModel#upgrade
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @returns {Promise} Resolves once the model is upgraded
		 * @throws Will throw an error if the service doesn't have any draft entity sets
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function upgrade(oModel) {
			/* only upgrade draft models */
			return isDraftModel(oModel).then(function(isDraft) {
				if (isDraft) {
					/* preparation */
					return _upgrade(oModel);
				} else {
					throw new Error("The model is not draft enabled");
				}
			});
		}

		/**
		 * Upgrades an OData v4 model to a Draft Model if it is a draft enbled service and
		 * leave it as is if not.
		 * @see {@link sap.fe.core.model.DraftModel#upgrade} for more information
		 * @function
		 * @name sap.fe.core.model.DraftModel#upgradeOnDemand
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
		 * @returns {Promise.<Boolean>} True if Draft Model detected and upgraded
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function upgradeOnDemand(oModel) {
			/* only upgrade draft models */
			return isDraftModel(oModel).then(function(isDraft) {
				if (isDraft) {
					/* preparation */
					_upgrade(oModel);
				}
				return isDraft;
			});
		}

		/**
		 * Mixin for {@link sap.ui.model.odata.v4.ODataModel}. Returns the internal JSON Model aka DraftAccessModel
		 * @example <caption>The model can be set to a control or view as any other model</caption>
		 * oView.setModel(oModel.getDraftAccessModel(), "$draft");
		 * @function
		 * @name sap.fe.core.model.DraftModel.upgradedModel#getDraftAccessModel
		 * @returns {sap.ui.model.json.JSONModel} The interal DraftAccessModel
		 * @private
		 * @sap-restricted
		 */
		function getDraftAccessModel() {
			return getData(this, "oDraftAccessModel");
		}

		/**
		 * @classdesc
		 * Only for documentation of the methods that are mixed into the {@link sap.ui.model.odata.v4.ODataModel}
		 * after it has been upgraded to a sap.fe.core.model.DraftModel
		 * @namespace
		 * @alias sap.fe.core.model.DraftModel.upgradedModel
		 *
		 * @experimental This module is only for experimental use!
		 * @private
		 * @sap-restricted
		 */
		var upgradedModel = {}; /* eslint no-unused-vars: 0 */

		/**
		 * @classdesc
		 * Static Draft 2.0 Model transformation for {@link sap.ui.model.odata.v4.ODataModel}
		 * to simplify programming against the draft enabled OData services with sapui5
		 *
		 * @see {@link sap.ui.model.odata.v4.ODataModel}
		 * @namespace
		 * @alias sap.fe.core.model.DraftModel
		 * @private
		 * @sap-restricted
		 * @experimental This module is only for experimental use! <br/><b>This is only a POC and maybe deleted</b>
		 * @since 1.48.0
		 */
		var DraftModel = {
			upgrade: upgrade,
			upgradeOnDemand: upgradeOnDemand,
			isDraftModel: isDraftModel,
			EDITSTATE: EDITSTATE
		};

		return DraftModel;
	},
	/* bExport= */ true
);
