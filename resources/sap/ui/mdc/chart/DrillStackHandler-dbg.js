/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"sap/m/ResponsivePopover",
	"sap/m/List",
	"sap/m/Bar",
	"sap/m/SearchField",
	"sap/m/StandardListItem",
	"sap/ui/core/InvisibleText",
	"sap/m/library",
	"sap/ui/Device",
	"sap/ui/mdc/chart/DimensionItem",
	"sap/ui/mdc/chart/ChartSettings"
], function(
	ResponsivePopover,
	List,
	Bar,
	SearchField,
	StandardListItem,
	InvisibleText,
	MLibrary,
	Device,
	DimensionItem,
	ChartSettings
) {
	"use strict";

	// shortcut for sap.m.PlacementType
	var PlacementType = MLibrary.PlacementType;

	// shortcut for sap.m.ListType
	var ListType = MLibrary.ListType;

	// shortcut for sap.m.ListMode
	var ListMode = MLibrary.ListMode;

	function _getDrillStackDimensions(oChart) {
		var aDrillStack = oChart.getAggregation("_chart").getDrillStack();
		var aStackDimensions = [];

		aDrillStack.forEach(function(oStackEntry) {
			// loop over nested dimension arrays
			oStackEntry.dimension.forEach(function(sDimension) {
				if (sDimension != null && sDimension != "" && aStackDimensions.indexOf(sDimension) == -1) {
					aStackDimensions.push(sDimension);
				}
			});
		});

		return aStackDimensions;
	}

	//Get all dimensions in a sorted manner
	function _getSortedDimensions(aProperties) {

		var aDimensions = aProperties.filter(function(oItem) {
			return oItem.kind == "Dimension";
		});

		if (aDimensions) {
			aDimensions.sort(function(a, b) {
				if (a.label && b.label) {
					return a.label.localeCompare(b.label);
				}
			});
		}

		return aDimensions;
	}

	/**
	 * Handles all drill-stack operations on a mdc.Chart instance
	 * inlcuding drill-downs, drill-ups and updating of depending controls
	 * like Breadcrumbs.
	 * @constructor
	 */
	var DrillStackHandler = function() {

	};

	DrillStackHandler.createDrillDownPopover = function(oChart) {

		var oList = new List({
			mode: ListMode.SingleSelectMaster,
			selectionChange: function(oEvent) {

				if (oEvent && oEvent.mParameters && oEvent.mParameters.listItem) {
					//Call flex to capture current state before adding an item to the chart aggregation

					var oAdaptationController = ChartSettings._getAdaptationController(oChart);
					oAdaptationController.createItemChanges([{
						name: oEvent.mParameters.listItem.data("dim").name,
						position: oChart.getItems().length
					}]);

				}

				oPopover.close();
			}
		});

		var oSubHeader = new Bar();

		//TODO add search field
		//var oSearchField = new SearchField({
		//placeholder: this._oRb.getText("CHART_DRILLDOWN_SEARCH")
		//});
		//oSearchField.attachLiveChange(function(oEvent) {
		//this._triggerSearchInDrillDownPopover(oEvent, oList);
		//}.bind(this));

		var oPopover = new ResponsivePopover({
			contentWidth: "25rem",
			contentHeight: "20rem",
			placement: PlacementType.Bottom,
			subHeader: oSubHeader
		});

		//Show header only in mobile scenarios
		//still support screen reader while on desktops.
		if (Device.system.desktop) {
			var oInvText = new InvisibleText({
			//text: this._oRb.getText("CHART_DRILLDOWN_TITLE")
			});
			oPopover.setShowHeader(false);
			oPopover.addContent(oInvText);
			oPopover.addAriaLabelledBy(oInvText);
		} else {
			oPopover.setTitle("View By");
		}

		oPopover.addContent(oList);
		oChart._oDrillDownPopover = oPopover;
	};

	/**
	 * Shows the drill-down popover on the toolbar button of an mdc.Chart instance
	 * @param oChart
	 */
	DrillStackHandler.showDrillDownPopover = function(oChart) {
		oChart.oDelegateModule.fetchProperties(oChart).then(function(aProperties) {
			//Remove all prior items from drill-down list
			var oDrillDownList = oChart._oDrillDownPopover.getContent()[1];
			var aIgnoreDimensions, aSortedDimensions, oDimension, oListItem;

			oDrillDownList.removeAllItems();

			// Ignore currently applied dimensions from drill-stack for selection
			aIgnoreDimensions = _getDrillStackDimensions(oChart);
			aSortedDimensions = _getSortedDimensions(aProperties);

			for (var i = 0; i < aSortedDimensions.length; i++) {
				oDimension = aSortedDimensions[i];

				if (aIgnoreDimensions.indexOf(oDimension.name) > -1) {
					continue;
				}

				//TODO: Check if still valid
				// If dimension is not filterable and datapoints are selected then skip
				/*if (!oViewField.filterable && this._oChart.getSelectedDataPoints().count > 0) {
					    continue;
				}*/

				oListItem = new StandardListItem({
					title: oDimension.label,
					type: ListType.Active
				});

				oListItem.data("dim", oDimension);

				/*sTooltip = this._getFieldTooltip(oDimension.name);
				if (sTooltip) {
					  oListItem.setTooltip(sTooltip);
				}*/

				//Add item to list within popover
				oDrillDownList.addItem(oListItem);
			}
			//Open popover at drill-down button
			oChart._oDrillDownPopover.openBy(oChart._oDrillDownBtn);
		});
	};

	DrillStackHandler.createDrillBreadcrumbs = function(oChart) {

		sap.ui.require([
			"sap/m/Breadcrumbs"
		], function(Breadcrumbs) {

			var oInnerChart = oChart.getAggregation("_chart");

			if (oInnerChart) {
				var oDrillBreadcrumbs = new Breadcrumbs(/*{currentLocationText:"Current", links:[new Link({text:"Link1"}), new Link({text:"Link2"})]}*/);

				oChart.setAggregation("_breadcrumbs", oDrillBreadcrumbs);

				//initial update of current drill-path
				this._updateDrillBreadcrumbs(oChart, oDrillBreadcrumbs);
			}
		}.bind(this));
	};

	DrillStackHandler._updateDrillBreadcrumbs = function(oChart, oDrillBreadcrumbs) {

		sap.ui.require([
			"sap/m/Link"
		], function(Link) {

			if (!oDrillBreadcrumbs) {
				return;
			}

			// Get access to drill history
			var oInnerChart = oChart.getAggregation("_chart");

			if (!oInnerChart) {
				return;
			}

			var aVisibleDimensionsRev = oInnerChart.getDrillStack();
			var newLinks = [];

			// When chart is bound to non-aggregated entity there is no drill-stack
			// existing
			if (aVisibleDimensionsRev) {

				// Reverse array to display right order of crumbs
				aVisibleDimensionsRev.reverse();
				aVisibleDimensionsRev.forEach(function(dim, index, array) {

					// Check if stack entry has dimension names and if a
					// dimension is existing for this name
					if (dim.dimension.length > 0 && typeof oInnerChart.getDimensionByName(dim.dimension[dim.dimension.length - 1]) != 'undefined') {
						// show breadcrumbs
						/*if (this.getShowDrillBreadcrumbs()) {
						    this._oDrillBreadcrumbs.setVisible(true);
						}*/
						// use the last entry of each drill-stack entry to built
						// up the drill-path
						var sDimLabel = oInnerChart.getDimensionByName(dim.dimension[dim.dimension.length - 1]).getLabel();
						var sDimKey = oInnerChart.getDimensionByName(dim.dimension[dim.dimension.length - 1]).getName();

						// Set current drill position in breadcrumb control
						if (index == 0) {

							oDrillBreadcrumbs.setCurrentLocationText(sDimLabel);
						} else {

							var oCrumb = new Link({
								text: sDimLabel,
								press: function(oEvent) {
									var iLinkIndex = oDrillBreadcrumbs.indexOfLink(oEvent.getSource());

									// get drill-path which was drilled-up and needs to be removed from mdc chart
									var aCurrentDrillStack = oInnerChart.getDrillStack()[oInnerChart.getDrillStack().length - 1].dimension;
									var aDrilledPath = aCurrentDrillStack.slice(iLinkIndex + 1);

									oInnerChart.fireDeselectData(oEvent);

									// retrieve the actual items and remove them from mdc chart items aggregation
									var aNewItems = [];
									var aDrilledItems = oChart.getItemsByName(aDrilledPath);

									//Call flex to capture current state before removing item(s) of the chart aggregation
									aDrilledItems.forEach(function(oItem) {
										aNewItems.push({
											name: oItem.getKey(),
											visible: false
										});
									});

									ChartSettings._getAdaptationController(oChart).createItemChanges(aNewItems);

									// don't forget to update the bread crumbs
									// control itself
									this._updateDrillBreadcrumbs(oChart, oDrillBreadcrumbs);

								}.bind(this)
							});

							//unique dimension key is needed to remove item from mdc chart aggregation on drilling up
							oCrumb.data("key", sDimKey);

							newLinks.push(oCrumb);//note the links are added in an incorrect order need to reverse
						}
					} else {

						// Show no text on breadcrumb if stack contains only one
						// entry with no dimension at all (all dims are shown)
						if (index == 0) {
							// hide breadcrumbs
							oDrillBreadcrumbs.setVisible(false);
						}
					}
				}.bind(this));
			}

			var currLinks = oDrillBreadcrumbs.getLinks();
			newLinks.reverse();
			var diff = false;

			if (currLinks.length !== newLinks.length) {
				diff = true;
			} else {

				for (var i = 0; i < newLinks.length; i++) {
					if (newLinks[i].getText() != currLinks[i].getText()) {
						diff = true;
						break;
					}
				}
			}

			if (diff) {

				// Clear aggregation before we rebuild it
				if (oDrillBreadcrumbs.getLinks()) {
					oDrillBreadcrumbs.removeAllLinks();
				}

				for (var i = 0; i < newLinks.length; i++) {
					oDrillBreadcrumbs.addLink(newLinks[i]);
				}
			}
		}.bind(this));
	};

	return DrillStackHandler;
});
