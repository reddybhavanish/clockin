/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	'sap/ui/core/library',
	'sap/m/library',
	'./library',
	'sap/ui/core/Core',
	'sap/base/Log',
	'sap/base/util/uid',
	'sap/ui/core/Item',
	'sap/ui/core/syncStyleClass',
	'sap/ui/model/json/JSONModel',
	'sap/m/Button',
	'sap/m/CheckBox',
	'sap/m/Dialog',
	'sap/m/Input',
	'sap/m/Label',
	'sap/m/Select',
	'sap/m/Text',
	'sap/m/VBox',
	'sap/ui/VersionInfo'
], function(coreLibrary, mLibrary, library, Core, Log, uid, Item, syncStyleClass, JSONModel, Button, CheckBox, Dialog, Input, Label, Select, Text, VBox, VersionInfo) {
	'use strict';

	/*global Blob, MouseEvent, FileReader, URL */

	// Shortcuts
	var ButtonType = mLibrary.ButtonType;
	var ValueState = coreLibrary.ValueState;
	var FileType = library.FileType;
	var EdmType = library.EdmType;
	var uiVersion = null;

	/* Async call to resource bundle */
	var oResourceBundlePromise = Core.getLibraryResourceBundle('sap.ui.export', true);

	var CLASS_NAME = 'sap.ui.export.ExportUtils';

	/*
	 * Trigger loading of sap-ui-version.json during initialization,
	 * although it is not 100% ensured that the version is available
	 * when the variable is accessed, it is most likely the case.
	 */
	VersionInfo.load().then(function(oVersionInfo) {
		var aMatch = /[0-9]+\.[0-9]+\.[0-9]+/.exec(oVersionInfo.version);

		uiVersion = aMatch ? aMatch[0] : null;
	});

	/* Returns the Export Settings used by the User Settings Dialog */
	function getExportSettings(oCustomConfig, oResourceBundle) {
		var oDefaultConfig = {
			fileName: 'Standard',
			fileType: [
				{key: 'xlsx'}
			],
			selectedFileType: 'xlsx',
			splitCells: false,
			includeFilterSettings: false,
			addDateTime: false
		};

		var oExportConfig = Object.assign({}, oDefaultConfig, oCustomConfig || {});

		for (var i = 0; i < oExportConfig.fileType.length; i++) {
			var sSelectedKey;
			if (!oExportConfig.fileType[i].text) {
				oExportConfig.fileType[i].text = oResourceBundle.getText(oExportConfig.fileType[i].key.toUpperCase() + '_FILETYPE');
			}
			if (oExportConfig.fileType[i].key === oExportConfig.selectedFileType) {
				sSelectedKey = oExportConfig.fileType[i].key;
			}
		}
		if (!sSelectedKey) {
			oExportConfig.selectedFileType = oExportConfig.fileType[0].key;
		}

		return oExportConfig;
	}

	/**
	 * Utilities related to export to enable reuse in integration scenarios (e.g. tables).
	 *
	 * @author SAP SE
	 * @version 1.78.0
	 *
	 * @since 1.59
	 * @name sap.ui.export.ExportUtils
	 * @namespace
	 * @private
	 * @sap-restricted sap.ui.comp.smarttable.SmartTable
	 */
	var Utils = {

		_INTERCEPTSERVICE: 'sap/ushell/cloudServices/interceptor/InterceptService',

		/**
		 * Uses the Launchpad Cloud Service to intercept a given URL.
		 *
		 * @name sap.ui.export.ExportUtils.interceptUrl
		 * @function
		 *
		 * @param {string} sUrl The URL to intercept
		 * @return {string} The intercepted URL
		 *
		 * @private
		 * @static
		 */
		interceptUrl: function(sUrl) {
			// Check if cloud InterceptService exists (for destination routing) - See JIRA: FIORITECHP1-8941
			// This is necessary for cloud instances e.g. SAP CP, due to some destination routing that is not known by UI5 model/client!
			var InterceptService = sap.ui.require(Utils._INTERCEPTSERVICE);
			if (InterceptService) {
				var oInterceptService = InterceptService.getInstance();
				if (oInterceptService && oInterceptService.interceptUrl) {
					sUrl = oInterceptService.interceptUrl(sUrl);
				}
			}
			return sUrl;
		},

		/**
		 * Creates the Export settings dialog that can be used for configuring the spreadsheet before exporting.
		 *
		 * @param {Object} mCustomConfig Initial configuration of the settings dialog
		 * @param {sap.ui.core.Control} oOpener The opener of the dialog
		 * @param {function} [fnCallback] Handler function that is called once the dialog has been opened. A reference to the dialog is passed as parameter
		 *
		 * @returns {Promise} Promise which resolves with the export settings defined by the user
		 *
		 * @static
		 */
		getExportSettingsViaDialog: function(mCustomConfig, oOpener, fnCallback) {
			return new Promise(function (fnResolve, fnReject) {
				var oExportSettingsDialog;

				oResourceBundlePromise.then(function (oResourceBundle) {

					var oExportConfigModel = new JSONModel();
					oExportConfigModel.setData(getExportSettings(mCustomConfig, oResourceBundle));

					var sDialogId = uid();

					oExportSettingsDialog = new Dialog({
						id: sDialogId,
						title: oResourceBundle.getText('EXPORT_SETTINGS_TITLE'),
						horizontalScrolling: false,
						verticalScrolling: false,
						content: [
							//TBD: Maybe use a form here for ACC purposes
							new VBox({
								// changing the render type to Bare in order to render the colon by resuing the style classes from Form layout
								renderType: 'Bare',
								width: '100%',
								items: [
									//TBD: Hide controls (visible=false) when functionality is not yet implemented
									new Label({
										text: oResourceBundle.getText('FILE_NAME'),
										labelFor: sDialogId + '-fileName'
									}),
									new Input({
										id: sDialogId + '-fileName',
										value: '{/fileName}',
										liveChange: function (oEvent) {
											// user input validation for file name
											var oInput = oEvent.getSource();
											var sFileName = oEvent.getParameter('value');
											var oRegEx = /[\\/:|?"*<>]/;
											var oExportBtn = Core.byId(sDialogId + '-export');
											var bValidate = oRegEx.test(sFileName);
											if (bValidate) {
												oInput.setValueState(ValueState.Error);
												oInput.setValueStateText(oResourceBundle.getText('FILENAME_ERROR'));
											} else if (sFileName.length > 100) {
												oInput.setValueState(ValueState.Warning);
												oInput.setValueStateText(oResourceBundle.getText('FILENAME_WARNING'));
											} else {
												oInput.setValueState(ValueState.None);
												oInput.setValueStateText(null);
											}
											oExportBtn.setEnabled(!bValidate);
										}
									}).addStyleClass('sapUiTinyMarginBottom'),
									new Label({
										text: oResourceBundle.getText('SELECT_FORMAT'),
										labelFor: sDialogId + '-fileType',
										visible: false
									}),
									// sap.m.Select control disabled as there is only 1 option for now
									// control must be enabled when more file types are supported
									new Select({
										id: sDialogId + '-fileType',
										width: '100%',
										selectedKey: '{/selectedFileType}',
										visible: false,
										items: {
											path: '/fileType',
											template: new Item({key: '{key}', text: '{text}'})
										}
									}),
									new CheckBox({
										id: sDialogId + '-splitCells',
										selected: '{/splitCells}',
										text: oResourceBundle.getText('SPLIT_CELLS')
									}),
									new CheckBox({
										id: sDialogId + '-includeFilterSettings',
										selected: '{/includeFilterSettings}',
										text: oResourceBundle.getText('INCLUDE_FILTER_SETTINGS')
									}),
									new CheckBox({
										id: sDialogId + '-addDateTime',
										selected: '{/addDateTime}',
										text: oResourceBundle.getText('ADD_DATE_TIME'),
										visible: false
									})
								]
							// using the style class from Form layout to render colon after the label
							}).addStyleClass('sapUiExportSettingsLabel')
						],
						endButton: new Button({
							id: sDialogId + '-cancel',
							text: oResourceBundle.getText('CANCEL_BUTTON'),
							press: function () {
								oExportSettingsDialog.close();
							}
						}),
						beginButton: new Button({
							id: sDialogId + '-export',
							text: oResourceBundle.getText('EXPORT_BUTTON'),
							type: ButtonType.Emphasized,
							press: function () {
								if (oExportSettingsDialog) {
									oExportSettingsDialog._bSuccess = true;
									oExportSettingsDialog.close();
									fnResolve(oExportConfigModel.getData());
								}
							}
						}),
						afterClose: function () {
							if (!oExportSettingsDialog._bSuccess) {
								// Handle Cancel after close when export button was not pressed
								// because a close could also be triggered via Esc
								fnReject(null);
							}
							oExportSettingsDialog.destroy();
							oExportSettingsDialog = null;
						}
					});
					// using the style class from Form layout to render colon after the label
					oExportSettingsDialog.addStyleClass('sapUiContentPadding sapUiExportSettings');
					oExportSettingsDialog.setModel(oExportConfigModel);
					if (oOpener) {
						syncStyleClass('sapUiSizeCompact', oOpener, oExportSettingsDialog);
					}
					oExportSettingsDialog.open();

					if (fnCallback) {
						fnCallback(oExportSettingsDialog);
					}
				});
			});
		},

		/**
		 * Combines the filter operator with the value and
		 * creates a textual representation.
		 *
		 * @param oFilter {Object} A single filter object according to ListBinding#getFilterInfo
		 * @returns {string} Textual representation of the filter operation and value
		 * @private
		 */
		_getReadableFilterValue: function(oFilter) {
			switch (oFilter.op || oFilter.name) {
				case '==':
					return '=' + oFilter.right.value;
				case '>':
				case '<':
				case '!=':
				case '<=':
				case '>=':
					return oFilter.op + oFilter.right.value;
				case 'between':
					return oFilter.args[1].value + '...' + oFilter.args[2].value;
				case 'contains':
					return '*' + oFilter.args[1].value + '*';
				case 'endswith':
					return '*' + oFilter.args[1].value;
				case 'startswith':
					return oFilter.args[1].value + '*';
				default:
					throw Error('getReadableFilter');
			}
		},

		/**
		 * Parse filter tree recursively.
		 *
		 * @param oFilter {Object} Filter configuration according to ListBinding#getFilterInfo
		 * @returns {Array} Array of filter entries
		 * @private
		 */
		_parseFilter: function(oFilter) {
			switch (oFilter.type) {
				case 'Logical':
					return Utils._parseLogical(oFilter);
				case 'Binary':
					return Utils._parseBinary(oFilter);
				case 'Unary':
					return Utils._parseUnary(oFilter);
				case 'Call':
					return Utils._parseCall(oFilter);
				default:
					throw Error('Filter type ' + oFilter.type + ' not supported');
			}
		},

		/**
		 * Parses a logical filter and concatenates all
		 * subsequent filters.
		 *
		 * @param oLogicalFilter {Object} Filter object according to ListBinding#getFilterInfo
		 * @returns {Array} Array containing all filter settings
		 * @private
		 */
		_parseLogical: function(oLogicalFilter) {

			/* Breakout behavior for between filter */
			if (oLogicalFilter.op == '&&'
				&& oLogicalFilter.left.type === 'Binary'
				&& oLogicalFilter.right.type === 'Binary'
				&& oLogicalFilter.left.op === '>='
				&& oLogicalFilter.right.op === '<='
				&& oLogicalFilter.left.left.path === oLogicalFilter.right.left.path) {

				return Utils._parseCall({
					args: [
						{
							path: oLogicalFilter.left.left.path,
							type: 'Reference'
						},
						{
							type: 'Literal',
							value: oLogicalFilter.left.right.value
						},
						{
							type: 'Literal',
							value: oLogicalFilter.right.right.value
						}
					],
					name: 'between',
					type: 'Call'
				});
			}

			return Utils._parseFilter(oLogicalFilter.left).concat(Utils._parseFilter(oLogicalFilter.right));
		},

		/**
		 * Parses a binary filter and returns an Array that
		 * contains this explicit filter item.
		 *
		 * @param oBinaryFilter {Object} Filter object according to ListBinding#getFilterInfo
		 * @returns {Array} Array containing this explicit filter setting
		 * @private
		 */
		_parseBinary: function(oBinaryFilter) {
			if (!oBinaryFilter.left || oBinaryFilter.left.type != 'Reference'
				|| !oBinaryFilter.right || oBinaryFilter.right.type != 'Literal') {
				return [];
			}

			return [{
				key: oBinaryFilter.left.path,
				value: Utils._getReadableFilterValue(oBinaryFilter)
			}];
		},

		/**
		 * Parses an unary filter and returns a modified
		 * subsequent filter.
		 *
		 * @param oUnaryFilter {Object} Filter object according to ListBinding#getFilterInfo
		 * @returns {Array} Array containing the modified subsequent filter
		 * @private
		 */
		_parseUnary: function(oUnaryFilter) {
			var result;

			if (!oUnaryFilter.arg) {
				return [];
			}

			result = Utils._parseFilter(oUnaryFilter.arg);
			result[0].value = '!' + result[0].value;

			return result;
		},

		/**
		 * Parses an call filter and returns an Array containing
		 * this particular filter configuration.
		 *
		 * @param oCallFilter {Object} Filter object according to ListBinding#getFilterInfo
		 * @returns {Array} Array containing this explicit filter setting
		 * @private
		 */
		_parseCall: function(oCallFilter) {
			if (!oCallFilter.args || oCallFilter.args.length < 2) {
				return [];
			}

			return [{
				key: oCallFilter.args[0].path,
				value: Utils._getReadableFilterValue(oCallFilter)
			}];
		},

		/**
		 * Accepts a binding of type sap.ui.model.ListBinding or
		 * sap.ui.model.TreeBinding and extracts the filter
		 * configuration in a format that can be attached to
		 * a sap.ui.export.Spreadsheet instance.
		 *
		 * @param oBinding {sap.ui.model.ListBinding | sap.ui.model.TreeBinding}
		 * ListBinding or TreeBinding instance
		 *
		 * @param fnCallback {function}
		 * Callback function that is used to resolve the columns names according to their property.
		 *
		 * @returns {Promise}
		 * Promise, which resolves with an object containing a name
		 * property and items array with key value pairs which can be
		 * attached to the metainfo in the sap.ui.export.Spreadsheet
		 * configuration
		 *
		 * @sap-restricted sap.ui.comp.smarttable.SmartTable
		*/
		parseFilterConfiguration: function(oBinding, fnCallback) {
			return new Promise(function(fnResolve, fnReject) {
				oResourceBundlePromise.then(function(oResourceBundle) {
					var oFilterConfig, sLabel;

					oFilterConfig = {
						name: oResourceBundle.getText('FILTER_HEADER'),
						items: []
					};

					if (!oBinding || !(oBinding.isA('sap.ui.model.ListBinding') || oBinding.isA('sap.ui.model.TreeBinding'))) {
						Log.error('A ListBinding is required for parsing the filter settings');
						fnReject();
						return null;
					}

					var oFilterInfo = oBinding.getFilterInfo();
					if (oFilterInfo) {
						oFilterConfig.items = Utils._parseFilter(oFilterInfo);
					}

					/* Resolve column labels */
					if (typeof fnCallback === 'function') {
						oFilterConfig.items.forEach(function(item) {
							sLabel = fnCallback(item.key);

							item.key = sLabel && typeof sLabel === 'string' ? sLabel : item.key;
						});
					}

					fnResolve(oFilterConfig);
				});
			});
		},

		/**
		 * Queries the Fiori Launchpad service for available cloud
		 * export targets. If no cloud service is available or the
		 * the user has no cloud export subscription, the Promise
		 * returns an empty Array.
		 *
		 * @returns {Promise}
		 * Array of available targets
		 */
		getAvailableCloudExportTargets: function() {
			var servicePromise = Utils.getCloudExportService();

			return servicePromise.then(function(service) {
				return service && service.getSupportedTargets ? service.getSupportedTargets() : [];
			}).catch(function() {
				return [];
			});
		},

		/**
		 * Returns the cloud export service. The availability of the service is
		 * independent of a cloud export subscription. If no cloud export
		 * service is available, which is the case on an On-Premise system, the
		 * function returns null.
		 *
		 * @returns {Promise}
		 * Promise that returns the cloud export service once it is resolved
		 */
		getCloudExportService: function() {
			return sap.ushell
				&& sap.ushell.Container
				&& sap.ushell.Container.getServiceAsync
					? sap.ushell.Container.getServiceAsync('ProductivityIntegration') : Promise.reject();
		},

		/**
		 * This function saves the provided Blob to the local file system.
		 * The parameter name is optional and depending on the browser it
		 * is not ensured that the filename can be applied. Google Chrome,
		 * Mozilla Firefox, Internet Explorer and Microsoft Edge will
		 * apply the filename correctly.
		 *
		 * @param {Blob} oBlob - Binary large object of the file that should be saved to the filesystem
		 * @param {string} [sFilename] - Filename of the file including the file extension
		 */
		saveAsFile: function(oBlob, sFilename) {
			var link, downloadSupported, fnSave;

			/* Ignore other formats than Blob */
			if (!(oBlob instanceof Blob)) {
				return;
			}

			link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
			downloadSupported = 'download' in link;

			/* Try ObjectURL Chrome, Firefox, Opera, Android, Safari (Desktop ab 10.1) */
			if (downloadSupported) {
				fnSave = function(data, fileName) {
					link.download = fileName;
					link.href = URL.createObjectURL(data);
					link.dispatchEvent(new MouseEvent('click'));
				};
			}

			/* In case of iOS Safari, MacOS Safari */
			if (typeof fnSave === 'undefined') {
				fnSave = function(data) {
					var reader = new FileReader();

					reader.onloadend = function() {
						var opened, url;

						url = reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
						opened = window.open(url, '_blank');

						if (!opened) {
							window.location.href = url;
						}
					};
					reader.readAsDataURL(data);
				};
			}

			/*
			 * IE/Edge implementation
			 *
			 * Microsoft Edge also supports the download attribute but ignores the value of the attribute.
			 * This is why we override it with the navigator.msSaveOrOpenBlob function in case of MS Edge.
			 */
			if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
				fnSave = function(data, fileName) {
					window.navigator.msSaveOrOpenBlob(data, fileName);
				};
			}

			/* Save file to device */
			fnSave(oBlob, sFilename);
		},

		/**
		 * Validates the export configuration and logs information, warnings and errors. A severe misconfiguration
		 * can lead to throwing an <code>Error</code>. Missing or incorrect information might get adjusted by either
		 * default values or by truncating the original value.
		 *
		 * @param {Object} mSettings Export settings that will be validated
		 * @param {number} mSettings.count Expected amount of data that will be available on the service
		 * @param {Object} mSettings.dataSource DataSource configuration that will be used to fetch the data
		 * @param {string} mSettings.fileName Name of the exported file
		 * @param {string} mSettings.fileType Member of sap.ui.export.FileType
		 * @param {boolean} mSettings.showProgress Controls whether the progress dialog will be shown during export or not
		 * @param {Object} mSettings.workbook Export settings that are relevant for the file structure
		 * @param {boolean} mSettings.worker Controls whether the export will be run in a dedicated Web Worker or not
		 *
		 * @since 1.78
		 */
		validateSettings: function(mSettings) {
			var sExtension;

			/* Validate dataSource */
			Utils._validateDataSource(mSettings.dataSource);

			/* Validate fileName and fileType */
			mSettings.fileType = FileType[mSettings.fileType] ? mSettings.fileType : FileType.XLSX;
			sExtension = '.' + mSettings.fileType.toLowerCase();
			mSettings.fileName = mSettings.fileName || 'export' + sExtension;

			if (!mSettings.fileName.endsWith(sExtension)) {
				mSettings.fileName += sExtension;
				Log.warning(CLASS_NAME + ': fileName was missing the proper file extension - extension has been added');
			}

			/* Validate showProgress */
			if (typeof mSettings.showProgress !== 'boolean') {
				mSettings.showProgress = true; // Default value
			}

			/* Validate workbook */
			Utils._validateWorkbook(mSettings.workbook);

			/* Validate worker */
			if (typeof mSettings.worker !== 'boolean') {
				mSettings.worker = true; // Default value
			}
		},

		/**
		 * Validates the datasource configuration.
		 *
		 * @param {Object} mDataSource DataSource configuration that will be used to fetch the data
		 * @param {number|null} mDataSource.count Amount of data that will be requested from the service
		 * @param {Array} [mDataSource.data] Array of data that will be exported
		 * @param {string} [mDataSource.dataUrl] URL that is used to request the data from the backend
		 * @param {string} [mDataSource.headers] Associative Array containing HTTP headers that are used for $batch requests
		 * @param {string} [mDataSource.serviceUrl] URL of the service used for $batch requests
		 * @param {number} [mDataSource.sizeLimit] Amount of entries that are fetched with a single request
		 * @param {string} mDataSource.type Defines the type of export i.E. 'odata' or 'array'
		 * @param {boolean} [mDataSource.useBatch] Controls whether the OData export uses $batch requests or not
		 *
		 * @since 1.78
		 * @private
		 */
		_validateDataSource: function(mDataSource) {
			var iSizeLimit;

			if (!mDataSource || typeof mDataSource !== 'object') {
				throw new Error(CLASS_NAME + ': dataSource has not been specified');
			}

			mDataSource.type = mDataSource.type || 'odata';

			if (mDataSource.type === 'array' && !Array.isArray(mDataSource.data)) {
				Log.warning(CLASS_NAME + ': Defined type does not match the provided data');
			}

			if (mDataSource.type === 'odata' && (typeof mDataSource.dataUrl !== 'string' || mDataSource.dataUrl.length === 0)) {
				throw new Error(CLASS_NAME + ': Unable to export data. No dataUrl provided.');
			}

			if (typeof mDataSource.useBatch !== 'boolean') {
				mDataSource.useBatch = false; // Default value
				Log.info(CLASS_NAME + ': Parameter useBatch not provided. Applying default value "false"');
			} else if (mDataSource.useBatch === true) {

				if (typeof mDataSource.serviceUrl !== 'string' || mDataSource.serviceUrl.length === 0) {
					mDataSource.useBatch = false;
					Log.warning(CLASS_NAME + ': serviceUrl is required for OData batch requests');
				}

				if (typeof mDataSource.serviceUrl !== 'object') {
					mDataSource.useBatch = false;
					Log.warning(CLASS_NAME + ': headers is required for OData batch requests.');
				}
			}

			iSizeLimit = mDataSource.sizeLimit;
			if (!iSizeLimit || isNaN(iSizeLimit)) {
				var iMaxSize = 5000,
					iMinSize = 200;

				// Try to load data in 5 steps, but each step should be at least 200 rows
				iSizeLimit = mDataSource.count ? Math.round(mDataSource.count / (iMinSize * 5)) * iMinSize : iMinSize;
				iSizeLimit = Math.min(iMaxSize, Math.max(iSizeLimit, iMinSize));
				mDataSource.sizeLimit = iSizeLimit;

				Log.info(CLASS_NAME + ': Parameter sizeLimit not provided. sizeLimit is set to ' + iSizeLimit);
			}
		},

		/**
		 * Validates the workbook configuration that contains information about the columns,
		 * the hierarchyLevel and meta information.
		 *
		 * @param {Object} mWorkbook Configuration of the Spreadsheet workbook
		 * @param {Array} mWorkbook.columns Column definition of the worksheet
		 * @param {Object} mWorkbook.context Meta information that is written to the generated file
		 * @param {string} mWorkbook.hierarchyLevel Name of the property that contains the hierarchy level information
		 *
		 * @since 1.78
		 * @private
		 */
		_validateWorkbook: function(mWorkbook) {
			if (!(mWorkbook instanceof Object)  || !Array.isArray(mWorkbook.columns)) {
				throw new Error(CLASS_NAME + 'column configuration is not provided. Export is not possible');
			}

			/* Eliminate incorrect column definitions */
			mWorkbook.columns = mWorkbook.columns.filter(function(oColumn, iIndex, aArray) {
				var iWidth;

				if (!(oColumn instanceof Object)) {
					Log.error(CLASS_NAME + ': Column ' + iIndex + ' skipped due to invalid configuration');
					return false;
				}

				/* *** Validation of general properties *** */

				if (typeof oColumn.property !== 'string' && !Array.isArray(oColumn.property)) {
					Log.error(CLASS_NAME + ': Column ' + iIndex + ' skipped due to missing mandatory property');
					return false;
				}

				/* Use property name if label is not defined */
				oColumn.label = oColumn.label || (oColumn.property instanceof Array ? oColumn.property[0] : oColumn.property);

				/* Column width calculation */
				iWidth = oColumn.width;

				if (typeof iWidth === 'string') {
					var sWidth;

					sWidth = iWidth.toLowerCase();
					iWidth = parseFloat(sWidth);

					if (sWidth.indexOf('em') > 0) {
						iWidth = iWidth * 2;
					} else if (sWidth.indexOf('px') > 0) {
						iWidth = iWidth / 8;
					}
				}

				if (isNaN(iWidth) || iWidth < 1) {
					iWidth = 10;
				}

				oColumn.width = Math.round(iWidth);

				/* Type validation */
				if (typeof oColumn.type === 'string') {

					if (!EdmType[oColumn.type]) {
						Log.warning(CLASS_NAME + ': Unsupported column type ' + oColumn.type + ' on column ' + iIndex + '. Default type "String" is applied.');
						oColumn.type = EdmType.String;

					} else if (oColumn.type === EdmType.Currency && !oColumn.unitProperty) {
						Log.warning(CLASS_NAME + ': Missing unitProperty for type Currency on column ' + iIndex + '. Type is reverted to "String".');
						oColumn.type = EdmType.String;

					} else if (oColumn.type === EdmType.Enumeration && (!oColumn.valueMap || typeof oColumn.valueMap !== 'object')) {
						Log.warning(CLASS_NAME + ': Invalid valueMap for type Enumeration on column ' + iIndex + '. Type is reverted to "String".');
						oColumn.type = EdmType.String;
					}
				}

				/* TextAlign validation */
				Utils._validateString(oColumn, 'textAlign');

				if (oColumn.textAlign) {
					var textAlign = (oColumn.textAlign + '').toLowerCase();

					/* Map the values begin & end according to RTL */
					if (['begin', 'end'].indexOf(textAlign) > -1) {
						var mappedAlignment = ['left', 'right'];

						textAlign = (Core.getConfiguration().getRTL() ? mappedAlignment.reverse() : mappedAlignment)[['begin', 'end'].indexOf(textAlign)];
					}

					if (textAlign !== '' && ['left','right','center'].indexOf(textAlign) == -1) {
						Log.warning(CLASS_NAME + ': Incorrect column alignment value ' + textAlign + ' on column ' + iIndex + '. Default alignment is used.');
						textAlign = '';
					}
					oColumn.textAlign = textAlign;
				}

				/* *** Validation of type specific properties *** */

				/* Validate boolean based properties (not column type Boolean related) */
				['delimiter', 'displayUnit', 'wrap'].forEach(function(sProperty) {
					Utils._validateProperty(oColumn, sProperty, 'boolean');
				});

				/* Validate string based properties (not column type String related) */
				['inputFormat', 'unit', 'unitProperty', 'template', 'trueValue', 'falseValue'].forEach(function(sProperty) {
					Utils._validateString(oColumn, sProperty);
				});

				/* Validate trueValue & falseValue properties */
				if (oColumn.type === EdmType.Boolean && (oColumn.trueValue === null || oColumn.falseValue === null)) {
					Log.warning(CLASS_NAME + ': The properties trueValue and falseValue have to be assigned correctly on column ' + iIndex + '. Values will be discarded.');
					oColumn.trueValue = null;
					oColumn.falseValue = null;
				}

				/* Validate scale property */
				var scale = oColumn.scale;
				if (oColumn.type === 'number' && isNaN(scale) && scale !== 'variable') {
					Log.warning(CLASS_NAME + 'scale parameter for numerical column configuration is missing.');
				}
				if (typeof scale === 'string') {
					scale = parseInt(scale);
				}
				if (isNaN(scale)) {
					scale = null;
				}
				oColumn.scale = scale;

				/* Validate valueMap property */
				if (oColumn.valueMap && typeof oColumn.valueMap !== 'object') {
					/* Once the valueMap property is invalid, the column type is anyway reverted to EdmType.String */
					Log.warning(CLASS_NAME + ': Invalid value for property "valueMap" on column ' + iIndex + '. Value will be discarded.');
					oColumn.valueMap = null;
				}

				return true; // Important for the Array#filter call
			});

			Utils._validateWorkbookContext(mWorkbook.context);
			Utils._validateString(mWorkbook, 'hierarchyLevel');
		},

		/**
		 * Validates the context object on the workbook definition.
		 *
		 * @param {Object} oContext Context object
		 * @param {string} [oContext.application] Name of the application (default: "SAP UI5")
		 * @param {string} [oContext.version] Application version (default: "1.78.0")
		 * @param {string} [oContext.title] Title that will be written to the file (NOT the filename)
		 * @param {string} [oContext.modifiedBy] Optional user context that will be written to the file
		 * @param {string} [oContext.sheetName] Name of the data sheet - Maximum length of 31 characters
		 * @param {string} [oContext.metaSheetName] Name of the optional metainfo sheet - Maximum length of 31 characters
		 * @param {Array} [oContext.metainfo] Array of objects that represent a group in the additional metainfo sheet
		 *
		 * @since 1.78
		 * @private
		 */
		_validateWorkbookContext: function(oContext) {
			if (!(oContext instanceof Object)) {
				return;
			}

			Utils._validateString(oContext, 'application', 'SAP UI5');
			Utils._validateString(oContext, 'version', uiVersion); // Async initialization - might be null
			Utils._validateString(oContext, 'title');
			Utils._validateString(oContext, 'modifiedBy');
			Utils._validateString(oContext, 'sheetName', 'SAPUI5 Spreadsheet Export', 31);
			Utils._validateString(oContext, 'metaSheetName', 'Metadata', 31);

			if (oContext.metainfo) {
				if (!Array.isArray(oContext.metainfo)) {
					Log.warning(CLASS_NAME + ': Invalid value for property "metainfo". Value will be discarded.');
					oContext.metainfo = null;
				} else {
					oContext.metainfo.filter(function(oGroup, iIndex) {
						if (typeof oGroup.name !== 'string' || oGroup.name.length === 0) {
							Log.warning(CLASS_NAME + ': Invalid name for metainfo group at index ' + iIndex + '. Entry will be discarded.');
							return false;
						}
						return true;
					});
				}
			}
		},

		/**
		 * The function validates a property on the context to be of type 'string' if defined.
		 * It can apply additional restrictions if defined. Once the property value does not meet the criteria,
		 * the value will be adjusted or discarded and the function writes an entry to the Log. If the property value
		 * exceeds the maximum allowed length, it will be truncated.
		 *
		 * @param oContext Context on which the property is defined
		 * @param sProperty Name of the property
		 * @param sDefaultValue Default value that gets applied in case of an invalid value - null if not defined
		 * @param iMaxLength Maximum allowed length.
		 *
		 * @private
		 * @since 1.78
		 */
		_validateString: function(oContext, sProperty, sDefaultValue, iMaxLength) {
			var sValue;

			Utils._validateProperty(oContext, sProperty, 'string', sDefaultValue);

			sValue = oContext[sProperty];

			if (typeof sValue === 'string' && iMaxLength && sValue.length > iMaxLength) {
				Log.warning(CLASS_NAME + ': The value of ' + sProperty + ' exceeds the max length of ' + iMaxLength + ' and will be truncated.');
				sValue = sValue.slice(0, iMaxLength);
			}

			oContext[sProperty] = sValue;
		},

		/**
		 * The function validates a property on the context to be of type  if defined.
		 * Once the property value does not meet the criteria, the value will be discarded and
		 * the function writes an entry to the Log.
		 *
		 * @param {Object} oContext Context on which the property is defined
		 * @param {string} sProperty Name of the property
		 * @param {string} sType Expected type of the property
		 * @param {Any} [defaultValue] Default value that gets applied if the initial value is invalid
		 *
		 * @since 1.78
		 * @private
		 */
		_validateProperty: function(oContext, sProperty, sType, defaultValue) {
			var value = oContext[sProperty];

			if (value != null && typeof value !== sType) {
				Log.warning(CLASS_NAME + ': Invalid value for property "' + sProperty + '. Value will be discarded.');
				value = null;
			}

			oContext[sProperty] = value == null && defaultValue ? defaultValue : value;
		}
	};

	return Utils;

}, /* bExport= */ true);
