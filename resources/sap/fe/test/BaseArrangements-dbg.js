sap.ui.define(
	[
		"sap/ui/test/Opa5",
		"sap/ui/test/OpaBuilder",
		"sap/ui/thirdparty/jquery",
		"sap/base/util/UriParameters",
		"sap/fe/test/Utils",
		"./Stubs"
	],
	function(Opa5, OpaBuilder, jQuery, UriParameters, Utils, Stubs) {
		"use strict";

		// All common arrangements for all Opa tests are defined here
		return Opa5.extend("sap.fe.integrations.common.BaseArrangements", {
			iStartMyApp: function(appName, sAppParams, mSandboxParams) {
				// using NodeJS Mockserver on 4004 as backend
				var oUriParams = new UriParameters(window.location.href),
					sBackendUrl = oUriParams.get("useBackendUrl") || "http://localhost:4004",
					sSandBoxParams = Object.keys(mSandboxParams || {}).reduce(function(sCurrent, sKey) {
						return sCurrent + "&" + sKey + "=" + mSandboxParams[sKey];
					}, "");
				this.iStartMyAppInAFrame(
					"test-resources/sap/fe/templates/internal/demokit/flpSandbox.html?sap-ui-log-level=ERROR&sap-ui-xx-viewCache=true&useBackendUrl=" +
						sBackendUrl +
						sSandBoxParams +
						"#" +
						appName +
						(sAppParams || "")
				);
				// We need to reset the native navigation functions in the iFrame
				// as the navigation mechanism in Fiori elements uses them
				// (they are overridden in OPA by the iFrameLauncher)
				// We also need to override native confirm dialog, as it blocks the test
				return OpaBuilder.create(this)
					.success(function() {
						var oWindow = Opa5.getWindow();
						var oWindowParent = oWindow.parent;
						oWindow.history.go = oWindowParent.history.go;
						oWindow.history.back = oWindowParent.history.back;

						Stubs.stubConfirm(oWindow);
						Stubs.stubMessageToast(oWindow);
					})
					.description(Utils.formatMessage("App '{0}{1}' started", appName, sAppParams || ""))
					.execute();
			},
			iResetTestData: function() {
				var oUriParams = new UriParameters(window.location.href),
					sBackendUrl = oUriParams.get("useBackendUrl") || "http://localhost:4004",
					sProxyPrefix = "/databinding/proxy/" + sBackendUrl.replace("://", "/"),
					bSuccess = false,
					sTenantID =
						window.__karma__ && window.__karma__.config && window.__karma__.config.ui5
							? window.__karma__.config.ui5.shardIndex
							: "default";

				return OpaBuilder.create(this)
					.success(function() {
						//clear local storage so no flex change / variant management zombies exist
						localStorage.clear();
						jQuery.post(sProxyPrefix + "/redeploy?tenant=" + sTenantID, function() {
							bSuccess = true;
						});
						return OpaBuilder.create(this)
							.check(function() {
								return bSuccess;
							})
							.execute();
					})
					.description(Utils.formatMessage("Reset test data on tenant '{0}'", sTenantID))
					.execute();
			},
			iTearDownMyApp: function() {
				return OpaBuilder.create(this)
					.do(function() {
						var oWindow = Opa5.getWindow();
						Stubs.restoreConfirm(oWindow);
						Stubs.restoreMessageToast(oWindow);
					})
					.do(this.iTeardownMyAppFrame.bind(this))
					.description("Tearing down my app")
					.execute();
			}
		});
	}
);
