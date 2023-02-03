sap.ui.define(
	[
		"sap/base/util/ObjectPath",
		"sap/base/util/extend",
		"sap/base/Log",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/HashChanger",
		"sap/fe/core/CommonUtils"
	],
	function(ObjectPath, extend, Log, XMLTemplateProcessor, XMLPreprocessor, Fragment, JSONModel, HashChanger, CommonUtils) {
		"use strict";

		var ShareUtils = {};

		ShareUtils.onShareActionButtonPressImpl = function(oControl, oController, pageTitleInfo) {
			sap.ui.require(["sap/m/library"], function(library) {
				var oGetResourceBundle = oController
					.getView()
					.getModel("sap.fe.i18n")
					.getResourceBundle();
				var fragmentController = {
					shareEmailPressed: function() {
						var sEmailSubject;
						if (pageTitleInfo !== null) {
							sEmailSubject = pageTitleInfo.title;
							var sObjectSubtitle = pageTitleInfo.subtitle;
							if (sObjectSubtitle) {
								sEmailSubject = sEmailSubject + " - " + sObjectSubtitle;
							}
							library.URLHelper.triggerEmail(null, sEmailSubject, document.URL);
						} else {
							oGetResourceBundle.then(function(oBundle) {
								sEmailSubject = oBundle.getText("SAPFE_EMAIL_SUBJECT", [document.title]);
								library.URLHelper.triggerEmail(null, sEmailSubject, document.URL);
							});
						}
					},
					getModelData: function() {
						var oShareModel;
						if (pageTitleInfo !== null) {
							oShareModel = {
								title: pageTitleInfo.title,
								subtitle: pageTitleInfo.subtitle
							};
						} else {
							var oAppComponent = CommonUtils.getAppComponent(oController.getView());
							var oMetadata = oAppComponent.getMetadata();
							var oUIManifest = oMetadata.getManifestEntry("sap.ui");
							var sIcon = (oUIManifest && oUIManifest.icons && oUIManifest.icons.icon) || "";
							var oAppManifest = oMetadata.getManifestEntry("sap.app");
							var sTitle = (oAppManifest && oAppManifest.title) || "";
							oShareModel = {
								icon: sIcon,
								title: sTitle
							};
						}
						oShareModel.customUrl = ShareUtils.getCustomUrl();
						return oShareModel;
					}
				};
				ShareUtils.openSharePopup(oControl, oController, fragmentController);
			});
		};

		ShareUtils.setStaticShareData = function(shareModel) {
			var oResource = sap.ui.getCore().getLibraryResourceBundle("sap.m");
			shareModel.setProperty("/emailButtonText", oResource.getText("SEMANTIC_CONTROL_SEND_EMAIL"));
		};

		/**
		 * Instantiates and opens the ShareSheet fragment and merges its model data with the SaveAsTile data
		 * returned by the function getModelData of the fragment controller.
		 *
		 * @param {sap.ui.core.Control} by The control by which the popup is to be opened
		 * @param {object} fragmentController A plain object serving as the share popup's controller
		 * @returns {sap.ui.core.Control} The new instance of the ShareSheet fragment
		 * @protected
		 * @static
		 */
		ShareUtils.openSharePopup = function(by, oController, fragmentController) {
			var oShareActionSheet;
			fragmentController.onCancelPressed = function() {
				oShareActionSheet.close();
			};
			fragmentController.setShareSheet = function(oShareSheet) {
				oController.shareSheet = oShareSheet;
			};

			var oThis = new JSONModel({
					id: oController.getView().getId()
				}),
				oPreprocessorSettings = {
					bindingContexts: {
						"this": oThis.createBindingContext("/")
					},
					models: {
						"this": oThis,
						"this.i18n": oController.getView().getModel("sap.fe.i18n")
					}
				};

			var oModelData = fragmentController.getModelData();
			if (oController.shareSheet) {
				oShareActionSheet = oController.shareSheet;
				var oShareModel = oShareActionSheet.getModel("share");
				ShareUtils.setStaticShareData(oShareModel);
				var oNewData = extend(oShareModel.getData(), oModelData);
				oShareModel.setData(oNewData);
				oShareActionSheet.openBy(by);
			} else {
				var oView = oController.getView(),
					oBindingContext = oView.getBindingContext();
				var sFragmentName = "sap.fe.templates.controls.Share.ShareSheet",
					oPopoverFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment");

				Promise.resolve(XMLPreprocessor.process(oPopoverFragment, { name: sFragmentName }, oPreprocessorSettings))
					.then(function(oFragment) {
						return Fragment.load({ definition: oFragment, controller: fragmentController });
					})
					.then(function(oActionSheet) {
						oShareActionSheet = oActionSheet;
						oShareActionSheet.setModel(new JSONModel(oModelData), "share");
						var oShareModel = oShareActionSheet.getModel("share");
						ShareUtils.setStaticShareData(oShareModel);
						var oNewData = extend(oShareModel.getData(), oModelData);
						oShareModel.setData(oNewData);
						oView.addDependent(oShareActionSheet);
						oShareActionSheet.setBindingContext(oBindingContext);
						oShareActionSheet.openBy(by);
						fragmentController.setShareSheet(oShareActionSheet);
					});
			}
		};

		/**
		 * Get custom URL for creating a new tile.
		 *
		 * @returns {string} The custom URL
		 * @protected
		 * @static
		 */
		ShareUtils.getCustomUrl = function() {
			var sHash = HashChanger.getInstance().getHash();
			return sHash ? HashChanger.getInstance().hrefForAppSpecificHash("") + sHash : window.location.href;
		};

		return ShareUtils;
	}
);
