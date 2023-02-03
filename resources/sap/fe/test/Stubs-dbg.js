/**
 * Actions and assertions to be used with a page hosted in an FCL
 */
sap.ui.define(["sap/ui/test/OpaBuilder"], function(OpaBuilder) {
	"use strict";
	var Stubs = {
		prepareStubs: function(oWindow) {
			if (!oWindow.sapFEStubs) {
				oWindow.sapFEStubs = {};
			}
		},

		stubConfirm: function(oWindow) {
			Stubs.prepareStubs(oWindow);

			oWindow.sapFEStubs._confirmOriginal = oWindow.confirm;
			oWindow.confirm = function(sMessage) {
				throw "Unexpected confirm dialog - " + sMessage;
			};
		},

		restoreConfirm: function(oWindow) {
			if (!oWindow.sapFEStubs || !oWindow.sapFEStubs._confirmOriginal) {
				return;
			}
			oWindow.confirm = oWindow.sapFEStubs._confirmOriginal;
			delete oWindow.sapFEStubs._confirmOriginal;
		},

		stubMessageToast: function(oWindow) {
			Stubs.prepareStubs(oWindow);
			var oMessageToast = oWindow.sap.ui.require("sap/m/MessageToast");
			oWindow.sapFEStubs._sapMMessageToastShowOriginal = oMessageToast.show;
			oWindow.sapFEStubs.setLastToastMessage = function(sMessage) {
				oWindow.sapFEStubs._sapMMessageToastLastMessage = sMessage;
			};
			oWindow.sapFEStubs.getLastToastMessage = function() {
				return oWindow.sapFEStubs._sapMMessageToastLastMessage;
			};
			oMessageToast.show = function(sMessage) {
				oWindow.sapFEStubs.setLastToastMessage(sMessage);
				return oWindow.sapFEStubs._sapMMessageToastShowOriginal.apply(this, arguments);
			};
		},
		restoreMessageToast: function(oWindow) {
			if (!oWindow.sapFEStubs || !oWindow.sapFEStubs._sapMMessageToastShowOriginal) {
				return;
			}
			var oMessageToast = oWindow.sap.ui.require("sap/m/MessageToast");
			oMessageToast.show = oWindow.sapFEStubs._sapMMessageToastShowOriginal;
			delete oWindow.sapFEStubs._sapMMessageToastShowOriginal;
			delete oWindow.sapFEStubs._sapMMessageToastLastMessage;
			delete oWindow.sapFEStubs.setLastToastMessage;
			delete oWindow.sapFEStubs.getLastToastMessage;
		}
	};

	return Stubs;
});
