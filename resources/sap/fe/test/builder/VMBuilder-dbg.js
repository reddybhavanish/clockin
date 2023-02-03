sap.ui.define(["./FEBuilder", "sap/ui/test/OpaBuilder", "sap/fe/test/Utils"], function(FEBuilder, OpaBuilder, Utils) {
	"use strict";

	var VMBuilder = function() {
		return FEBuilder.apply(this, arguments);
	};

	VMBuilder.create = function(oOpaInstance) {
		return new VMBuilder(oOpaInstance);
	};

	VMBuilder.prototype = Object.create(FEBuilder.prototype);
	VMBuilder.prototype.constructor = VMBuilder;

	/**
	 * Saves a variant under given name.
	 *
	 * @param {string} sVariantName the name of the new variant
	 * @returns {sap.fe.test.builder.VMBuilder} this instance
	 *
	 * @public
	 * @sap-restricted
	 */
	VMBuilder.prototype.doSaveAs = function(sVariantName) {
		var vGivenDescription = Utils.formatMessage("Save as variant '{0}'", sVariantName);
		this.description = function(vDescription) {
			vGivenDescription = vDescription;
			return this;
		}.bind(this);

		return this.doPress().success(
			function(oVMControl) {
				return FEBuilder.create(this)
					.hasId(oVMControl.getId())
					.doPress("saveas")
					.success(
						FEBuilder.create(this)
							.hasId(oVMControl.getId() + "-savedialog")
							.doOnChildren(
								FEBuilder.create(this)
									.hasId(/-name$/)
									.hasType("sap.m.Input")
									.doEnterText(sVariantName)
							)
							.doOnChildren(
								FEBuilder.create(this)
									.hasId(/-variantsave$/)
									.hasType("sap.m.Button")
									.doPress()
							)
							.description(vGivenDescription)
					)
					.execute();
			}.bind(this)
		);
	};

	/**
	 * Saves the current variant.
	 *
	 * @returns {sap.fe.test.builder.VMBuilder} this instance
	 *
	 * @public
	 * @sap-restricted
	 */
	VMBuilder.prototype.doSave = function() {
		var vGivenDescription = "Save variant";
		this.description = function(vDescription) {
			vGivenDescription = vDescription;
			return this;
		}.bind(this);

		return this.doPress().success(
			function(oVMControl) {
				return FEBuilder.create(this)
					.hasId(oVMControl.getId())
					.doPress("mainsave")
					.description(vGivenDescription)
					.execute();
			}.bind(this)
		);
	};

	/**
	 * select a variant under given name.
	 *
	 * @param {string} sVariantName the name of the variant to select
	 * @returns {sap.fe.test.builder.VMBuilder} this instance
	 *
	 * @public
	 * @sap-restricted
	 */
	VMBuilder.prototype.doSelectVariant = function(sVariantName) {
		var vGivenDescription = Utils.formatMessage("Selecting variant '{0}'", sVariantName);
		this.description = function(vDescription) {
			vGivenDescription = vDescription;
			return this;
		}.bind(this);
		return this.doPress().success(
			function(oVMControl) {
				return FEBuilder.create(this)
					.hasId(oVMControl.getId() + "-list")
					.doOnAggregation("items", OpaBuilder.Matchers.properties({ text: sVariantName }), OpaBuilder.Actions.press())
					.description(vGivenDescription)
					.execute();
			}.bind(this)
		);
	};

	/**
	 * Removes a variant under given name.
	 *
	 * @param {string} sVariantName the name of the variant to remove
	 * @returns {sap.fe.test.builder.VMBuilder} this instance
	 *
	 * @public
	 * @sap-restricted
	 */
	VMBuilder.prototype.doRemoveVariant = function(sVariantName) {
		var vGivenDescription = Utils.formatMessage("Removing variant '{0}'", sVariantName);
		this.description = function(vDescription) {
			vGivenDescription = vDescription;
			return this;
		}.bind(this);
		return this.doPress().success(
			function(oVMControl) {
				return FEBuilder.create(this)
					.hasId(oVMControl.getId())
					.doPress("manage")
					.success(
						FEBuilder.create(this)
							.hasId(oVMControl.getId() + "-managementTable")
							.doOnChildren(
								FEBuilder.create(this)
									.hasType("sap.m.ColumnListItem")
									.hasAggregationProperties("cells", { value: sVariantName })
									.has(
										OpaBuilder.Matchers.aggregation(
											"cells",
											OpaBuilder.Matchers.properties({ icon: "sap-icon://sys-cancel" })
										)
									)
									.has(FEBuilder.Matchers.atIndex(0))
									.doPress()
							)
							.doOnChildren(
								FEBuilder.create(this)
									.hasId(/-managementsave$/)
									.hasType("sap.m.Button")
									.doPress()
							)
							.description(vGivenDescription)
					)
					.execute();
			}.bind(this)
		);
	};

	return VMBuilder;
});
