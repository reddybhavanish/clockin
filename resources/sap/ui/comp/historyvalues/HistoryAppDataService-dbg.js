/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"sap/ui/base/Object",
	"./Constants",
	"./HistoryGlobalDataService"
], function(BaseObject, constants, HistoryGlobalDataService) {
	"use strict";

	/**
	 * Service to communicate with the application container for the history values.
	 *
	 * The application container is responsible to store the following information about the
	 * history values:
	 * - history for each field in the application
	 *
	 * Each application should instantiate the service from the beginning, because container
	 * ids for different applications is different. Each application has separate container
	 * and stores only its data. The container id is obtained from the global container
	 * by key. The key is the name of the application obtained from the manifest. The container ID
	 * is random unique 36 hash
	 *
	 * @private
	 * @author SAP SE
	 */
	var oInstance;
	var HistoryAppDataService = BaseObject.extend("sap.ui.comp.historyvalues.HistoryAppDataService", {
		constructor: function () {
			BaseObject.apply(this, arguments);

			this._initialize();
		}
	});

	HistoryAppDataService.prototype._initialize = function () {
		this._initializeAppContainerId = this._initializeAppContainerId.bind(this);
		this._initializeAppData = this._initializeAppData.bind(this);

		this._sContainerId = "";
		this._sItemId = constants.getHistoryPrefix() + "appData";
		this._oPersonalizer = null;
		this._sAppId = getAppId();
		this._oData = {};

		this._oDataReadyPromise = this._getHistoryGlobalDataService().getApps()
			.then(this._initializeAppContainerId)
			.then(this._initializeAppData);
	};

	HistoryAppDataService.prototype._getHistoryGlobalDataService = function () {
		return HistoryGlobalDataService.getInstance();
	};

	HistoryAppDataService.prototype._initializeAppContainerId = function (oAppContainerIds) {
		this._sContainerId = oAppContainerIds[this._sAppId];

		if (!this._sContainerId) {
			this._createAndSaveContainerId(oAppContainerIds);
		}

		return this._sContainerId;
	};

	HistoryAppDataService.prototype._initializeAppData = function () {
		return this._getPersonalizer().getPersData().then(function (oData) {
			this._oData = oData || this._getDefaultData();

			return this._oData;
		}.bind(this));
	};

	HistoryAppDataService.prototype._getPersonalizer = function () {
		if (this._oPersonalizer) {
			return this._oPersonalizer;
		}

		var oPersonalizationService = sap.ushell.Container.getService("Personalization"),
			oScope = {
				keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
				writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
				clientStorageAllowed: false,
				validity: Infinity
			},
			oPersId = {
				container: this._sContainerId,
				item: this._sItemId
			};

		this._oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope);

		return this._oPersonalizer;
	};

	HistoryAppDataService.prototype._createAndSaveContainerId = function (oAppContainerIds) {
		this._sContainerId = this._createContainerId();

		oAppContainerIds[this._sAppId] = this._sContainerId;

		this._getHistoryGlobalDataService().setApps(oAppContainerIds);
	};

	HistoryAppDataService.prototype._createContainerId = function () {
		var sUuid = "xxxxxxxx.xxxx.4xxx.yxxx.xxxxxxxxxxxx".replace(/[xy]/g, function (sPosition) {
			var iRandom = Math.random() * 16 | 0;

			if (sPosition === 'y') {
				iRandom = iRandom & 0x3 | 0x8;
			}

			return iRandom.toString(16);
		});

		return constants.getShortHistoryPrefix() + sUuid;
	};

	HistoryAppDataService.prototype._getDefaultData = function () {
		return {};
	};

	HistoryAppDataService.prototype._isDataReady = function () {
		// Ensure that the data is loaded before requesting it
		return this._oDataReadyPromise;
	};

	HistoryAppDataService.prototype._getHistoryEnabled = function () {
		return this._getHistoryGlobalDataService().getHistoryEnabled();
	};

	HistoryAppDataService.prototype.getFieldData = function (sFieldName) {
		return this._isDataReady()
			.then(this._getHistoryEnabled.bind(this))
			.then(function (bEnabled) {
				if (!bEnabled) {
					return [];
				}

				var aData = this._oData[sFieldName] || [];

				return aData.slice();
			}.bind(this));
	};

	HistoryAppDataService.prototype.setFieldData = function (sFieldName, aData) {
		return this._isDataReady()
			.then(this._getHistoryEnabled.bind(this))
			.then(function (bEnabled) {
				if (!bEnabled) {
					return false;
				}

				this._oData[sFieldName] = aData;

				return this._getPersonalizer().setPersData(this._oData);
			}.bind(this));
	};

	HistoryAppDataService.prototype.destroy = function () {
		BaseObject.prototype.destroy.apply(this, arguments);

		this._sContainerId = "";
		this._sItemId = "";
		this._oPersonalizer = null;
		this._sAppId = "";
		this._oData = {};
		this._oDataReadyPromise = null;
	};

	function getAppId() {
		var oAppLifeCycleService = sap.ushell.Container.getService("AppLifeCycle"),
			oCurrentApplication = oAppLifeCycleService.getCurrentApplication(),
			oComponent, oMetadata, oManifest, sId;

		if (oCurrentApplication) {
			oComponent = oCurrentApplication.componentInstance;
		}

		if (oComponent) {
			oMetadata = oComponent.getMetadata();
		}

		if (oMetadata) {
			oManifest = oMetadata.getManifest();
		}

		if (oManifest) {
			sId = oManifest["sap.app"].id;
		}

		return constants.getHistoryPrefix() + sId;
	}

	return {
		getInstance: function () {
			var sCurrentAppId = getAppId();

			if (!oInstance) {
				oInstance = new HistoryAppDataService();
			}

			if (oInstance._sAppId !== sCurrentAppId) {
				// If saved application id is different then the current application id
				// Then destroy the current service instance and create a new one
				// for the new application
				oInstance.destroy();
				oInstance = new HistoryAppDataService();
			}

			return oInstance;
		}
	};
});
