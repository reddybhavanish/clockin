/**
 * Spreadsheet Worker - Document Export Services
 */
var spreadsheet;
var provider;
var request;
var origin = self.origin || "";

/* global XLSXBuilder, importScripts, DataProviderBase */

importScripts(origin + 'libs/uri.all.min.js');
importScripts(origin + 'XLSXBuilder.js');
importScripts(origin + '../provider/DataProviderBase.js');
importScripts(origin + 'libs/JSZip3.js');

// Promise implementation for IE
if (!self.Promise) {
	/* global ES6Promise */

	importScripts(origin + 'libs/es6-promise.js');
	ES6Promise.polyfill();
}

// eslint-disable-next-line no-undef
onmessage = function(e) {
	'use strict';

	if (e.data.cancel) {
		if (request) {
			request.cancel();
		}
		close();
		return;
	}

	var mSettings = e.data;
	spreadsheet =
		new XLSXBuilder(mSettings.workbook.columns, mSettings.workbook.context, mSettings.workbook.hierarchyLevel, mSettings.customconfig);

	provider = new DataProviderBase(mSettings);

	if (!(provider instanceof DataProviderBase)) {
		processCallback({
			error: 'Invalid DataProvider - Export aborted'
		});
	}

	request = provider.requestData(processCallback);
};

function processCallback(oMessage) {
	'use strict';

	if (oMessage.rows) {
		spreadsheet.append(oMessage.rows);
	}
	if (oMessage.error) {
		postMessage({
			error: oMessage.error
		});
		close();
	}
	if (oMessage.progress) {
		postMessage({
			progress: oMessage.progress,
			fetched: oMessage.fetched,
			total: oMessage.total
		}); // Send status update
	}
	oMessage.finished && spreadsheet.build().then(saveSpreadsheet);
}

function saveSpreadsheet(arraybuffer) {
	'use strict';

	postMessage(arraybuffer, [arraybuffer]);
	close(); // Terminate the Worker
}
