sap.ui.define(
	["./HeaderAPI", "sap/fe/test/Utils", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder", "./ShareUtilsHelper"],
	function(HeaderAPI, Utils, OpaBuilder, FEBuilder, ShareUtilsHelper) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.HeaderBuilder} oHeaderBuilder the HeaderBuilder instance to operate on
		 * @param {string} [vHeaderDescription] the Header description (optional), used to log message
		 * @returns {sap.fe.test.api.HeaderActions} the instance
		 * @constructor
		 * @private
		 */
		var HeaderActions = function(oHeaderBuilder, vHeaderDescription) {
			this._sObjectPageLayoutId = vHeaderDescription.id;
			this._sHeaderContentId = vHeaderDescription.headerContentId;
			this._sViewId = vHeaderDescription.viewId;
			this._sPaginatorId = vHeaderDescription.paginatorId;
			this._sBreadCrumbId = vHeaderDescription.breadCrumbId;
			return HeaderAPI.call(this, oHeaderBuilder, vHeaderDescription);
		};
		HeaderActions.prototype = Object.create(HeaderAPI.prototype);
		HeaderActions.prototype.constructor = HeaderActions;
		HeaderActions.prototype.isAction = true;

		/**
		 * Execute the Edit action in the ObjectPage Header Toolbar.
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteEdit = function() {
			var sEditId = "fe::StandardAction::Edit",
				oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);

			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sEditId))), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Executing header Edit action '{0}'", sEditId))
					.execute()
			);
		};

		/**
		 * Execute the Delete action in the ObjectPage Header Toolbar.
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteDelete = function() {
			var sDeleteId = "fe::StandardAction::Delete",
				oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);

			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sDeleteId))), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Executing header Delete action '{0}'", sDeleteId))
					.execute()
			);
		};

		/**
		 * Execute a header toolbar action. The action is identified either by id or by a string representing
		 * the label of the action.
		 * If <code>vActionIdentifier</code> is passed as an object, the following pattern will be considered:
		 * <code><pre>
		 * 	{
		 * 		<service>: <name of the service>
		 * 		<action>: <name of the action>
		 *  }
		 * </pre></code>
		 *
		 * @param {Object, String} [vActionIdentifier]
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteAction = function(vActionIdentifier) {
			var aArguments = Utils.parseArguments([[Object, String]], arguments),
				oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);
			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(this.createActionMatcher(vActionIdentifier), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Executing custom header action '{0}'", aArguments[0]))
					.execute()
			);
		};

		/**
		 * Execute the Related Apps action in the ObjectPage Header Toolbar.
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteRelatedApps = function() {
			var oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);
			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(
						OpaBuilder.Matchers.resourceBundle("text", "sap.fe.templates", "OBJECT_PAGE_REALATED_APPS"),
						OpaBuilder.Actions.press()
					)
					.description("Open header action menu 'Related Apps'")
					.execute()
			);
		};

		/**
		 * Execute a Related Apps action in the ObjectPage Header Toolbar. The action is identified a string representing
		 * the label of the action.
		 *
		 * @param {String} [vActionIdentifier]
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteRelatedAppsMenuItem = function(sItem) {
			var aArguments = Utils.parseArguments([String], arguments);

			return this.prepareResult(
				OpaBuilder.create(this)
					.hasType("sap.ui.unified.Menu")
					.doOnAggregation("items", OpaBuilder.Matchers.properties({ text: sItem }), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Executing Related Apps menu item '{0}'", aArguments[0]))
					.execute()
			);
		};

		/**
		 * Execute a paginator down button click on the object page.
		 *
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderActions.prototype.iExecutePaginatorDown = function() {
			return this.prepareResult(
				this.createPaginatorBuilder(
					OpaBuilder.Matchers.properties({ icon: "sap-icon://navigation-down-arrow" }),
					this._sViewId + "--" + this._sPaginatorId,
					{ visible: true, enabled: true }
				)
					.doPress()
					.description("Paginator button Down pressed")
					.execute()
			);
		};

		/**
		 * Execute a paginator up button click on the object page.
		 *
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderActions.prototype.iExecutePaginatorUp = function() {
			return this.prepareResult(
				this.createPaginatorBuilder(
					OpaBuilder.Matchers.properties({ icon: "sap-icon://navigation-up-arrow" }),
					this._sViewId + "--" + this._sPaginatorId,
					{ visible: true, enabled: true }
				)
					.doPress()
					.description("Paginator button Up pressed")
					.execute()
			);
		};

		/**
		 * Navigate by a Breadcrumb link on the object page.
		 *
		 * @param {String} sLink Text label of the link to be navigated to
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @sap-restricted
		 */
		HeaderActions.prototype.iNavigateByBreadcrumb = function(sLink) {
			return this.prepareResult(
				OpaBuilder.create(this)
					.hasId(this._sBreadCrumbId)
					.doOnAggregation("links", OpaBuilder.Matchers.properties({ text: sLink }), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Navigating by Breadcrumb link '{0}'", sLink))
					.execute()
			);
		};

		/**
		 * Execute the <code>Save as Tile</code> action.
		 *
		 * @param {String} sBookmarkTitle the title of the new tile
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteSaveAsTile = function(sBookmarkTitle) {
			var sShareId = "fe::Share",
				oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);

			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sShareId))), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Pressing header '{0}' Share button", this.getIdentifier()))
					.success(ShareUtilsHelper.createSaveAsTileExecutorBuilder(sBookmarkTitle))
					.execute()
			);
		};

		/**
		 * Execute the Send E-Mail action.
		 *
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		HeaderActions.prototype.iExecuteSendEmail = function() {
			var sShareId = "fe::Share",
				oOverflowToolbarBuilder = this.createOverflowToolbarBuilder(this._sObjectPageLayoutId);

			return this.prepareResult(
				oOverflowToolbarBuilder
					.doOnContent(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sShareId))), OpaBuilder.Actions.press())
					.description(Utils.formatMessage("Pressing header '{0}' Share button", this.getIdentifier()))
					.success(ShareUtilsHelper.createSendEmailExecutorBuilder())
					.execute()
			);
		};

		return HeaderActions;
	}
);
