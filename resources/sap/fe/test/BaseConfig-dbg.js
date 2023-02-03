sap.ui.define(["./BaseArrangements", "./BaseActions", "./BaseAssertions"], function(BaseArrangements, BaseActions, BaseAssertions) {
	"use strict";

	return {
		actions: new BaseActions(),
		assertions: new BaseAssertions(),
		arrangements: new BaseArrangements(),
		viewNamespace: "sap.fe.templates",
		autoWait: true,
		timeout: 60,
		logLevel: "ERROR",
		asyncPolling: true
	};
});
