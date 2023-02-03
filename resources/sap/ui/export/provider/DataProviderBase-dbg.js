/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

(function(fClass) {
	'use strict';

	if (typeof sap !== "undefined" && typeof sap.ui.define === 'function') {
		sap.ui.define([], fClass, /* bExport */ true);
	} else {
		var oContext;

		if (typeof window !== "undefined") {
			oContext = window;
		} else if (typeof self !== "undefined") {
			oContext = self;
		} else {
			oContext = this;
		}
		oContext.DataProviderBase = fClass();
	}
})(function() {
	'use strict';
	/* global URI, XMLHttpRequest */

	/**
	 *	Default DataProviderBase implementation that is capable to handle
	 *	OData V2 as well as OData V4.
	 *
	 * @param mSettings
	 * @constructor
	 * @class DataProviderBase
	 * @since 1.77
	 */
	var DataProviderBase = function(mSettings) {

		this.mSettings = mSettings;
		this.bCanceled = false;
		this.iAvailableRows = 0;
		this.mRequest = null;

		this.iTotalRows = Math.min(mSettings.dataSource.count || DataProviderBase.MAX_ROWS, DataProviderBase.MAX_ROWS);
		this.iBatchSize = Math.min(mSettings.dataSource.sizeLimit || DataProviderBase.MAX_ROWS, this.iTotalRows);

		this._prepareDataUrl();
	};

	DataProviderBase.MAX_ROWS = 1048575; // Spreadsheet limit minus 1 for the header row: 1,048,575
	DataProviderBase.HTTP_ERROR_MSG = 'HTTP connection error';
	DataProviderBase.HTTP_WRONG_RESPONSE_MSG = 'Unexpected server response:\n';

	/**
	 * Creates a pseudo random GUID. This algorithm is not suitable for
	 * cryptographic purposes and should not be used therefore.
	 *
	 * @returns {string} - Generated GUID
	 */
	DataProviderBase._createGuid = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, // Bitwise OR is equivalent to Math.floor() but faster
				v = c === 'x' ? r : ((r & 0x3) | 0x8); // In case of c != 'x', the value is always between 0x8 and 0xB

			return v.toString(16);
		});
	};

	/**
	 * The function returns array of columns that need special conversion for values.
	 * E.g. handling data from association/navigationProperty
	 *
	 * @param {Object} mSettings - Configuration object
	 * @returns {Array} - Collection of columns that need special conversion for their values
	 * @private
	 */
	DataProviderBase.getColumnsToConvert = function(mSettings) {
		return mSettings.workbook.columns.reduce(function(result, col) {
			var properties;

			// Handle aggregated properties and single properties
			properties = col.property instanceof Array ? col.property : [col.property];
			// Handle unitProperty which too could be from an association
			if (col.unitProperty) {
				properties.push(col.unitProperty);
			}

			properties.forEach(function(property) {

				// Convert navigation property and date fields
				var aKeys = property.split('/');

				if (aKeys.length > 1) {
					result.push({
						property: property,
						keys: aKeys,
						type: col.type
					});
				}
			});

			return result;
		}, []);
	};

	/**
	 * The function returns a conversion function for raw data.
	 *
	 * @param mSettings Export settings that are used to create the the converter function
	 * @returns {function} Conversion function
	 *
	 * @public
	 */
	DataProviderBase.getDataConverter = function(mSettings) {
		var aColumns = this.getColumnsToConvert(mSettings);

		return function(aRows) {
			return DataProviderBase._convertData(aRows, aColumns);
		};
	};

	/**
	 * Function to process the JSON result array from a ODataService.
	 *
	 * @param {Array} aRows - Data array that contains the received data
	 * @param {Array} aCols - Columns that need to be converted
	 * @returns {Array} - An array of rows
	 *
	 * @private
	 */
	DataProviderBase._convertData = function(aRows, aCols) {
		aCols.forEach(function(col) {
			aRows.forEach(function(row) {
				row[col.property] = DataProviderBase._getValue(row, col);
			});
		});

		return aRows;
	};

	/**
	 * Gets converted property value from raw data.
	 * Navigation properties are parsed.
	 *
	 * @param {Object} oRow - Raw data row
	 * @param {Object} oCol - Column information
	 * @param {Array} oCol.keys - Property name or key path for navigation properties
	 * @returns {number|string|boolean} - The converted property value
	 *
	 * @private
	 */
	DataProviderBase._getValue = function(oRow, oCol) {

		// Get property value
		var value = oCol.keys.reduce(function(obj, key) {
			return obj && obj[key];
		}, oRow);

		return value;
	};

	/**
	 * The function requests several chunks of data until the maximum
	 * amount of data is fetched.
	 *
	 * @param {function} fnProcessCallback - Callback function that is triggered when data is received
	 * @returns {Object} - Object reference that allows to cancel the current processing
	 *
	 * @public
	 */
	DataProviderBase.prototype.requestData = function(fnProcessCallback) {
		var mDataSource = this.mSettings.dataSource;

		this.fnConvertData = DataProviderBase.getDataConverter(this.mSettings);
		this.fnProcessCallback = fnProcessCallback;

		// Execution
		this.mRequest = {
			serviceUrl: this._cleanUrl(mDataSource.serviceUrl),
			dataUrl: this._getUrl(0, this.iBatchSize),
			method: mDataSource.useBatch ? 'BATCH' : 'GET',
			headers: mDataSource.headers
		};

		this.sendRequest(this.mRequest)
			.then(this.fnOnDataReceived.bind(this))
			.catch(this.fnOnError.bind(this));

		return { cancel: function() { this.bCanceled = true; }.bind(this) };
	};

	/**
	 * Inner function that processes the received data. Processing
	 * the data before executing the callback function allows to
	 * apply transformations to the data.
	 *
	 * @param {Object} oResult - The result object that is provided by the Promise resolve.
	 *
	 * @private
	 */
	DataProviderBase.prototype.fnOnDataReceived = function(oResult) {
		var aData, sNextUrl, iFetchedRows, fPercent, iRemainingRows;
		var mCallbackParams = {};

		if (this.bCanceled) {
			return; // Canceled by the application
		}

		/* Check for OData V4 result, if not present check for OData V2 result or apply default */
		aData = (oResult && oResult.value || (oResult.d && (oResult.d.results || oResult.d))) || oResult;
		aData = (Array.isArray(aData)) ? aData : [];
		iFetchedRows = aData.length;

		this.iAvailableRows += iFetchedRows;
		iRemainingRows = this.iTotalRows - this.iAvailableRows;
		fPercent = this.iAvailableRows / this.iTotalRows;

		mCallbackParams.finished = iFetchedRows === 0 || iRemainingRows <= 0; // Done criteria
		mCallbackParams.progress = Math.round(fPercent * 100);
		mCallbackParams.total = this.iTotalRows;
		mCallbackParams.fetched = this.iAvailableRows;

		// Check if next url is provided
		sNextUrl = (oResult && oResult['@odata.nextLink'] || (oResult.d && oResult.d.__next)) || null;

		if (!mCallbackParams.finished) {
			// Trigger next page request before processing received data. Fetch only configured/max limit rows
			this.mRequest.dataUrl = this._getUrl(this.iAvailableRows, Math.min(this.iBatchSize, iRemainingRows), sNextUrl);
			this.sendRequest(this.mRequest)
				.then(this.fnOnDataReceived.bind(this))
				.catch(this.fnOnError.bind(this));
		}

		mCallbackParams.rows = this.fnConvertData(aData); // Normalize data
		this.fnProcessCallback(mCallbackParams); // Return result
	};

	/**
	 * Inner function that processes request handler exceptions.
	 *
	 * @param {string} sMessage - Error message.
	 *
	 * @private
	 */
	DataProviderBase.prototype.fnOnError = function(sMessage) {
		this.fnProcessCallback({
			error: sMessage
		});
	};

	/**
	 * Nested function to remove not used information from the URL
	 *
	 * @param {string} url - A URL that may contain a path, hash and request parameters
	 * @returns {string} - A clean URL
	 *
	 * @private
	 */
	DataProviderBase.prototype._cleanUrl = function(url) {
		var mUri;

		if (!url) {
			return '';
		}

		mUri = URI.parse(url);

		mUri.path = mUri.path || '';
		if (mUri.path.slice(-1) !== '/') {
			mUri.path = mUri.path + '/';
		}
		delete mUri.query;
		delete mUri.hash;
		delete mUri.fragment;

		return (URI.serialize || URI.build)(mUri);
	};

	/**
	 * The function processes the dataURL and adds any missing $skip or $top before initial use.
	 *
	 * @private
	 */
	DataProviderBase.prototype._prepareDataUrl = function() {
		var mDataSource = this.mSettings.dataSource;
		var mDataUrl, reSkip = /\$skip\=[0-9]+/, reTop = /\$top\=[0-9]+/;

		if (!mDataSource.dataUrl) {
			return '';
		}

		mDataUrl = URI.parse(mDataSource.dataUrl);
		mDataUrl.query = mDataUrl.query || '';

		// Add missing $skip if needed
		if (!reSkip.test(mDataUrl.query)) {
			// Apply $skip with some numeric dummy value that matches the regexp in DataProviderBase#_getUrl
			mDataUrl.query += (mDataUrl.query.length ? '&' : '') + '$skip=' + 0;
		}
		// Add missing $top if needed
		if (!reTop.test(mDataUrl.query)) {
			// Apply $top with some numeric dummy value that matches the regexp in DataProviderBase#_getUrl
			mDataUrl.query += '&$top=' + 0;
		}

		this.mSettings.dataSource.dataUrl = (URI.serialize || URI.build)(mDataUrl);
	};

	/**
	 * Creates the download URL for the next query.
	 *
	 * @param {number} iSkip - The amount of items that are already present and will be skipped
	 * @param {number} iTop - The amount of items that should be requested with this query
	 * @param {string} [sNextUrl] - A reference to the next bulk of data that was returned by the previous request
	 * @returns {string} - The URL for the next query
	 */
	DataProviderBase.prototype._getUrl = function(iSkip, iTop, sNextUrl) {
		var mDataUrl, mNextUrl;

		mDataUrl = URI.parse(this.mSettings.dataSource.dataUrl);

		/*
		 * Use $skiptoken from response to query the next items.
		 * OData V4 returns a relative path, while OData V2 returns
		 * an absolute path. Therefore we need to use the original
		 * URL to keep possible proxy settings and avoid any issues
		 * between OData V4 and V2
		 */
		if (sNextUrl) {
			mNextUrl = URI.parse(sNextUrl);
			mDataUrl.query = mNextUrl.query;
		} else { // Use $skip and $top
			mDataUrl.query = (mDataUrl.query || '')
				.replace(/\$skip\=[0-9]+/g, '$skip=' + iSkip)
				.replace(/\$top\=[0-9]+/g, '$top=' + iTop);
		}

		return (URI.serialize || URI.build)(mDataUrl);
	};

	/**
	 * This method creates an XMLHttpRequest from the provided
	 * configuration and requests the data from the backend. The
	 * configuration is configured to use OData services.
	 *
	 * @param {Object} oRequest - Request configuration object
	 * @param {string} oRequest.method - References the HTTP method that is used (default: GET)
	 * @param {string} oRequest.dataUrl - References the resource URL that gets invoked
	 * @param {string} oRequest.serviceUrl - References the service URL that gets invoked
	 * @return {Promise} Returns a Promise that will be resolve once the requested data was fetched
	 */
	DataProviderBase.prototype.sendRequest = function(oRequest) {
		if (typeof oRequest !== 'object' || oRequest === null || typeof oRequest.dataUrl !== 'string') {
			throw new Error('Unable to send request - Mandatory parameters missing.');
		}

		return (oRequest.method === 'BATCH' && oRequest.serviceUrl ? this.sendBatchRequest : this.sendGetRequest)(oRequest);
	};

	/**
	 * Creates a $batch request and sends it to the backend service.
	 *
	 * @param {Object} oRequest - Request object that contains all necessary information to create the batch request
	 * @returns {Promise} - A Promise that resolves in a JSON object containing the fetched data
	 */
	DataProviderBase.prototype.sendBatchRequest = function(oRequest) {
		return new Promise(function(fnResolve, fnReject) {
			var xhr = new XMLHttpRequest();
			var boundary = 'batch_' + DataProviderBase._createGuid();
			var getUrl = oRequest.dataUrl.split(oRequest.serviceUrl)[1];
			var body = [];
			var sKey, sValue;

			xhr.onload = function() {
				var responseText, aLines, iEnd, iLength, iStart, oResponseData;

				aLines = this.responseText.split('\r\n');

				// TBD: check return codes
				iStart = 0;
				iLength = aLines.length;
				iEnd = iLength - 1;

				while (iStart < iLength && aLines[iStart].slice(0, 1) !== '{') {
					iStart++;
				}

				while (iEnd > 0 && aLines[iEnd].slice(-1) !== '}') {
					iEnd--;
				}
				aLines = aLines.slice(iStart, iEnd + 1);
				responseText = aLines.join('\r\n');

				try {
					oResponseData = JSON.parse(responseText);
					fnResolve(oResponseData);
				} catch (e) {
					fnReject(DataProviderBase.HTTP_WRONG_RESPONSE_MSG + responseText);
				}
			};
			xhr.onerror = function() {
				fnReject(DataProviderBase.HTTP_ERROR_MSG);
			};
			xhr.onabort = function() {
				fnReject(DataProviderBase.HTTP_ERROR_MSG);
			};

			// Create request
			xhr.open('POST', oRequest.serviceUrl + '$batch', true);

			xhr.setRequestHeader('Accept', 'multipart/mixed');
			xhr.setRequestHeader('Content-Type', 'multipart/mixed;boundary=' + boundary);

			body.push('--' + boundary);
			body.push('Content-Type: application/http');
			body.push('Content-Transfer-Encoding: binary');
			body.push('');
			body.push('GET ' + getUrl + ' HTTP/1.1');

			/* Set header information on the request as well as on the batch request */
			for (sKey in oRequest.headers) {
				sValue = oRequest.headers[sKey];

				if (sKey.toLowerCase() != 'accept') {
					xhr.setRequestHeader(sKey, sValue);
				}
				body.push(sKey + ':' + sValue);
			}

			body.push('');
			body.push('');
			body.push('--' + boundary + '--');
			body.push('');
			body = body.join('\r\n');
			xhr.send(body);
		});
	};

	/**
	 * Creates and sends a GET request to the backend service.
	 *
	 * @param {Object} oRequest - Request object that contains all necessary information to create the batch request
	 * @returns {Promise} - A Promise that resolves in a JSON object containing the fetched data
	 */
	DataProviderBase.prototype.sendGetRequest = function(oRequest) {
		return new Promise(function(fnResolve, fnReject) {
			var sHeaderKey;
			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				if (this.status >= 400) {
					fnReject(this.responseText);

					return;
				}
				try {
					fnResolve(JSON.parse(this.responseText));
				} catch (e) {
					fnReject(DataProviderBase.HTTP_WRONG_RESPONSE_MSG + this.responseText);
				}
			};
			xhr.onerror = function() {
				fnReject(DataProviderBase.HTTP_ERROR_MSG);
			};
			xhr.onabort = function() {
				fnReject(DataProviderBase.HTTP_ERROR_MSG);
			};
			xhr.open('GET', oRequest.dataUrl, true);
			xhr.setRequestHeader('accept', 'application/json');

			/* Set custom header information on the request as well as on the batch request */
			for (sHeaderKey in oRequest.headers) {
				if (sHeaderKey.toLowerCase() !== 'accept') {
					xhr.setRequestHeader(sHeaderKey, oRequest.headers[sHeaderKey]);
				}
			}

			xhr.send();
		});
	};

	return DataProviderBase;
});
