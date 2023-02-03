/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

// Provides static functions to call OData actions (bound/import) and functions (bound/import)
sap.ui.define(
	[
		"sap/m/MessageBox",
		"sap/m/Dialog",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/fe/core/actions/messageHandling",
		"sap/fe/core/BusyLocker",
		"sap/fe/core/helpers/SideEffectsUtil",
		"sap/fe/core/CommonUtils"
	],
	function(
		MessageBox,
		Dialog,
		JSONModel,
		XMLTemplateProcessor,
		XMLPreprocessor,
		Fragment,
		messageHandling,
		BusyLocker,
		SideEffectsUtil,
		CommonUtils
	) {
		"use strict";

		/**
		 * Calls a bound action for one or multiple contexts
		 * @function
		 * @static
		 * @name sap.fe.core.actions.operations.callBoundAction
		 * @memberof sap.fe.core.actions.operations
		 * @param {string} sActionName The name of the action to be called
		 * @param {sap.ui.model.odata.v4.Context} contexts Either one context or an array with contexts for which the action shall be called
		 * @param {map} [mParameters] Optional, can contain the following attributes:
		 * @param {map} [mParameters.actionParameters] a map of parameters to be sent for every action call
		 * @param {map} [mParameters.mBindingParameters] a map of binding parameters that would be part of $select and $expand coming from side effects for bound actions
		 * @param {array} [mParameters.additionalSideEffect] array of property paths to be requested in addition to actual target properties of the side effect
		 * @param {boolean} [mParameters.showActionParameterDialog] [false] if set and if parameters exist the user retrieves a dialog to fill in parameters, if actionParameters are passed they are shown to the user
		 * @param {string} [mParameters.label] a human-readable label for the action
		 * @param {string} [mParameters.invocationGrouping] [Isolated] mode how actions shall be called: Changeset to put all action calls into one changeset, Isolated to put them into separate changesets
		 * @param {function} [mParameters.onSubmitted] Function which is called once the actions are submitted with an array of promises
		 * @param {map} [mParameters.defaultParameters] can contain default parameters from FLP user defaults
		 * @param {sap.ui.core.Element} [mParameters.parentControl] if specified the dialogs are added as dependent of the parent control
		 * @returns {Promise} Promise resolves with an array of response objects (TODO: to be changed)
		 * @private
		 * @sap-restricted
		 */

		function callBoundAction(sActionName, contexts, oModel, mParameters) {
			if (!contexts || contexts.length === 0) {
				//In Freestyle apps bound actions can have no context
				return Promise.reject("Bound actions always requires at least one context");
			}
			mParameters = mParameters || {};
			// we expect either one context or an array of contexts
			if (Array.isArray(contexts)) {
				mParameters.bReturnAsArray = true;
			} else {
				//action needs to be called on this context from the dependent binding so UI fields are updated with response data
				contexts = [contexts];
			}
			var oMetaModel = oModel.getMetaModel(),
				sActionPath = oMetaModel.getMetaPath(contexts[0].getPath()) + "/" + sActionName,
				oBoundAction = oMetaModel.createBindingContext(sActionPath + "/@$ui5.overload/0");
			mParameters.aContexts = contexts;
			mParameters.isCriticalAction = getIsActionCritical(oMetaModel, sActionPath);
			return callAction(sActionName, oModel, oBoundAction, mParameters);
		}

		/**
		 * Calls an action import
		 * @function
		 * @static
		 * @name sap.fe.core.actions.operations.callActionImport
		 * @memberof sap.fe.core.actions.operations
		 * @param {string} sActionName The name of the action import to be called
		 * @param {sap.ui.model.odata.v4.ODataModel} oModel An instance of an OData v4 model
		 * @param {map} [mParameters] Optional, can contain the following attributes:
		 * @param {map} [mParameters.actionParameters] a map of parameters to be sent with the action import
		 * @param {string} [mParameters.label] a human-readable label for the action
		 * @param {boolean} [mParameters.showActionParameterDialog] [false] if set and if parameters exist the user retrieves a dialog to fill in parameters, if actionParameters are passed they are shown to the user
		 * @param {function} [mParameters.onSubmitted] Function which is called once the actions are submitted with an array of promises
		 * @param {map} [mParameters.defaultParameters] can contain default parameters from FLP user defaults
		 * @returns {Promise} Promise resolves with an array of response objects (TODO: to be changed)
		 * @private
		 * @sap-restricted
		 */
		function callActionImport(sActionName, oModel, mParameters) {
			if (!oModel) {
				return Promise.reject("Action expects a model/context for execution");
			}
			var oMetaModel = oModel.getMetaModel(),
				sActionPath = oModel.bindContext("/" + sActionName).getPath(),
				oActionImport = oMetaModel.createBindingContext(
					"/" + oMetaModel.createBindingContext(sActionPath).getObject("$Action") + "/0"
				);
			mParameters.isCriticalAction = getIsActionCritical(oMetaModel, sActionPath + "/@$ui5.overload");
			return callAction(sActionName, oModel, oActionImport, mParameters);
		}

		/*
		 Not yet implemented
		 function callBoundFunction(mParameters){
		 }

		 function callFunctionImport(mParameters){
		 }
		 */
		function callAction(sActionName, oModel, oAction, mParameters) {
			return new Promise(function(resolve, reject) {
				mParameters = mParameters || {};
				var aActionParameters = mParameters.actionParameters || [],
					mActionExecutionParameters = {},
					fnDialog,
					oActionPromise,
					sActionLabel = mParameters.label,
					bShowActionParameterDialog = mParameters.showActionParameterDialog,
					aContexts = mParameters.aContexts,
					bIsCreateAction = mParameters.bIsCreateAction,
					bIsCriticalAction = mParameters.isCriticalAction;
				if (!oAction) {
					reject("Action not found");
				}
				if (bShowActionParameterDialog || aActionParameters.length > 0) {
					aActionParameters = prepareActionParameters(oAction, aActionParameters);
					if (!aActionParameters || aActionParameters.length === 0) {
						bShowActionParameterDialog = false;
					}
				}
				if (bShowActionParameterDialog) {
					fnDialog = showActionParameterDialog;
				} else if (bIsCriticalAction) {
					fnDialog = confirmCriticalAction;
				}
				mActionExecutionParameters = {
					fnOnSubmitted: mParameters.onSubmitted,
					actionName: sActionName,
					model: oModel,
					aActionParameters: aActionParameters,
					ownerComponent: mParameters.ownerComponent
				};
				if (oAction.getObject("$IsBound")) {
					mActionExecutionParameters.aContexts = aContexts;
					mActionExecutionParameters.mBindingParameters = mParameters.mBindingParameters;
					// actual side effect target proeprties should be part of the mBindingParameters above
					// additional side effect is to request properties that are also required based on target properties of the side effect
					// such as text associations
					mActionExecutionParameters.additionalSideEffect = mParameters.additionalSideEffect;
					mActionExecutionParameters.bGrouped = mParameters.invocationGrouping === "ChangeSet";
					mActionExecutionParameters.bReturnAsArray = mParameters.bReturnAsArray;
					mActionExecutionParameters.localUIModel = mParameters.localUIModel;
					mActionExecutionParameters.prefix = mParameters.prefix;
					mActionExecutionParameters.operationAvailableMap = mParameters.operationAvailableMap;
				}
				if (bIsCreateAction) {
					mActionExecutionParameters.bIsCreateAction = bIsCreateAction;
				}
				if (fnDialog) {
					oActionPromise = fnDialog(
						sActionName,
						sActionLabel,
						mActionExecutionParameters,
						aActionParameters,
						oAction,
						mParameters.parentControl,
						mParameters.entitySetName
					);
				} else {
					oActionPromise = _executeAction(mActionExecutionParameters);
				}
				return oActionPromise
					.then(function(oOperationResult) {
						resolve(oOperationResult);
					})
					.catch(function(oOperationResult) {
						reject(oOperationResult);
					});
			});
		}

		function confirmCriticalAction(
			sActionName,
			sActionLabel,
			mParameters,
			aActionParameters,
			oActionContext,
			oParentControl,
			entitySetName
		) {
			return new Promise(function(resolve, reject) {
				var suffixResourceKey = sActionName && entitySetName ? entitySetName + "|" + sActionName : "";
				var oResourceBundle = oParentControl.getController().oResourceBundle;
				var sConfirmationText = CommonUtils.getTranslatedText("SAPFE_ACTION_CONFIRM", oResourceBundle, null, suffixResourceKey);

				MessageBox.confirm(sConfirmationText, {
					onClose: function(sAction) {
						if (sAction === MessageBox.Action.OK) {
							return _executeAction(mParameters)
								.then(function(oOperation) {
									resolve(oOperation);
								})
								.catch(function(oError) {
									messageHandling.showUnboundMessages().then(function() {
										reject(oError);
									});
								});
						} else {
							resolve();
						}
					}
				});
			});
		}

		function showActionParameterDialog(
			sActionName,
			sActionLabel,
			mParameters,
			aActionParameters,
			oActionContext,
			oParentControl,
			entitySetName
		) {
			var sPath = _getPath(oActionContext, sActionName),
				metaModel = oActionContext.getModel().oModel.getMetaModel(),
				entitySetContext = metaModel.createBindingContext(sPath),
				sActionNamePath = oActionContext.getObject("$IsBound")
					? oActionContext.getPath().split("/@$ui5.overload/0")[0]
					: oActionContext.getPath().split("/0")[0],
				actionNameContext = metaModel.createBindingContext(sActionNamePath),
				pValidationInProgress = Promise.resolve(),
				sFragmentName = "sap/fe/core/controls/ActionParameterDialog";
			return new Promise(function(resolve, reject) {
				var oFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment"),
					oParameterModel = new JSONModel({
						$displayMode: {}
					});

				return Promise.resolve(
					XMLPreprocessor.process(
						oFragment,
						{ name: sFragmentName },
						{
							bindingContexts: {
								action: oActionContext,
								actionName: actionNameContext,
								entitySet: entitySetContext
							},
							models: {
								action: oActionContext.getModel(),
								actionName: actionNameContext.getModel(),
								entitySet: entitySetContext.getModel()
							}
						}
					)
				).then(function(oFragment) {
					// TODO: move the dialog into the fragment and move the handlers to the oController
					return setUserDefaults(mParameters.ownerComponent, aActionParameters, oParameterModel).then(function() {
						// TODO: move the dialog into the fragment and move the handlers to the oController
						Fragment.load({ definition: oFragment }).then(function(oDialogContent) {
							var oOperationBinding;
							var oResourceBundle = oParentControl.getController().oResourceBundle;
							var oDialog = new Dialog({
								title:
									sActionLabel || CommonUtils.getTranslatedText("SAPFE_ACTION_PARAMETER_DIALOG_TITLE", oResourceBundle),
								content: [oDialogContent],
								escapeHandler: function(oPromise) {
									oDialog.close();
									messageHandling.removeUnboundTransitionMessages();
									reject();
								},
								beginButton: {
									text: sActionLabel || CommonUtils.getTranslatedText("SAPFE_OK", oResourceBundle),
									type: "Emphasized",
									press: function(oEvent) {
										BusyLocker.lock(oDialog);
										var oCreateButton = oEvent.getSource();
										oCreateButton.setEnabled(false);
										pValidationInProgress
											.then(function() {
												var bError,
													i,
													value,
													aFormElements = oDialogContent
														.getAggregation("form")
														.getAggregation("formContainers")[0]
														.getAggregation("formElements");
												var getRequiredProperties = function(aElements) {
													var mRequiredFields = {};
													for (i = 0; i < aElements.length; i++) {
														var oField = aElements[i].getFields()[0];
														if (oField.getProperty("required") && oField.mBindingInfos.value.binding) {
															mRequiredFields[oField.mBindingInfos.value.binding.getPath()] = {
																element: oField
															};
														}
													}
													return mRequiredFields;
												};
												var mRequiredProperties = getRequiredProperties(aFormElements);
												var sParameterBinding;
												var oParameterContext = oOperationBinding && oOperationBinding.getParameterContext();
												for (i = 0; i < aActionParameters.length; i++) {
													sParameterBinding = aActionParameters[i].$Name;
													value = oParameterContext.getProperty(sParameterBinding);
													if (!value && mRequiredProperties[sParameterBinding]) {
														bError = true;
														oDialog.fireValidationError({
															element: mRequiredProperties[sParameterBinding].element,
															property: "value",
															type: sap.ui.core.MessageType.Error,
															newValue: value,
															message: CommonUtils.getTranslatedText(
																"SAPFE_ACTION_PARAMETER_REQUIRED",
																oResourceBundle
															)
														});
														oCreateButton.setEnabled(true);
													}
												}
												if (!bError) {
													// TODO: due to using the search and value helps on the action dialog transient messages could appear
													// we need an UX design for those to show them to the user - for now remove them before continuing
													messageHandling.removeUnboundTransitionMessages();
													// move parameter values from Dialog (SimpleForm) to mParameters.actionParameters so that they are available in the operation bindings for all contexts
													var vParameterValue;
													for (var i in mParameters.aActionParameters) {
														vParameterValue = oParameterContext.getProperty(
															mParameters.aActionParameters[i].$Name
														);
														mParameters.aActionParameters[i].value = vParameterValue;
														vParameterValue = undefined;
													}
													return _executeAction(mParameters)
														.then(function(oOperation) {
															oDialog.close();
															resolve(oOperation);
														})
														.catch(function(oError) {
															oCreateButton.setEnabled(true);
															messageHandling.showUnboundMessages();
														});
												}
											})
											.finally(function() {
												BusyLocker.unlock(oDialog);
											});
									}
								},
								endButton: {
									text: CommonUtils.getTranslatedText("SAPFE_ACTION_PARAMETER_DIALOG_CANCEL", oResourceBundle),
									press: function() {
										oDialog.close();
										messageHandling.removeUnboundTransitionMessages();
										reject();
									}
								},
								afterClose: function() {
									oDialog.destroy();
								}
							});
							oDialog.setModel(oActionContext.getModel().oModel);
							oDialog.setModel(oParameterModel, "paramsModel");
							oDialog.bindElement({
								path: "/",
								model: "paramsModel"
							});
							var sActionPath = sActionName + "(...)";
							var aContexts = mParameters.aContexts || [];
							if (!aContexts.length) {
								sActionPath = "/" + sActionPath;
							}
							oDialog.bindElement({
								path: sActionPath
							});
							if (oParentControl) {
								// if there is a parent control specified add the dialog as dependent
								oParentControl.addDependent(oDialog);
							}
							if (aContexts.length > 0) {
								oDialog.setBindingContext(aContexts[0]); // use context of first selected line item
							}
							oOperationBinding = oDialog.getObjectBinding();
							var fnSetDefaultsAndOpenDialog = function(sBoundContextParameter) {
								var prefillParameter = function(sParamName, vParamDefaultValue) {
									var vParamValue;
									// Case 1: There is a ParameterDefaultValue annotation
									if (vParamDefaultValue) {
										if (aContexts.length > 0 && vParamDefaultValue.$Path) {
											// Case 1.1: ParameterDefaultValue points to a path (i.e. vParamDefaultValue = { $Path: 'somePath' })
											vParamValue = aContexts[0].getProperty(vParamDefaultValue.$Path);
											for (var i = 1; i < aContexts.length; i++) {
												if (aContexts[i].getProperty(vParamDefaultValue.$Path) !== vParamValue) {
													// if the values from the contexts are not all the same, do not prefill
													return;
												}
											}
										} else {
											// Case 1.2: ParameterDefaultValue defines a fixed string value (i.e. vParamDefaultValue = 'someString')
											vParamValue = vParamDefaultValue;
										}
									} else {
										// Case 2: There is no ParameterDefaultValue annotation (=> look into the FLP User Defaults)
										if (oParameterModel && oParameterModel.oData[sParamName]) {
											vParamValue = oParameterModel.oData[sParamName];
										}
									}
									if (vParamValue) {
										oOperationBinding.setParameter(sParamName, vParamValue);
									}
								};
								var getParameterDefaultValue = function(sParamName) {
									var oMetaModel = oDialog.getModel().getMetaModel(),
										sActionPath = oActionContext.sPath && oActionContext.sPath.split("/@")[0],
										sActionParameterAnnotationTarget = sActionPath + "/" + sParamName + "@",
										oParameterAnnotations = oMetaModel.getObject(sActionParameterAnnotationTarget),
										oParameterDefaultValue =
											oParameterAnnotations &&
											oParameterAnnotations["@com.sap.vocabularies.UI.v1.ParameterDefaultValue"]; // either { $Path: 'somePath' } or 'someString'
									if (
										sBoundContextParameter &&
										oParameterDefaultValue &&
										oParameterDefaultValue.$Path &&
										oParameterDefaultValue.$Path.startsWith(sBoundContextParameter + "/")
									) {
										// remove the action's binding parameter (usually '_it') from $Path so that $Path can be directly evaluated for a context (see prefillParameter)
										oParameterDefaultValue.$Path = oParameterDefaultValue.$Path.replace(
											sBoundContextParameter + "/",
											""
										);
									}
									return oParameterDefaultValue;
								};
								var sParamName, vParameterDefaultValue;
								for (var i in mParameters.aActionParameters) {
									sParamName = mParameters.aActionParameters[i].$Name;
									vParameterDefaultValue = getParameterDefaultValue(sParamName);
									prefillParameter(sParamName, vParameterDefaultValue);
								}
								oDialog.open();
							};
							if (oActionContext.getObject("$IsBound")) {
								var aParameters = oActionContext.getObject("$Parameter"),
									sBindingParameterName = aParameters[0] && aParameters[0].$Name;
							}
							// single-context bound action
							if (aContexts.length === 1) {
								// Temporary workaround to set the _it parameter (should be done by the CORE with FIORITECHP1-12704)
								// Currently needed for evaluating UI.Hidden/UI.ReadOnly and Common.ValueListParameterIn and limited to single select (one context)
								aContexts[0].requestObject().then(function(oContextObject) {
									if (oContextObject) {
										oOperationBinding.setParameter(sBindingParameterName, oContextObject);
									}
									fnSetDefaultsAndOpenDialog(sBindingParameterName);
								});
							} else {
								// multi-context bound action or unbound action
								fnSetDefaultsAndOpenDialog(sBindingParameterName);
							}
						});
					});
				});
			});
		}

		function prepareActionParameters(oAction, aPredefinedParameters) {
			// check if parameters exist at all
			var aParameters = getActionParameters(oAction);
			aPredefinedParameters = aPredefinedParameters || [];

			if (aPredefinedParameters.length > 0) {
				// TODO: merge the predefined once with the real existing one
			}

			return aParameters;
		}

		function getActionParameters(oAction) {
			var aParameters = oAction.getObject("$Parameter") || [];
			if (aParameters && aParameters.length) {
				if (oAction.getObject("$IsBound")) {
					//in case of bound actions, ignore the first parameter and consider the rest
					return aParameters.slice(1, aParameters.length) || [];
				}
			}
			return aParameters;
		}

		function getIsActionCritical(oMetaModel, sPath) {
			return !!oMetaModel.getObject(sPath + "@com.sap.vocabularies.Common.v1.IsActionCritical");
		}

		function _executeAction(mParameters) {
			var aContexts = mParameters.aContexts || [],
				oModel = mParameters.model,
				aActionParameters = mParameters.aActionParameters || [],
				sActionName = mParameters.actionName,
				fnOnSubmitted = mParameters.fnOnSubmitted,
				bIsCreateAction = mParameters.bIsCreateAction,
				bActionParametersExist = false,
				oAction;

			function fnDifferentiate(promise) {
				return promise.then(
					function(response) {
						return { response: response, status: "resolved" };
					},
					function(response) {
						return { response: response, status: "rejected" };
					}
				);
			}

			function setActionParameterDefaultValue() {
				if (aActionParameters && aActionParameters.length) {
					bActionParametersExist = true;
					for (var j = 0; j < aActionParameters.length; j++) {
						if (!aActionParameters[j].value) {
							switch (aActionParameters[j].$Type) {
								case "Edm.String":
									aActionParameters[j].value = "";
									break;
								case "Edm.Boolean":
									aActionParameters[j].value = false;
									break;
								case "Edm.Byte":
								case "Edm.Int16":
								case "Edm.Int32":
								case "Edm.Int64":
									aActionParameters[j].value = 0;
									break;
								// tbc
								default:
									break;
							}
						}
						oAction.setParameter(aActionParameters[j].$Name, aActionParameters[j].value);
					}
				}
			}

			if (aContexts.length) {
				return new Promise(function(resolve, reject) {
					var mBindingParameters = mParameters.mBindingParameters,
						bGrouped = mParameters.bGrouped,
						bReturnAsArray = mParameters.bReturnAsArray,
						aActionPromises = [],
						i,
						sGroupId,
						fnExecuteAction = function(oAction, index, oSideEffect) {
							setActionParameterDefaultValue();
							// TODO: workaround as long as the v4 model does not allow multiple changesets within one $batch
							sGroupId = !bGrouped ? "$auto." + index : oAction.getUpdateGroupId();
							aActionPromises.push(oAction.execute(sGroupId));
							// request side effects for this action
							if (oSideEffect && oSideEffect.pathExpressions) {
								// log info for the request being attempted
								SideEffectsUtil.logRequest(oSideEffect);
								oSideEffect.context.requestSideEffects(oSideEffect.pathExpressions, sGroupId).then(function() {
									if (mParameters.operationAvailableMap) {
										CommonUtils.setActionEnablement(
											mParameters.localUIModel,
											JSON.parse(mParameters.operationAvailableMap),
											"/$contexts/" + mParameters.prefix,
											mParameters.aContexts
										);
									}
								});
							}
						};

					for (i = 0; i < aContexts.length; i++) {
						oAction = oModel.bindContext(sActionName + "(...)", aContexts[i], mBindingParameters);
						fnExecuteAction(oAction, aContexts.length <= 1 ? null : i, {
							context: aContexts[i],
							pathExpressions: mParameters.additionalSideEffect
						});
					}

					// trigger onSubmitted "event"
					(fnOnSubmitted || jQuery.noop)(aActionPromises);

					Promise.all(aActionPromises.map(fnDifferentiate)).then(function(results) {
						var aRejectedItems = [],
							aResolvedItems = [],
							iResultCount;
						for (iResultCount = 0; iResultCount < results.length; iResultCount++) {
							if (results[iResultCount].status === "rejected") {
								aRejectedItems.push(results[iResultCount].response);
							}
							if (results[iResultCount].status === "resolved") {
								if (bIsCreateAction && bActionParametersExist) {
									//only used for NewAction
									results[iResultCount].bConsiderDocumentModified = true;
									aResolvedItems.push(results[iResultCount]);
								} else {
									aResolvedItems.push(results[iResultCount].response);
								}
							}
						}
						if (!results || (results && results.length === 0)) {
							reject(true);
						}
						if (aRejectedItems.length === 0) {
							if (bReturnAsArray) {
								resolve(aResolvedItems);
							} else {
								// context is given directly without an array so also no array is expected
								resolve(aResolvedItems[0]);
							}
						} else {
							reject({
								resolvedItems: aResolvedItems,
								rejectedItems: aRejectedItems
							});
						}
					});
				});
			} else {
				var oActionPromise;
				oAction = oModel.bindContext("/" + sActionName + "(...)");
				setActionParameterDefaultValue();
				oActionPromise = oAction.execute("actionImport");
				oModel.submitBatch("actionImport");
				// trigger onSubmitted "event"
				(fnOnSubmitted || jQuery.noop)(oActionPromise);
				return oActionPromise;
			}
		}

		/**
		 * sets the FLP user defaults to the parameter model
		 * @function
		 * @name sap.fe.core.actions.operations.setUserDefaults
		 * @memberof sap.fe.core.actions.operations
		 * @param {object} [oAppComponent] app's onwer component
		 * @param {array} [aActionParameters] action parameters
		 * @param {object} [oParameterModel] custom JSON model that holds value, valuestate, valuestatetext, displayMode of each action parameter (*temporary)
		 * @sap-restricted
		 * @final
		 **/
		//TODO - logic to fetch user defaults can be moved to a cental place
		function setUserDefaults(oAppComponent, aActionParameters, oParameterModel) {
			return new Promise(function(resolve, reject) {
				var oStartupParameters = oAppComponent.getComponentData().startupParameters,
					oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation") || {};
				if (!oCrossAppNav.getStartupAppState) {
					aActionParameters.map(function(oParameter) {
						if (oStartupParameters[oParameter.$Name]) {
							oParameterModel.setProperty(oParameter.$Name, oStartupParameters[oParameter.$Name][0]);
						}
					});
					return resolve(true);
				}
				return oCrossAppNav.getStartupAppState(oAppComponent).then(function(oStartupAppState) {
					var oData = oStartupAppState.getData() || {},
						aExtendedParameters = (oData.selectionVariant && oData.selectionVariant.SelectOptions) || [];
					aActionParameters.map(function(oParameter) {
						if (oStartupParameters[oParameter.$Name]) {
							oParameterModel.setProperty("/" + oParameter.$Name, oStartupParameters[oParameter.$Name][0]);
						} else if (aExtendedParameters.length > 0) {
							var range;
							aExtendedParameters.some(function(element) {
								if (element.PropertyName === oParameter.$Name) {
									range = element.Ranges;
									return true;
								}
							});
							if (range && range.length === 1 && range[0].Sign === "I" && range[0].Option === "EQ") {
								// consider only single values
								oParameterModel.setProperty("/" + oParameter.$Name, range[0].Low); // high is ignored when Option=EQ
							}
						}
					});
					return resolve(true);
				});
			});
		}

		function _getPath(oActionContext, sActionName) {
			var sPath = oActionContext.getPath();
			sPath = oActionContext.getObject("$IsBound") ? sPath.split("@$ui5.overload")[0] : sPath.split("/0")[0];
			return sPath.split("/" + sActionName)[0];
		}

		/**
		 * Static functions to call OData actions (bound/import) and functions (bound/import)
		 *
		 * @namespace
		 * @alias sap.fe.core.actions.operations
		 * @public
		 * @sap-restricted
		 * @experimental This module is only for experimental use! <br/><b>This is only a POC and maybe deleted</b>
		 * @since 1.56.0
		 */
		var operations = {
			callBoundAction: callBoundAction,
			callActionImport: callActionImport
			//callBoundFunction : callBoundAction,
			//callFunctionImport : callFunctionImport
		};
		return operations;
	}
);
