sap.ui.define(["sap/ui/test/OpaBuilder", "sap/ui/test/Opa5", "sap/fe/test/Utils"], function(OpaBuilder, Opa5, Utils) {
	"use strict";

	function resetTestWindowConfirmDialog(oConfirmationContext) {
		if (oConfirmationContext.testWindow) {
			oConfirmationContext.testWindow.confirm = oConfirmationContext.testWindowConfirm;
			delete oConfirmationContext.testWindow;
			delete oConfirmationContext.testWindowConfirm;
		}
	}

	return {
		create: function() {
			return {
				actions: {
					iSetNextConfirmAnswer: function(bConfirm, oConfirmationContext) {
						return OpaBuilder.create(this)
							.do(function() {
								var oTestWindow = Opa5.getWindow(),
									fnConfirm = oTestWindow.confirm;

								function custConfirm(sMessage) {
									// Reset original confirm
									resetTestWindowConfirmDialog(oConfirmationContext);
									oConfirmationContext.confirmed = bConfirm;
									oConfirmationContext.message = sMessage;
									return bConfirm;
								}

								delete oConfirmationContext.confirmed;
								delete oConfirmationContext.message;
								oConfirmationContext.testWindow = oTestWindow;
								oConfirmationContext.testWindowConfirm = fnConfirm;
								oTestWindow.confirm = custConfirm;
							})
							.description(Utils.formatMessage("Next confirmation dialog will be {0}", bConfirm ? "accepted" : "refused"))
							.execute();
					}
				},
				assertions: {
					confirmDialogHasBeenDisplayed: function(bExpectedAnswer, oConfirmationContext) {
						return OpaBuilder.create(this)
							.check(function() {
								return oConfirmationContext && oConfirmationContext.confirmed === bExpectedAnswer;
							}, true)
							.description(
								Utils.formatMessage("Confirm dialog has been displayed and {0}", bExpectedAnswer ? "accepted" : "refused")
							)
							.execute();
					},

					confirmDialogHasNotBeenDisplayed: function(oConfirmationContext) {
						return OpaBuilder.create(this)
							.check(function() {
								return oConfirmationContext && !("confirmed" in oConfirmationContext);
							}, true)
							.success(function() {
								resetTestWindowConfirmDialog(oConfirmationContext);
							})
							.description("No confirm dialog has been displayed")
							.execute();
					}
				}
			};
		}
	};
});
