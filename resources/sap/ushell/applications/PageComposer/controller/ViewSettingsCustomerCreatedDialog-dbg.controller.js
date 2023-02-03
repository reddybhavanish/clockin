// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (
    DateFormat,
    Controller,
    Filter,
    FilterOperator,
    Sorter
) {
    "use strict";

    return Controller.extend("sap.ushell.applications.PageComposer.controller.ViewSettingsDialogCustomerCreated", {
        constructor: function (PageOverviewController) {
            this.PageOverviewController = PageOverviewController;
        },

        /**
         * Applies the applicable sorters and filters for the given viewSettingsDialog confirm event.
         *
         * @param {sap.ui.base.Event} oEvent The confirm event of the viewSettingsDialog.
         *
         * @private
         */
        handleCustomerCreatedDialogConfirm: function (oEvent) {
            var mParams = oEvent.getParameters(),
                oTable = this.PageOverviewController.byId(this.PageOverviewController.sCurrentTableId),
                oBinding = oTable.getBinding("items"),
                aSorters = this.getSorters(mParams),
                mFilters = this.getFilters(mParams);

            // apply sorters
            oBinding.sort(aSorters);

            // apply filters
            this.PageOverviewController.mViewSettingsFilters[this.PageOverviewController.sCurrentTableId] = mFilters;
            this.PageOverviewController._applyCombinedFilters();

            // update filter bar
            this.PageOverviewController.byId(this.PageOverviewController.sCurrentTableId.slice(0, -5) + "InfoFilterBar")
                .setVisible(!!Object.keys(mFilters).length);
            this.PageOverviewController.byId(this.PageOverviewController.sCurrentTableId.slice(0, -5) + "InfoFilterLabel")
                .setText(mParams.filterString);
        },

        /**
         * Derives the applicable sorters for the given event parameters.
         *
         * @param {object} mParams An object containing the event parameters of the viewSettingsDialog confirm event.
         * @returns {sap.ui.model.Sorter[]} An array of sorters, that represent the currently selected sorting and grouping.
         *
         * @private
         */
        getSorters: function (mParams) {
            var aSorters = [],
                oGoupItem = mParams.groupItem;

            if (oGoupItem) {
                var sGroupPath = oGoupItem.getKey(),
                    fnSorter;

                switch (sGroupPath) {
                    case "createdOnCustomerCreated":
                    case "modifiedOn":
                        fnSorter = function (oContext) {
                            var oFormat = DateFormat.getInstance({ style: "medium" }),
                                oDate = oContext.getProperty(sGroupPath),
                                sFormatedDate = oFormat.format(oDate);
                            return {
                                key: sFormatedDate,
                                text: sFormatedDate
                            };
                        };
                        break;
                    default:
                        fnSorter = function (oContext) {
                            var sName = oContext.getProperty(sGroupPath);
                            return {
                                key: sName,
                                text: sName
                            };
                        };
                }

                aSorters.push(new Sorter(sGroupPath, mParams.groupDescending, fnSorter));
            }

            if (mParams.sortItem) {
                aSorters.push(new Sorter(mParams.sortItem.getKey(), mParams.sortDescending));
            } else {
                aSorters.push(new Sorter("modifiedOn", true));
            }

            return aSorters;
        },

        /**
         * @typedef {object} FilterMap An object that maps arrays of filters to their corresponding parent key.
         * @property {sap.ui.model.Sorter[]} An array of filters, that represent the currently selected filtering.
         */
        /**
         * Derives the applicable filters for the given event parameters.
         *
         * @param {object} mParams An object containing the event parameters of the viewSettingsDialog confirm event.
         * @returns {FilterMap} An array of filters, that represent the currently selected filtering or null of no filters
         *   were selected.
         *
         * @private
         */
        getFilters: function (mParams) {
            var mFilters = {};

            mParams.filterItems.forEach(function (oItem) {
                var sPath,
                    sOperator,
                    sValue1,
                    sValue2;

                if (oItem.getKey() === "createdOn" || oItem.getKey() === "modifiedOn") {
                    var oDateRangeSelection = oItem.getCustomControl();

                    sPath = oItem.getKey();
                    sOperator = FilterOperator.BT;
                    sValue1 = oDateRangeSelection.getDateValue();
                    sValue2 = oDateRangeSelection.getSecondDateValue();

                    if (sPath === "createdOn") {
                        this._createdOnFromFilter = sValue1;
                        this._createdOnToFilter = sValue2;
                    } else {
                        this._changedOnFromFilter = sValue1;
                        this._changedOnToFilter = sValue2;
                    }
                } else {
                    var aSplit = oItem.getKey().split("___");
                    sPath = aSplit[0];
                    sOperator = aSplit[1];
                    sValue1 = aSplit[2];
                    sValue2 = aSplit[3];
                }

                if (!mFilters[sPath]) {
                    mFilters[sPath] = [];
                }
                mFilters[sPath].push(new Filter(sPath, sOperator, sValue1, sValue2));
            }.bind(this));

            return mFilters;
        },

        /**
         * Updates the filter count for a custom viewSetting filter.
         *
         * @param {sap.ui.base.Event} oEvent The change event from the group dateRangeSelections.
         *
         * @private
         */
        handleCustomerCreatedDateRangeSelectionChanged: function (oEvent) {
            var oParameters = oEvent.getParameters(),
                oViewSetting = oParameters.id === "CustomerCreatedCreatedOnDateRangeSelection"
                    ? sap.ui.getCore().byId("CustomerCreatedCreatedOnFilter")
                    : sap.ui.getCore().byId("CustomerCreatedChangedOnFilter");

            if (oParameters.from) {
                oViewSetting.setFilterCount(1);
                oViewSetting.setSelected(true);
            } else {
                oViewSetting.setFilterCount(0);
                oViewSetting.setSelected(false);
            }
        },

        /**
         * Handles the cancel press event and resets the changes to the values of the custom viewSettings filters.
         *
         * @private
         */
        handleCustomerCreatedCancel: function () {
            var oCreatedOnFilter = sap.ui.getCore().byId("CustomerCreatedCreatedOnFilter"),
                oCreatedOnDateRangeSelection = sap.ui.getCore().byId("CustomerCreatedCreatedOnDateRangeSelection"),
                oChangedOnFilter = sap.ui.getCore().byId("CustomerCreatedChangedOnFilter"),
                oChangedOnDateRangeSelection = sap.ui.getCore().byId("CustomerCreatedChangedOnDateRangeSelection");

            if (this._createdOnFromFilter) {
                oCreatedOnFilter.setFilterCount(1);
                oCreatedOnFilter.setSelected(true);
            } else {
                oCreatedOnFilter.setFilterCount(0);
                oCreatedOnFilter.setSelected(false);
            }

            if (this._changedOnFromFilter) {
                oChangedOnFilter.setFilterCount(1);
                oChangedOnFilter.setSelected(true);
            } else {
                oChangedOnFilter.setFilterCount(0);
                oChangedOnFilter.setSelected(false);
            }

            oCreatedOnDateRangeSelection.setDateValue(this._createdOnFromFilter);
            oCreatedOnDateRangeSelection.setSecondDateValue(this._createdOnToFilter);
            oChangedOnDateRangeSelection.setDateValue(this._changedOnFromFilter);
            oChangedOnDateRangeSelection.setSecondDateValue(this._changedOnToFilter);
        },

        /**
         * Resets the custom viewSettings filter to the inital value.
         *
         * @private
         */
        handleCustomerCreatedResetFilters: function () {
            var oCreatedOnDateRangeSelection = sap.ui.getCore().byId("CustomerCreatedCreatedOnDateRangeSelection"),
                oChangedOnDateRangeSelection = sap.ui.getCore().byId("CustomerCreatedChangedOnDateRangeSelection"),
                oCreatedOnFilter = sap.ui.getCore().byId("CustomerCreatedCreatedOnFilter"),
                oChangedOnFilter = sap.ui.getCore().byId("CustomerCreatedChangedOnFilter");

            oCreatedOnDateRangeSelection.setDateValue();
            oCreatedOnDateRangeSelection.setSecondDateValue();
            oChangedOnDateRangeSelection.setDateValue();
            oChangedOnDateRangeSelection.setSecondDateValue();
            oCreatedOnFilter.setFilterCount(0);
            oCreatedOnFilter.setSelected(false);
            oChangedOnFilter.setFilterCount(0);
            oChangedOnFilter.setSelected(false);
        }
    });
});
