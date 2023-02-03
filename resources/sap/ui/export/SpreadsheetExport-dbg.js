/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

/**
 * Spreadsheet export utility
 * @private
 */
sap.ui.define(['jquery.sap.global', 'sap/base/Log', 'sap/ui/Device'], function(jQuery, Log, Device) {
	'use strict';
	/* global Blob, URL, Worker */

	var LIB_PROVIDER = 'sap/ui/export/provider/DataProviderBase',
		LIB_BUILDER = 'sap/ui/export/js/XLSXBuilder',
		LIB_JSZIP3 = 'sap/ui/export/js/libs/JSZip3';

	/**
	 * Utility class to perform spreadsheet export.
	 *
	 * @class Utility class to perform spreadsheet export
	 * @author SAP SE
	 * @version 1.78.0
	 * @static
	 *
	 * @private
	 * @since 1.50.0
	 */

	function doExport(mParams, fnCallback) {
		/*eslint new-cap: [0, { "capIsNewExceptions": ["URI","window.URI"] }]*/

		function postMessage(message) {
			return fnCallback && fnCallback(message);
		}
		function onprogress(iProgress, iFetched, iTotal) {
			postMessage({
				progress: iProgress,
				fetched: iFetched || 0,
				total: iTotal || 0
			});
		}

		function onerror(error) {
			postMessage({ error: error.message || error });
		}

		function onfinish(oArrayBuffer) {
			postMessage({ finish: true, data: oArrayBuffer });
		}

		// Export directly from an array in memory.
		// TBD: convert dates as in exportUtils
		function exportArray() {
			var oSpreadsheet;
			var fnConvertData;
			var timer;

			function start(DataProvider, XLSXBuilder) {
				fnConvertData = DataProvider.getDataConverter(mParams);
				oSpreadsheet =
					new XLSXBuilder(mParams.workbook.columns, mParams.workbook.context, mParams.workbook.hierarchyLevel, mParams.customconfig);
				onprogress( 0, 0, (mParams.dataSource.data || []).length);
				timer = window.setTimeout(processData,0);
			}

			function processData() {
				if (oSpreadsheet) {
					var aData = mParams.dataSource.data || [];
					var iCount = aData.length;
					var aRows = fnConvertData(aData.slice());
					oSpreadsheet.append(aRows);
					onprogress(100, iCount, iCount);
					timer = window.setTimeout(buildSpreadsheet, 0);
				}
			}

			function buildSpreadsheet() {
				if (oSpreadsheet) {
					oSpreadsheet.build().then(finish);
				}
			}

			function finish(arrayBuffer) {
				onfinish(arrayBuffer);
				oSpreadsheet = null;
			}

			function cancel() {
				window.clearTimeout(timer);
				finish();
			}

			// Load libraries and start export
			sap.ui.require([LIB_PROVIDER, LIB_BUILDER, LIB_JSZIP3], start);

			return {cancel: cancel};
		}

		// make URL absolute
		function normalizeUrl(url) {
			if (!url) {
				return url;
			}

			try {
				return new URL(url, document.baseURI).toString();
			} catch (error) {
				// Fallback solution if native URL class is not supported
				return window.URI(url).absoluteTo(document.baseURI).toString();
			}
		}

		function exportInProcess() {

			var oSpreadsheet, oRequest;

			function start(DataProvider, XLSXBuilder) {
				var provider = new DataProvider(mParams);

				oSpreadsheet =
					new XLSXBuilder(mParams.workbook.columns, mParams.workbook.context, mParams.workbook.hierarchyLevel, mParams.customconfig);
				oRequest = provider.requestData(processData);
				onprogress(0, 0, mParams.dataSource.count);
			}

			function processData(oMessage) {
				if (oMessage.rows) {
					oSpreadsheet.append(oMessage.rows);
				}
				if (oMessage.progress) {
					onprogress(oMessage.progress, oMessage.fetched, oMessage.total);
				}
				if (oMessage.error || typeof oMessage.error === 'string') {
					oSpreadsheet = null;
					return onerror(oMessage.error);
				}
				return oMessage.finished && oSpreadsheet.build().then(finish);
			}

			function finish(arrayBuffer) {
				onfinish(arrayBuffer);
				oSpreadsheet = null;
			}

			function cancel() {
				oRequest.cancel();
				onfinish();
				oSpreadsheet = null;
			}

			// Load libraries and start export
			sap.ui.require([LIB_PROVIDER, LIB_BUILDER, LIB_JSZIP3], start);

			return {cancel: cancel};
		}

		function exportInWorker() {
			var spreadsheetWorker;
			var params = jQuery.extend(true, {}, mParams);
			var workerParams = typeof params.worker === 'object' ?  params.worker : {};

			var fnCancel = function() {
				spreadsheetWorker.postMessage({ cancel: true });
				onfinish();
			};

			function createWorker(url) {
				var worker = new Worker(url);
				worker.onmessage = function (e) {
					if (e.data.progress) {
						onprogress(e.data.progress, e.data.fetched, e.data.total);
					} else if (e.data.error || typeof e.data.error === 'string') {
						onerror(e.data.error);
					} else {
						onfinish(e.data);
					}
				};

				worker.onerror = onerror;
				worker.postMessage(params);

				return worker;
			}

			function blobWorker() {
				Log.warning('Direct worker is not allowed. Load the worker via blob.');
				var baseUrl = window.URI(workerParams.base).absoluteTo("").search("").hash("").toString();
				workerParams.src = baseUrl + workerParams.ref;
				var blobCode = 'self.origin = "' + baseUrl + '"; ' + 'importScripts("' + workerParams.src + '")';
				var blob = new Blob([blobCode]);
				var blobUrl = window.URL.createObjectURL(blob);

				return createWorker(blobUrl);
			}

			function noWorker() {
				Log.warning('Blob worker is not allowed. Use in-process export.');
				fnCancel = exportInProcess(params).cancel;
			}

			function start() {
				try {
					spreadsheetWorker = createWorker(workerParams.src);
					spreadsheetWorker.addEventListener('error', function (e) { // Firefox fires an error event instead of a security exception
						spreadsheetWorker = blobWorker();
						spreadsheetWorker.addEventListener('error', function (e) {
							noWorker();
							e.preventDefault();
						});
						e.preventDefault();
					});
				} catch (err1) {
					try {
						spreadsheetWorker = blobWorker();
					} catch (err2) {
						noWorker();
					}
				}
			}

			// with workers, the download url must be absolute
			params.dataSource.dataUrl = normalizeUrl(params.dataSource.dataUrl);
			params.dataSource.serviceUrl = normalizeUrl(params.dataSource.serviceUrl);

			// worker settings
			workerParams.base = workerParams.base || sap.ui.require.toUrl('sap/ui/export/js/', '');
			workerParams.ref = workerParams.ref || 'SpreadsheetWorker.js';
			workerParams.src = workerParams.base + workerParams.ref;

			start();

			// fnCancel may be overwritten asynchronously after return, therefore it should be wrapped into a closure
			return {cancel: function() {fnCancel();}};
		}

		// Handle custom currencies
		var oCustomCurrencyConfig = sap.ui.getCore().getConfiguration().getFormatSettings().getCustomCurrencies();
		if (oCustomCurrencyConfig) {
			mParams.customconfig = mParams.customconfig || {};
			mParams.customconfig.currencySettings = {
				customCurrencies: oCustomCurrencyConfig
			};
		}

		if (mParams.dataSource.type === 'array') {
			return exportArray();
		} else if (mParams.worker === false || sap.ui.disableExportWorkers === true || (Device.browser.msie && mParams.dataSource.dataUrl.indexOf('.') === 0)) {
			// URI.js bug prevents relative paths starting with ./ or ../ from resolving, therefore worker is disabled for MSIE
			return exportInProcess();
		} else {
			return exportInWorker();
		}
	}

	return {execute: doExport};

}, /* bExport= */ true);
