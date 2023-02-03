// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define([
    "sap/ui2/srvc/ODataWrapper",
    "sap/ui2/srvc/ODataService",
    "sap/ui/thirdparty/datajs",
    "sap/ui/thirdparty/jquery",
    "sap/base/Log",
    "sap/ushell/resources"
], function (ODataWrapper, ODataService, OData, jQuery, Log, resources) {
    "use strict";

    /**
     *
     * @returns {sap.ushell_abap.adapters.abap.UserInfoAdapter}
     * @private
     */

    var oDataWrapper;

    var DEFAULT_LANGUAGE_KEY = "default";

    return function () {

        this._updateODataObjectBasedOnDatatype = function (oValue, oDataObj) {
            if (jQuery.type(oValue) === "string") {
                oDataObj.value = oValue.toString();
                oDataObj.dataType = "Edm.String";
            }
            if (jQuery.type(oValue) === "boolean") {
                oDataObj.value = oValue.toString();
                oDataObj.dataType = "Edm.Boolean";
            }
            return oDataObj;
        };

        /**
         * Returns the list of themes available for the user.
         * In case of success, the <code>done</code> function returns an 'anonymous' object
         * representing the list of themes.
         * In case of failure, the <code>fail</code> function of the jQuery.promise object is called.
         *
         * @returns {object}
         *  jQuery.promise object.
         */
        this.getThemeList = function () {
            var oDeferred = new jQuery.Deferred(),
                sUri = "/sap/opu/odata/UI2/INTEROP/Themes";

            // read semantic objects from interop service
            OData.read({requestUri: sUri},
                // sucess
                function (oData, oResponse) {
                    var i,
                        themes = [];

                    for (i = 0; i < oData.results.length; i = i + 1) {
                        themes.push(oData.results[i]);
                    }
                    oDeferred.resolve({
                        options: themes
                    });
                },
                // fail
                function (oError) {
                    Log.error(oError.message, null, "sap.ushell_abap.adapters.abap.UserInfoAdapter");
                    oDeferred.reject(oError.message);
                });

            return oDeferred.promise();
        };

        /**
         * Returns the list of available language for the user.
         * In case of success, the <code>done</code> return array of languages
         * In case of failure, the <code>fail</code> error message
         *
         * @returns {object}
         *  jQuery.promise object.
         */
        this.getLanguageList = function () {
            var oDeferred = new jQuery.Deferred(),
                sUri = encodeURI("/sap/opu/odata/UI2/INTEROP/UserProfilePropertyValues?$filter=id eq 'PREFERRED_LOGON_LANGUAGE'");

            // read semantic objects from interop service
            OData.read({requestUri: sUri},
                // sucess
                function (oData) {
                    var aResult = [{
                        "text": resources.i18n.getText("userSettings.browserLanguage"),
                        "key": DEFAULT_LANGUAGE_KEY
                    }];
                    var aLanguageListFromServer = oData.results.map(function (oLanguage) {
                        return {
                            "text": oLanguage.description,
                            "key": oLanguage.value
                        };
                    }).sort(function (oLanguage1, oLanguage2) {
                        return oLanguage1.text.localeCompare(oLanguage2.text);
                    });

                    aResult = aResult.concat(aLanguageListFromServer);
                    oDeferred.resolve(aResult);
                },
                // fail
                function (oError) {
                    Log.error(oError.message, null, "sap.ushell_abap.adapters.abap.UserInfoAdapter");
                    oDeferred.reject(oError.message);
                });

            return oDeferred.promise();
        };

        this._createWrapper = function (sBaseUrl) {
            return sap.ui2.srvc.createODataWrapper(sBaseUrl, false, function (sError) { /*default error handler*/ });
        };

        /**
         * Sends the updated user attributes to the adapter.
         * In case of success, the <code>done</code> function returns nothing.
         * In case of failure, the <code>fail</code> function of the jQuery.promise object is called.
         *
         *  @returns {object}
         *  jQuery.promise object
         */
        this.updateUserPreferences = function (oUser) {
            var that = this,
                oDeferred,
                sRelativeUrl,
                aUserChangedProperties,
                iODataRequestsRunning,
                oDataObj,
                fnSuccess = function () {
                    iODataRequestsRunning -= 1;
                    if (iODataRequestsRunning === 0) {
                        oDeferred.resolve();
                    }
                },
                fnFailure = function (sErrorMessage) {
                    oDeferred.reject(sErrorMessage);
                };

            oDataWrapper = this._createWrapper("/sap/opu/odata/UI2/INTEROP/");
            oDeferred = new jQuery.Deferred();

            // prepare
            oDataWrapper.openBatchQueue();

            // put the preferences to update in the OData batch queue
            aUserChangedProperties = oUser.getChangedProperties() || [];
            iODataRequestsRunning = aUserChangedProperties.length;
            aUserChangedProperties.forEach(function (oUserChangedProperty) {
                var name = oUserChangedProperty.name,
                    newValue = oUserChangedProperty.newValue;
                if (name.toUpperCase() === "LANGUAGE") {
                    name = "PREFERRED_LOGON_LANGUAGE";
                    newValue = newValue === DEFAULT_LANGUAGE_KEY ? undefined : newValue;
                }
                sRelativeUrl = "UserProfileProperties(" + [
                    "id='" + name + "'",
                    "shellType='FLP')"
                ].join(",");

                // the preference to update
                oDataObj = {
                    id: name,
                    shellType: "FLP",
                    value: newValue
                };
                //check for the datatype of the value & process oDataObj
                that._updateODataObjectBasedOnDatatype(newValue, oDataObj);
                oDataWrapper.put(sRelativeUrl, oDataObj, fnSuccess, fnFailure);
            });

            // submit
            oDataWrapper.submitBatchQueue(function () {
                // request accepted but does not mean that the single requests
                // have been successfully resolved - see above
                if (iODataRequestsRunning === 0) {
                    oDeferred.resolve();
                }
            }, fnFailure);

            return oDeferred.promise();
        };

    };
}, true /* bExport */);