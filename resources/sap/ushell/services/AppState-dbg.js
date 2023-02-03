// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview
 * The Unified Shell's AppState service provides read and write access to a cross user storage driven by a generated key.
 * This is *not* an application facing service, but for Shell Internal usage.
 * This service should be accessed by the application via the CrossApplicationNavigation service.
 *
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/services/_AppState/WindowAdapter",
    "sap/ushell/services/_AppState/SequentializingAdapter",
    "sap/ushell/services/_AppState/AppState",
    "sap/ushell/services/_AppState/Sequentializer",
    "sap/ushell/services/_AppState/AppStatePersistencyMethod",
    "sap/ushell/utils",
    "sap/ui/thirdparty/jquery"
], function (
    WindowAdapter,
    SequentializingAdapter,
    AppStateAppState,
    Sequentializer,
    AppStatePersistencyMethod,
    utils,
    jQuery
) {
    "use strict";

    /**
     * Returns whether transient AppState is enabled by configuration.
     *
     * @param {object} oConfig The configuration for the AppState service.
     * @return {boolean} Whether transient app state is enabled in the configuration.
     *   Defaults to <code>true</code> if no configuration is specified.
     * @private
     */
    function getConfiguredTransientOption (oConfig) {
        return utils.isDefined(oConfig) && utils.isDefined(oConfig.transient)
            ? !!oConfig.transient
            : true; // default
    }

    // Determines the allowed number of saved application states in the JavaScript window object

    /**
     * The Unified Shell's AppState service
     * This method MUST be called by the Unified Shell's container only, others
     * MUST call <code>sap.ushell.Container.getService("AppState")</code>.
     * Constructs a new instance of the AppState service.
     *
     * The AppState service allows to serialize non-sensitive application state in a  bookmarkable and sharable manner
     * Data stored under the generated key is stored on the Frontend-Server.
     * It is accessible by anyone with a Fiori Account and knowledge of the keys.
     *
     * Note:
     * Carefully respect the Securityguidelines before deciding to make use of the appstate.
     * Assure no sensitive data is serialized in it.
     * This is also relevant for data put into the url (hash/fragment part) which may be compacted and thus end up in an AppState
     *
     * Sensitive data must be serialized on the application server and protected by application specific means
     * (e.g. SAP authority checks) there.
     * Only respective "neutral keys" with no significance to an attacker may be put into the Appstate or url.
     *
     * The AppState object may not contain any sensitive or security critical data, as it is shared and accessible by any user
     *
     * Internal: The service allows setting certain members into the WindowAdapter
     * via configuration members initialAppState or initialAppStatesPromise, see below.
     *
     * @param {object} oAdapter The service adapter for the AppState service, as already provided by the container
     * @param {object} oContainerInterface interface
     * @param {string} sParameter Service instantiation
     * @param {object} oConfig service configuration. A configuration object which may contain service configuration
     *   <code>
     *   { config : { transient : false } }
     *   </code>
     *   The 'transient' property controls whether app state data is only kept in the browser memory (default) or stored in the database.
     *   Note that persistency might not be supported by the respective FLP platform implementation.
     *   <br>
     *   Additionally initial app state data might be passed at runtime in the configuration object in the format:
     *     <code>
     *     {
     *       config : {
     *         initialAppState : {
     *           <Key> : JSON.stringify(<content>),
     *           <Key2> : JSON.stringify(<content>),
     *           ...
     *         }
     *     }
     *     </code>
     *   Alternatively, it may contain an thenable (ES6 Promise) as member
     *   <code>{ config : { initialAppStatesPromise : <promise> } }</code>
     *   which, when resolved will return a intitial AppState map
     *   <code>
     *   {
     *     <Key> : JSON.stringify(<content>),
     *     <Key2> : JSON.stringify(<content>),
     *     ...
     *   }
     *   </code>
     *   as first argument.
     * @private
     * @constructor
     * @class
     * @see sap.ushell.services.Container#getService
     * @since 1.28.0
     */
    function AppState (oAdapter, oContainerInterface, sParameter, oConfig) {
        // CAUTION: the 'config' object is contained inside oConfig passed by the container
        this._oConfig = oConfig && oConfig.config;
        this._sSessionKey = "";
        this._oAdapter = new SequentializingAdapter(oAdapter);
        this._oAdapter = new WindowAdapter(this, this._oAdapter, oConfig);
    }

    /**
     * Method to obtain a session key
     *
     * @returns {string} session key
     * @private
     * @since 1.28.0
     */
    AppState.prototype._getSessionKey = function () {
        if (!this._sSessionKey) {
            this._sSessionKey = this._getGeneratedKey();
        }
        return this._sSessionKey;
    };

    /**
     * Factory method to obtain an AppState object
     *
     * Note: The AppState object may not contain any sensitive or security critical data, as it is shared and accessible by any user
     *
     * @param {string} sKey Identifies the container. The string length is restricted to 40 characters.
     * @returns {object} Promise object whose done function returns an unmodifiable
     *   {@link sap.ushell.services.AppState.AppState} object as parameter.
     *   The object's getData method can be used to retrieve the data synchronously.
     * @private Usage by other shell services (CrossApplicationNavigation) only!
     * @since 1.28.0
     */
    AppState.prototype.getAppState = function (sKey) {
        var oDeferred = new jQuery.Deferred(),
            that = this,
            oAppState;
        this._loadAppState(sKey).done(function (sKey, sData, iPersistencyMethod, oPersistencySettings) {
            oAppState = new AppStateAppState(that, sKey, false, sData, undefined, undefined, undefined, iPersistencyMethod, oPersistencySettings);
            oDeferred.resolve(oAppState);
        }).fail(function (/*sMsg*/) {
            oAppState = new AppStateAppState(that, sKey);
            oDeferred.resolve(oAppState);
        });
        return oDeferred.promise();
    };

    /**
     * Method to obtain a generated key
     *
     * All AppState containers start with the prefix AS
     *
     * @returns {string} generated key
     * @private
     * @since 1.28.0
     */
    AppState.prototype._getGeneratedKey = function () {
        var s = sap.ushell.Container.getService("Personalization").getGeneratedKey();
        s = ("AS" + s).substring(0, 40);
        return s;
    };

    /**
     * Factory method to obtain an empty data context object.
     * When data is present in a prior context, this is not relevant
     * (e.g. when using a "uniquely" generated key and planning to overwrite any colliding front-end server data).
     *
     * The call always returns a cleared container.
     *
     * Note that an existing container at the front-end server is not actually deleted or overwritten unless a save operation is executed.
     *
     * Note: The AppState object may not contain any sensitive or security critical data, as it is shared and accessible by any user
     *
     * @param {object} oComponent A SAP UI5 Component, mandatory. An initial object is returned.
     * @param {object} bTransient A transient appstate is not persisted on the backend,
     *   it is only used during generating a new internal appstate during target resolution
     * @returns {object} promise. The promise's done function returns a {@link sap.ushell.services.AppState.AppState} object as parameter.
     *   The returned AppState object is mutable.
     * @private Only ushell internal usage
     * @since 1.28.0
     */
    AppState.prototype.createEmptyAppState = function (oComponent, bTransient, iPersistencyMethod, oPersistencySettings) {
        var sKey = this._getGeneratedKey(),
            oAppState,
            sAppName = "",
            sACHComponent = "",
            bUseTransientAppState = utils.isDefined(bTransient)
                ? bTransient
                : getConfiguredTransientOption(this._oConfig);


        if (iPersistencyMethod !== undefined && !this.isPersistencyMethodSupported(iPersistencyMethod)) {
            iPersistencyMethod = undefined;
            oPersistencySettings = undefined;
        }

        if (oComponent) {
            if (!(oComponent instanceof sap.ui.core.UIComponent)) {
                throw new Error("oComponent passed must be a UI5 Component");
            }
            if (oComponent.getMetadata && oComponent.getMetadata() && typeof oComponent.getMetadata().getName === "function") {
                sAppName = oComponent.getMetadata().getName() || "";
            }
            if (!sAppName && oComponent.getMetadata && oComponent.getMetadata().getComponentName) {
                sAppName = oComponent.getMetadata().getComponentName();
            }
            if (oComponent.getMetadata && oComponent.getMetadata() &&
                typeof oComponent.getMetadata().getManifest === "function" &&
                typeof oComponent.getMetadata().getManifest() === "object" &&
                typeof oComponent.getMetadata().getManifest()["sap.app"] === "object") {
                sACHComponent = oComponent.getMetadata().getManifest()["sap.app"].ach || "";
            }
        }

        if (bUseTransientAppState === true) {
            iPersistencyMethod = oPersistencySettings = undefined;
        } else if (iPersistencyMethod === undefined && this.isPersistencyMethodSupported(AppStatePersistencyMethod.PersonalState)) {
            iPersistencyMethod = AppStatePersistencyMethod.PersonalState;
            oPersistencySettings = undefined;
        }

        oAppState = new AppStateAppState(this, sKey, true, undefined, sAppName, sACHComponent, bUseTransientAppState, iPersistencyMethod, oPersistencySettings);
        return oAppState;
    };

    /**
     * Factory method to obtain an empty data context object which is unmodifiable.
     * This is used if no valid key is present.
     * A new generated key is constructed.
     *
     * @param {object} oComponent A SAP UI5 Component, mandatory. An initial object is returned.
     * @returns {object} An unmodifiable container
     * @private
     * @since 1.28.0
     */
    AppState.prototype.createEmptyUnmodifiableAppState = function (/*oComponent*/) {
        var sKey = this._getGeneratedKey(),
            oAppState;
        oAppState = new AppStateAppState(this, sKey, false);
        return oAppState;
    };


    /**
     * Method to save an application state
     *
     * Note: The AppState object many not contain any sensitive or security critical data, as it is shared and accessible by any user
     *
     * @param {string} sKey Application state key
     * @param {string} sData Application state data
     * @param {string} sAppName Application name
     * @param {string} sComponent ui5 component name
     * @param {boolean} bTransient true indicates data should only be stored in the window
     * @returns {object} promise
     * @private
     * @since 1.28.0
     */
    AppState.prototype._saveAppState = function (sKey, sData, sAppName, sComponent, bTransient, iPersistencyMethod, oPersistencySettings) {
        var sSessionKey = this._getSessionKey(),
            bUseTransientAppState = utils.isDefined(bTransient)
                ? bTransient
                : getConfiguredTransientOption(this._oConfig);

        if (bUseTransientAppState) {
            iPersistencyMethod = undefined;
            oPersistencySettings = undefined;
        } else if (iPersistencyMethod != undefined) {
            if (!this.isPersistencyMethodSupported(iPersistencyMethod)) {
                if (this.isPersistencyMethodSupported(AppStatePersistencyMethod.PersonalState)) {
                    iPersistencyMethod = AppStatePersistencyMethod.PersonalState;
                } else {
                    iPersistencyMethod = undefined;
                }
                oPersistencySettings = undefined;
            }
        }

        return this._oAdapter.saveAppState(sKey, sSessionKey, sData, sAppName, sComponent, bUseTransientAppState, iPersistencyMethod, oPersistencySettings);
    };

    /**
     * Method to load an application state
     *
     * @param {string} sKey Application State key
     * @returns {object} promise
     * @private
     * @since 1.28.0
     */
    AppState.prototype._loadAppState = function (sKey) {
        return this._oAdapter.loadAppState(sKey);
    };

    /**
     * Method to delete an application state
     *
     * @param {string} sKey Application State key
     * @returns {object} promise
     * @private
     * @since 1.69.0
     */
    AppState.prototype.deleteAppState = function (sKey) {
        return this._oAdapter.deleteAppState(sKey);
    };

    /**
     * Method to get a sequentializer object
     * (For testing only)
     *
     * @returns {object} Sequentializer
     * @private
     */
    AppState._getSequentializer = function () {
        return new Sequentializer();
    };

    /**
     * Method to get an array of sap.ushell.services.AppStatePersistencyMethod.
     *
     * @returns {array} Returns an array of sap.ushell.services.AppStatePersistencyMethod.
     *   An empty array indicates that the platform does not support persistent states.
     * @private
     * @since 1.69.0
     */
    AppState.prototype.getSupportedPersistencyMethods = function () {
        if (this._oAdapter.getSupportedPersistencyMethods) {
            return this._oAdapter.getSupportedPersistencyMethods();
        }

        return [];
    };

    /**
     * Method to check if the platform supports a specific persistancy method
     *
     * @param {string} the persistency method
     * @returns {boolean} true if the method supported or through if not
     * @since 1.69.0
     * @private
     *
     */
    AppState.prototype.isPersistencyMethodSupported = function (sPersistencyMethod) {
        var aSupportedMethods = this.getSupportedPersistencyMethods();

        if (aSupportedMethods.length > 0 && sPersistencyMethod !== undefined) {
            return (aSupportedMethods.indexOf(sPersistencyMethod) >= 0);
        } else {
            return false;
        }
    };

    /**
     * Method to set or modify the persistency method of a state identified by key
     *
     * @param sKey - the AppState key
     * @param iPersistencyMethod - The chosen persistency method
     * @param oPersistencySettings - The additional settings PersistencySettings
     */
    AppState.prototype.makeStatePersistent = function (sKey, iPersistencyMethod, oPersistencySettings) {
        var oDeferred = new jQuery.Deferred(),
            that = this;

        //gate keeper - if the platform did not implement yet the new persistency mechanism
        //with different persistency method types, no action should be taken, we simply
        //return a resolved promise and do not write any error
        if (this.getSupportedPersistencyMethods().length === 0) {
            return oDeferred.resolve().promise();
        }

        if (this.isPersistencyMethodSupported(iPersistencyMethod)) {
            that.getAppState(sKey).done(function (oAppState) {
                //check if current state equals to the desire state (in order not to perform unneccesary transaction to the DB
                if (oAppState._iPersistencyMethod !== iPersistencyMethod) {
                    oAppState.bTransient = false;
                    oAppState._iPersistencyMethod = iPersistencyMethod;
                    oAppState._oPersistencySettings = oPersistencySettings;

                    that._saveAppState(sKey, oAppState._sData, oAppState._sAppName,
                        oAppState._sACHComponent, false, iPersistencyMethod, oPersistencySettings)
                        .done(function () {
                            oDeferred.resolve();
                        })
                        .fail(function (sMsg) {
                            oDeferred.reject(sMsg);
                        });
                } else {
                    //The user will get a resolve function although no transaction to backend was needed
                    oDeferred.resolve();
                }
            });
        } else {
            oDeferred.reject("AppState.makeStatePersistent - adapter does not support persistence method: " + iPersistencyMethod);
        }

        return oDeferred.promise();
    };

    AppState.WindowAdapter = WindowAdapter;

    AppState.hasNoAdapter = false;
    return AppState;
}, true /* bExport */);
