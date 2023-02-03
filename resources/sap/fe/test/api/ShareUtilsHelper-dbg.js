sap.ui.define(["sap/fe/test/Utils", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder"], function(Utils, OpaBuilder, FEBuilder) {
	"use strict";

	var ShareUtilsHelper = {
		createSaveAsTileBuilder: function() {
			return new FEBuilder().isDialogElement().hasType("sap.ushell.ui.footerbar.AddBookmarkButton");
		},

		createSaveAsTileCheckBuilder: function(mState) {
			return ShareUtilsHelper.createSaveAsTileBuilder()
				.hasState(mState)
				.description(Utils.formatMessage("Checking 'Save as Tile' action having state='{0}'", mState));
		},

		createSaveAsTileExecutorBuilder: function(sBookmarkTitle) {
			return ShareUtilsHelper.createSaveAsTileBuilder()
				.doPress()
				.description("Executing 'Save as Tile' action")
				.success(
					FEBuilder.create()
						.isDialogElement()
						.hasType("sap.m.Input")
						.hasProperties({ id: "bookmarkTitleInput" })
						.doEnterText(sBookmarkTitle)
						.description(Utils.formatMessage("Enter '{0}' as Bookmark title", sBookmarkTitle))
						.success(
							FEBuilder.create()
								.isDialogElement()
								.hasType("sap.m.Button")
								.hasProperties({ id: "bookmarkOkBtn" })
								.doPress()
								.description("Confirm 'Save as Tile' dialog")
						)
				);
		},

		createSendEmailBuilder: function() {
			return new FEBuilder()
				.isDialogElement()
				.hasType("sap.m.Button")
				.hasProperties({ icon: "sap-icon://email" })
				.has(OpaBuilder.Matchers.resourceBundle("text", "sap.fe.templates", "SAPFE_SHARE_EMAIL"));
		},

		createSendEmailCheckBuilder: function(mState) {
			return ShareUtilsHelper.createSendEmailBuilder()
				.hasState(mState)
				.description(Utils.formatMessage("Checking 'Send Email' action having state='{0}'", mState));
		},

		createSendEmailExecutorBuilder: function() {
			return ShareUtilsHelper.createSendEmailBuilder()
				.doPress()
				.description("Executing 'Send Email' action");
		}
	};

	return ShareUtilsHelper;
});
