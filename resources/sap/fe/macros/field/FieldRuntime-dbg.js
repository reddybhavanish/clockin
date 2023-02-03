/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/fe/macros/ResourceModel",
		"sap/fe/core/helpers/SideEffectsUtil",
		"sap/base/Log"
	],
	function(XMLTemplateProcessor, XMLPreprocessor, Fragment, ResourceModel, SideEffectsUtil, Log) {
		"use strict";

		/**
		 * Get the appropriate context on which side effects can be requested.
		 * The correct one must have a binding parameter $$patchWithoutSideEffects
		 * @function
		 * @name getContextForSideEffects
		 * @param {Object} oSourceField field changed or focused out which may cause side effect
		 * @param {String} sSideEffectEntityType Target entity type of the side effect annotation
		 * @returns {Object} oContext valid to request side effects
		 */
		function _getContextForSideEffects(oSourceField, sSideEffectEntityType) {
			var oBindingContext = oSourceField.getBindingContext(),
				oMetaModel = oBindingContext.getModel().getMetaModel(),
				sMetaPath = oMetaModel.getMetaPath(oBindingContext.getPath()),
				sEntityType = oMetaModel.getObject(sMetaPath)["$Type"],
				oContextForSideEffects = oBindingContext;

			/**
			 * If the field's context belongs to a list binding OR belongs to a 1:1,
			 * 		If target entity of the side effect annotation is different
			 * 			Use context of list binding or 1:1
			 * 		If target entity of the side effect annotation is same
			 * 			Use field's context
			 */
			if (sSideEffectEntityType !== sEntityType) {
				oContextForSideEffects = oBindingContext.getBinding().getContext();
				if (oContextForSideEffects) {
					sMetaPath = oMetaModel.getMetaPath(oContextForSideEffects.getPath());
					sEntityType = oMetaModel.getObject(sMetaPath)["$Type"];
					// 1:1 inside a 1:1
					// to support this, we can recurse up until sSideEffectEntityType matches sEntityType
					if (sSideEffectEntityType !== sEntityType) {
						return undefined;
					}
				}
			}

			return oContextForSideEffects || undefined;
		}

		function _getParentViewOfControl(oControl) {
			while (oControl && !(oControl.getMetadata().getName() === "sap.ui.core.mvc.XMLView")) {
				oControl = oControl.getParent();
			}
			return oControl;
		}

		/**
		 * Static class used by MDC Field during runtime
		 *
		 * @private
		 * @experimental This module is only for internal/experimental use!
		 */
		var FieldRuntime = {
			formatDraftOwnerTextInPopover: function(
				bHasDraftEntity,
				sDraftInProcessByUser,
				sDraftLastChangedByUser,
				sDraftInProcessByUserDesc,
				sDraftLastChangedByUserDesc
			) {
				if (bHasDraftEntity) {
					var sUserDescription =
						sDraftInProcessByUserDesc || sDraftInProcessByUser || sDraftLastChangedByUserDesc || sDraftLastChangedByUser;

					if (!sUserDescription) {
						return ResourceModel.getText("draft.POPOVER_UNSAVED_CHANGES_BY_UNKNOWN");
					} else {
						return sDraftInProcessByUser
							? ResourceModel.getText("draft.POPOVER_LOCKED_BY_KNOWN", sUserDescription)
							: ResourceModel.getText("draft.POPOVER_UNSAVED_CHANGES_BY_KNOWN", sUserDescription);
					}
				} else {
					return ResourceModel.getText("draft.POPOVER_NO_DATA_TEXT");
				}
			},

			/**
			 * Triggers an internal navigation on link pertaining to DataFieldWithNavigationPath
			 * @param {Object} oSource Source of the press event
			 * @param {Object} oController Instance of the controller
			 * @param {String} sSemanticObjectName Semantic object name
			 */
			onDataFieldWithNavigationPath: function(oSource, oController, sSemanticObjectName) {
				var oBindingContext = oSource.getBindingContext();
				// ToDo: Assumes that the controller has the routing listener extension. Candidate for macroData?
				if (oController.routingListener) {
					oController.routingListener.navigateToTarget(oBindingContext, sSemanticObjectName);
				} else {
					Log.error(
						"FieldRuntime: No routing listener controller extension found. Internal navigation aborted.",
						"sap.fe.macros.field.FieldRuntime",
						"onDataFieldWithNavigationPath"
					);
				}
			},

			/**
			 * Method to be executed on click of the link
			 * @function
			 * @name onDraftLinkPressed
			 * @param {Event} oEvent event object passed from the click event
			 * @param {String} sEntitySet Name of the entity set for on the fly templating
			 */
			onDraftLinkPressed: function(oEvent, sEntitySet) {
				var that = this,
					oSource = oEvent.getSource(),
					oView = _getParentViewOfControl(oSource),
					oBindingContext = oSource.getBindingContext(),
					oMetaModel = oBindingContext.getModel().getMetaModel(),
					sViewId = oView.getId(),
					oDraftPopover;

				this.mDraftPopovers = this.mDraftPopovers || {};
				this.mDraftPopovers[sViewId] = this.mDraftPopovers[sViewId] || {};
				oDraftPopover = this.mDraftPopovers[sViewId][sEntitySet];

				if (oDraftPopover) {
					oDraftPopover.setBindingContext(oBindingContext);
					oDraftPopover.openBy(oSource);
				} else {
					var sFragmentName = "sap.fe.macros.field.DraftPopOverAdminData",
						oPopoverFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment");

					Promise.resolve(
						XMLPreprocessor.process(
							oPopoverFragment,
							{ name: sFragmentName },
							{
								bindingContexts: {
									entitySet: oMetaModel.createBindingContext("/" + sEntitySet)
								},
								models: {
									entitySet: oMetaModel
								}
							}
						)
					)
						.then(function(oFragment) {
							return Fragment.load({ definition: oFragment, controller: that });
						})
						.then(function(oPopover) {
							oDraftPopover = that.mDraftPopovers[sViewId][sEntitySet] = oPopover;
							oDraftPopover.setModel(ResourceModel.getModel(), "i18n");
							oView.addDependent(oDraftPopover);
							oDraftPopover.setBindingContext(oBindingContext);
							oDraftPopover.openBy(oSource);
						});
				}
			},

			/**
			 * Method to be executed on click of the close button of the draft admin data popover
			 * @function
			 * @name closeDraftAdminPopover
			 * @param {object} oEvent Event instance
			 */
			closeDraftAdminPopover: function(oEvent) {
				// for now go up two levels to get the popover instance
				oEvent
					.getSource()
					.getParent()
					.getParent()
					.close();
			},

			/**
			 * Method to initialize or enhance if already initialized, the queue of side effects requests
			 * in the format - { 'sContextPath' : { 'context': oContextForSideEffects, 'pathExpressions': [aPathExpressions] } }
			 * @function
			 * @name _initSideEffectsQueue
			 * @param {String} sContextPath Binding path for the field that triggers the side effect
			 * @param {Object} oContextForSideEffects Context used to request the side effect
			 * @private
			 */
			_initSideEffectsQueue: function(sContextPath, oContextForSideEffects) {
				this.sideEffectsRequestsQueue = this.sideEffectsRequestsQueue || {};
				this.sideEffectsRequestsQueue[sContextPath] = this.sideEffectsRequestsQueue[sContextPath] || {};
				this.sideEffectsRequestsQueue[sContextPath]["context"] =
					this.sideEffectsRequestsQueue[sContextPath]["context"] || oContextForSideEffects;
				this.sideEffectsRequestsQueue[sContextPath]["pathExpressions"] =
					this.sideEffectsRequestsQueue[sContextPath]["pathExpressions"] || [];
				// add the previously failed relevant side effects
				if (this.aFailedSideEffects && this.aFailedSideEffects[sContextPath]) {
					this.sideEffectsRequestsQueue[sContextPath]["pathExpressions"] = this.sideEffectsRequestsQueue[sContextPath][
						"pathExpressions"
					].concat(this.aFailedSideEffects[sContextPath]["pathExpressions"]);
					// remove from failed queue as this will now be retried
					delete this.aFailedSideEffects[sContextPath];
				}
			},

			/**
			 * Prepare for a specific side effect request.
			 * SideEffects to be requested on the same context are clubbed together in one request.
			 * @function
			 * @name prepareForSideEffects
			 * @param {String} sFieldGroupId The (virtual) field group for which side effect needs to be requested
			 * @param {Object} oSourceField field changed or focused out which may cause side effect
			 * @returns {Promise} Promise that resolves when the side effects have been prepared
			 */
			prepareForSideEffects: function(sFieldGroupId, oSourceField) {
				var that = this,
					aPathExpressions = [], // target properties and target entities of the side effect
					bWithQualifier = sFieldGroupId.indexOf("#") > -1,
					sSideEffectEntityType = (bWithQualifier && sFieldGroupId.split("#")[0]) || sFieldGroupId,
					sQualifier = (bWithQualifier && sFieldGroupId.split("#")[1]) || "",
					sSideEffectAnnotationPath = "/" + sSideEffectEntityType + "@com.sap.vocabularies.Common.v1.SideEffects",
					// oContext = oBindingContext.getBinding().getContext(),
					oBindingContext = oSourceField.getBindingContext(),
					oMetaModel = oBindingContext.getModel().getMetaModel(),
					oContextForSideEffects,
					sContextPath,
					aPropertiesToRequest, // target properties
					aQueuedPropertiesToRequest, // target properties already in queue
					aEntitiesToRequest, // target entities
					aQueuedEntitiesToRequest, // target entities already in queue
					oSideEffect,
					// for filtering and mapping, we use the below two functions
					fnGetPropertyPath = function(oPathExpression) {
						return oPathExpression["$PropertyPath"];
					},
					fnGetNavigationPropertyPath = function(oPathExpression) {
						return oPathExpression["$NavigationPropertyPath"];
					};
				sSideEffectAnnotationPath = (bWithQualifier && sSideEffectAnnotationPath + "#" + sQualifier) || sSideEffectAnnotationPath;
				oSideEffect = oMetaModel.getObject(sSideEffectAnnotationPath);
				// Only request side effects when there has been an actual change in the value of field, confirmed by aPendingSideEffects
				if (oSideEffect && that.aPendingSideEffects.indexOf(sFieldGroupId) > -1) {
					// get the correct context to request this side effect
					oContextForSideEffects = _getContextForSideEffects(oSourceField, sSideEffectEntityType);
					if (!oContextForSideEffects) {
						// nothing to prepare
						return Promise.resolve();
					}
					sContextPath = oContextForSideEffects.getPath();
					aPathExpressions = aPathExpressions.concat(oSideEffect.TargetProperties || []).concat(oSideEffect.TargetEntities || []);
					// replace empty navigation property path with a property path *
					aPathExpressions = SideEffectsUtil.replaceEmptyNavigationPaths(aPathExpressions);
					// add additional text associations for the target properties
					aPathExpressions = SideEffectsUtil.addTextProperties(aPathExpressions, oMetaModel, sSideEffectEntityType);
					if (aPathExpressions.length) {
						// TODO: clarify trigger action Vs preparation action
						// if (oSideEffect.PreparationAction) {
						// 	// To keep the response to minimum, we add a $select
						// 	var sPropertyForSlimSelect = oMetaModel.getObject('/' + sEntityType + '/$Key')[0];
						// 	oContext.getModel().bindContext(oSideEffect.PreparationAction + '(...)', oContext, {'$select' : sPropertyForSlimSelect}).execute();
						// }

						// initialize queue of side effects waiting to be requested
						that._initSideEffectsQueue(sContextPath, oContextForSideEffects);

						// remove duplicates before adding to queue
						aQueuedPropertiesToRequest = that.sideEffectsRequestsQueue[sContextPath]["pathExpressions"]
							.filter(fnGetPropertyPath)
							.map(fnGetPropertyPath);
						aQueuedEntitiesToRequest = that.sideEffectsRequestsQueue[sContextPath]["pathExpressions"]
							.filter(fnGetNavigationPropertyPath)
							.map(fnGetNavigationPropertyPath);
						aPropertiesToRequest = aPathExpressions
							.map(fnGetPropertyPath)
							.filter(function(sPath) {
								return sPath && aQueuedPropertiesToRequest.indexOf(sPath) < 0;
							})
							.map(function(sPath) {
								return { "$PropertyPath": sPath };
							});
						aEntitiesToRequest = aPathExpressions
							.map(fnGetNavigationPropertyPath)
							.filter(function(sPath) {
								return (sPath || sPath === "") && aQueuedEntitiesToRequest.indexOf(sPath) < 0;
							})
							.map(function(sPath) {
								return { "$NavigationPropertyPath": sPath };
							});
						aPathExpressions = aPropertiesToRequest.concat(aEntitiesToRequest);
						// add to queue
						that.sideEffectsRequestsQueue[sContextPath]["pathExpressions"] = that.sideEffectsRequestsQueue[sContextPath][
							"pathExpressions"
						].concat(aPathExpressions);

						// dequeue from pending side effects to ensure no duplicate requests
						that.aPendingSideEffects.splice(that.aPendingSideEffects.indexOf(sFieldGroupId), 1);
					}
				}
				return Promise.resolve();
			},

			/**
			 * Request all side effects queued in this.sideEffectsRequestsQueue.
			 * Reset the queue.
			 * @function
			 * @name requestSideEffects
			 */
			requestSideEffects: function() {
				if (!this.sideEffectsRequestsQueue) {
					return;
				}
				var that = this,
					oSideEffectsRequestQueue = this.sideEffectsRequestsQueue,
					oSideEffectQueuePromise = this.oSideEffectQueuePromise || Promise.resolve();
				//reset the queue
				this.sideEffectsRequestsQueue = null;
				oSideEffectQueuePromise.then(function() {
					var mSideEffectInProgress = Object.keys(oSideEffectsRequestQueue).map(function(sPath) {
						var oSideEffectRequest = oSideEffectsRequestQueue[sPath];
						// log info for the request being attempted
						SideEffectsUtil.logRequest(oSideEffectRequest);
						return oSideEffectRequest["context"].requestSideEffects(oSideEffectRequest["pathExpressions"]).then(
							function() {
								// unlock fields affected by side effects
							},
							function() {
								// retry loading side effects or cancel
								Log.info(
									"FieldRuntime: Failed to request side effect - " + sPath,
									"sap.fe.macros.field.FieldRuntime",
									"requestSideEffects"
								);
								// add to failed side effects queue for next relevant retrial
								that.aFailedSideEffects[sPath] = oSideEffectRequest;
							}
						);
					});
					that.oSideEffectQueuePromise = Promise.all(mSideEffectInProgress);
				});
			},

			/**
			 * Request for additionalValue if required
			 * Since additionalValue is a one-way binding, we need to request it explicitly if the value is changed
			 * @function
			 * @name requestTextIfRequired
			 * @param {Object} oSourceField field changed
			 */
			requestTextIfRequired: function(oSourceField) {
				var oAdditionalValueBindingInfo = oSourceField.getBindingInfo("additionalValue");
				if (!oAdditionalValueBindingInfo) {
					return;
				}
				var aPropertyPaths = oAdditionalValueBindingInfo.parts.map(function(oPart) {
						return { "$PropertyPath": oPart.path };
					}),
					oContextForSideEffects = oSourceField.getBindingContext();
				if (aPropertyPaths.length) {
					oContextForSideEffects.requestSideEffects(aPropertyPaths).then(
						function() {
							// unlock busy fields
						},
						function() {
							// retry request or cancel
							Log.info(
								"FieldRuntime: Failed to request Text association - " +
									(aPropertyPaths[0] && aPropertyPaths[0]["$PropertyPath"]),
								"sap.fe.macros.field.FieldRuntime",
								"requestTextIfRequired"
							);
						}
					);
				}
			},

			/**
			 * Handler for change event.
			 * Store field group ids of this field for requesting side effects when required.
			 * We store them here to ensure a change in value of the field has taken place.
			 * @function
			 * @name handleChange
			 * @param {Object} oEvent event object passed by the change event
			 */
			handleChange: function(oEvent) {
				var that = this,
					oSourceField = oEvent.getSource(),
					bIsTransient = oSourceField && oSourceField.getBindingContext().isTransient(),
					pValueResolved = oEvent.getParameter("promise") || Promise.resolve(),
					pSideEffectsPrepared = pValueResolved,
					bAtLeastOneImmediate = false;
				if (oSourceField.getParent().isA("sap.ui.table.CreationRow")) {
					if (oEvent.getParameter("valid") === true && oSourceField.getParent().getApplyEnabled() === false) {
						oSourceField.getParent().setApplyEnabled(true);
					} else if (oEvent.getParameter("valid") === false && oSourceField.getParent().getApplyEnabled() === true) {
						oSourceField.getParent().setApplyEnabled(false);
					} else if (oEvent.getParameter("valid") === undefined && oSourceField.getParent().getApplyEnabled() === true) {
						var oCellsContent = oSourceField.getParent().getCells();
						var hasValidElement = function(element, index, array) {
							if (element.getValue !== null) {
								if (Array.isArray(element)) {
									if (
										element.some(function(elt) {
											return elt !== null && elt !== undefined;
										})
									) {
										return true;
									} else {
										return false;
									}
								} else {
									return element.getValue() !== null;
								}
							}
						};
						if (!oCellsContent.some(hasValidElement)) {
							oSourceField.getParent().setApplyEnabled(false);
						}
					}
				}

				// if the context is transient, it means the request would fail anyway as the record does not exist in reality
				// TODO: should the request be made in future if the context is transient?
				if (bIsTransient) {
					return;
				}
				// queue of side effects for current change
				this.aPendingSideEffects = this.aPendingSideEffects || [];
				// queue of resolved current set of changes (group of fields)
				this.mFieldGroupResolves = this.mFieldGroupResolves || {};
				// queue of failed side effects request (due to failing PATCH), that need to be retried on next relevant change
				this.aFailedSideEffects = this.aFailedSideEffects || {};

				// if there is a text association in the additional value of the field, it should be requested
				// after the value has been resovled
				// TODO: confirm if this is still needed as the mdc field would request for text anyway
				pValueResolved.then(function() {
					that.requestTextIfRequired(oSourceField);
				});

				if (oSourceField.getFieldGroupIds()) {
					oSourceField.getFieldGroupIds().forEach(function(sFieldGroupId) {
						var bImmediate = sFieldGroupId.indexOf("$$ImmediateRequest") > -1;
						// on change, only the side effects which are required immediately, are requested
						// store the promise for resolution of value so it can be used if the side effect is not required immediately
						if (bImmediate) {
							bAtLeastOneImmediate = true;
							sFieldGroupId = sFieldGroupId.substr(0, sFieldGroupId.indexOf("$$ImmediateRequest"));
						} else if (that.mFieldGroupResolves.hasOwnProperty(sFieldGroupId)) {
							that.mFieldGroupResolves[sFieldGroupId].push(pValueResolved);
						} else {
							that.mFieldGroupResolves[sFieldGroupId] = [pValueResolved];
						}
						// queue to pending side effects, it is not necessary that the side effect is requested immediately
						if (that.aPendingSideEffects.indexOf(sFieldGroupId) === -1) {
							that.aPendingSideEffects.push(sFieldGroupId);
						}

						// if not required immediately, request will be handled later when user focuses out of the virtual field group of source properties for this side effect
						if (bImmediate) {
							pSideEffectsPrepared = pSideEffectsPrepared.then(function() {
								// The side effect must be requested on the appropriate context
								return that.prepareForSideEffects(sFieldGroupId, oSourceField);
							});
						}
					});
					// if there is at least one side effect required immediately, request side effects
					if (bAtLeastOneImmediate) {
						pSideEffectsPrepared.then(this.requestSideEffects.bind(this));
					}
				}
			},

			/**
			 * Handler for validateFieldGroup event.
			 * Used to request side effects that are now required.
			 * Only side effects annotated on the root entity type will be requested.
			 * @function
			 * @name handleSideEffect
			 * @param {Object} oEvent event object passed by the validateFieldGroup event
			 */
			handleSideEffect: function(oEvent) {
				// If there are no pending side effects in records, there is nothing to do here
				if (!this.aPendingSideEffects || this.aPendingSideEffects.length === 0) {
					return;
				}
				var that = this,
					aFieldGroupIds = oEvent.getParameter("fieldGroupIds"),
					oSourceField = oEvent.getSource(),
					// promise to ensure side effects have been prepared before requesting
					pSideEffectsPrepared = Promise.resolve();

				aFieldGroupIds = aFieldGroupIds || [];

				aFieldGroupIds.forEach(function(sFieldGroupId) {
					var aFieldGroupResolves = [Promise.resolve()];
					if (that.mFieldGroupResolves && that.mFieldGroupResolves[sFieldGroupId]) {
						// Promise to ensure ALL involved fields' values have been resolved
						aFieldGroupResolves = that.mFieldGroupResolves[sFieldGroupId];
						// delete the stored promises for value resolution
						delete (that.mFieldGroupResolves && that.mFieldGroupResolves[sFieldGroupId]);
					}
					// TODO: Promise should be to ensure all value resolve promises are completed and at least one was resolved
					pSideEffectsPrepared = pSideEffectsPrepared.then(function() {
						// The side effect must be requested on the appropriate context
						return Promise.all(aFieldGroupResolves).then(that.prepareForSideEffects.bind(that, sFieldGroupId, oSourceField));
					});
				});
				pSideEffectsPrepared.then(this.requestSideEffects.bind(this));
			},

			/**
			 * Handler for patch events of list bindings (if field is in table) or context bindings (in form).
			 * This is only a fallback to request side effects (when PATCH failed previously) when some PATCH gets a success.
			 * Model would retry previously failed PATCHes and field needs to take care of requesting corresponding side effects.
			 * @function
			 * @name handlePatchEvents
			 * @param {Object} oBinding - OP controller may send a binding or a binding context, this is uncertain
			 */
			handlePatchEvents: function(oBinding) {
				if (!oBinding) {
					return;
				}
				var that = this;
				// oBinding could be binding or binding context, this correction should be in OP controller
				oBinding = (oBinding.getBinding && oBinding.getBinding()) || oBinding;
				oBinding.attachEvent("patchCompleted", function(oEvent) {
					if (oEvent.getParameter("success") !== false && that.aFailedSideEffects) {
						Object.keys(that.aFailedSideEffects).forEach(function(sContextPath) {
							// initialize if not already
							that._initSideEffectsQueue(sContextPath, that.aFailedSideEffects[sContextPath]["context"]);
						});
						// request the failed side effects now as there was a successful PATCH
						that.requestSideEffects();
					}
				});
			}
		};

		return FieldRuntime;
	},
	/* bExport= */ true
);
