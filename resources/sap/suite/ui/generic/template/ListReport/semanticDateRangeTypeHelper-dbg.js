/**
 * This helper class contains methods used during the time of component creation (before the actual view is created)
 * and also some methods used while templating.
 * This is only so that all methods pertaining to the support of dateSettings be in one place.
 */
sap.ui.define(["sap/base/util/isEmptyObject"], function (isEmptyObject) {
	"use strict";
	/**
	 * This function returns the metadata for dateSettings defined inside filterSettings in Manifest
	 * @returns {object} dateSettings metadata
	 */
	function getDateSettingsMetadata() {
		var oMetadata = {
			type: "object",
			useDateRange: {
				type: "boolean",
				defaultValue: false
			},
			selectedValues: {
				type: "string",
				defaultValue: ""
			},
			exclude: {
				type: "boolean",
				defaultValue: true
			},
			customDateRangeImplementation: {
				type: "string",
				defaultValue: ""
			},
			fields: {
				type: "object"
			}
		};
		return oMetadata;
	}

	/**
	 * METHODS USED FOR SETTING TEMPLATE SPECIFIC PARAMETERS WHILE COMPONENT IS CREATED STARTS HERE
	 */

	/**
	 * This function returns the object mapping date properties in the entity type to their settings.
	 * Also updates the allControlConfiguration to include date properties not present in selection field.
	 * @param {object} oLrSettings LR specific settings
	 * @param {object} oLeadingEntityType EntityType Object
	 * @return {object} Mapping of date properties to their settings
	 */
	function setSemanticDateRangeSettingsForDateProperties(oLrSettings, oLeadingEntityType) {
		var oDatePropertiesSettings = {};
		if (oLrSettings.filterSettings && oLrSettings.filterSettings.dateSettings) {
			var aDateProperties = getDatePropertiesFromEntitySet(oLeadingEntityType);
			oDatePropertiesSettings = getSettingsForDateProperties(aDateProperties, oLrSettings.filterSettings.dateSettings);
			if (oLrSettings.filterSettings.dateSettings.hasOwnProperty("useDateRange")) {
				if (oLrSettings.filterSettings.dateSettings.useDateRange && !isEmptyObject(oDatePropertiesSettings)) {
					throw new Error("Setting 'useDateRange' property as True and maintaining property level configuration for date ranges in Date Settings are mutually exclusive, resulting in error. Change one of these settings in manifest.json as per your requirement.");
				}
				oDatePropertiesSettings.useDateRange = oLrSettings.filterSettings.dateSettings.useDateRange;
			}
			oLrSettings.allControlConfiguration = getAllControlConfiguration(aDateProperties, oLrSettings.allControlConfiguration, oDatePropertiesSettings);
		}
		return oDatePropertiesSettings;
	}
	/**
	 * This function checks if a give property is eligible to be treated as a semantic date range.
	 * @param {object} oProperty indicates whether the property should be part of filter bar or not
	 * @return {boolean} Indicates if a given property is eligible to be treated as a semantic date range
	 */
	function isDateRange(oProperty) {
		return (((oProperty.type === "Edm.DateTime" && oProperty["sap:display-format"] === "Date") || (oProperty.type === "Edm.String" && oProperty["com.sap.vocabularies.Common.v1.IsCalendarDate"] && oProperty["com.sap.vocabularies.Common.v1.IsCalendarDate"].Bool === "true")) && oProperty["sap:filter-restriction"] === "interval");
	}
	/**
	 * This function returns an array of all Date properties from the filterbar entityType
	 * @param {object} oFilterBarEntityType EntityType Object
	 * @return {array} Array of all Date Properties
	 */
	function getDatePropertiesFromEntitySet(oFilterBarEntityType) {
		var aProperties = oFilterBarEntityType.property,
			aDateProperties = [];
		for (var i = 0; i < aProperties.length; i++) {
			var oDatePropertyPath = {};
			if (isDateRange(aProperties[i])) {
				oDatePropertyPath.PropertyPath = aProperties[i].name;
			}
			if (!isEmptyObject(oDatePropertyPath)) {
				aDateProperties.push(oDatePropertyPath);
			}
		}
		return aDateProperties;
	}
	/**
	 * This function returns the union of all selection fields and date properties
	 * @param {array} aDateProperties Array of all date properties
	 * @param {array} aSelectionFieldProperties Array of all selectionFields
	 * @param {array} oDatePropertiesSettings All date properties that have custom date settings
	 * @return {array} Union of the two arrays passed
	 */
	function getAllControlConfiguration(aDateProperties, aSelectionFieldProperties, oDatePropertiesSettings) {
		for (var i = 0; i < aDateProperties.length; i++) {
			if (oDatePropertiesSettings[aDateProperties[i].PropertyPath]) {
				var bIsDatePropertyInSelectionField = false;
				for (var j = 0; j < aSelectionFieldProperties.length; j++) {
					if (aSelectionFieldProperties[j].PropertyPath === aDateProperties[i].PropertyPath) {
						bIsDatePropertyInSelectionField = true;
						break;
					}
				}
				if (!bIsDatePropertyInSelectionField) {
					aDateProperties[i].bNotPartOfSelectionField = true;
					aSelectionFieldProperties.push(aDateProperties[i]);
				}
			}
		}
		return aSelectionFieldProperties;
	}
	/**
	 * This function returns the object mapping date properties in the entity type to their settings.
	 * @param {array} aDateProperties Array of all date properties
	 * @param {object} oDateSettingsFromManifest Date settings from the manifest
	 * @return {object} Mapping of date properties to their settings
	 */
	function getSettingsForDateProperties(aDateProperties, oDateSettingsFromManifest) {
		var mDatePropertiesResult = {};
		for (var i = 0; i < aDateProperties.length; i++) {
			if (oDateSettingsFromManifest.fields && oDateSettingsFromManifest.fields[aDateProperties[i].PropertyPath]) {
				mDatePropertiesResult[aDateProperties[i].PropertyPath] = constructConditionTypeForDateProperties(oDateSettingsFromManifest.fields[aDateProperties[i].PropertyPath]);
			} else {
				if (oDateSettingsFromManifest.customDateRangeImplementation || oDateSettingsFromManifest.selectedValues) {
					mDatePropertiesResult[aDateProperties[i].PropertyPath] = constructConditionTypeForDateProperties(oDateSettingsFromManifest);
				}
			}
		}
		return mDatePropertiesResult;
	}
	/**
	 * This function returns the condition types for date properties
	 * @param {object} oDateRangeTypeConfiguration The manifest configuration for each date property
	 * @return {string} Group ID value
	 */
	function constructConditionTypeForDateProperties(oDateRangeTypeConfiguration) {
		var sConitionType;
		if (oDateRangeTypeConfiguration.customDateRangeImplementation) {
			sConitionType = oDateRangeTypeConfiguration.customDateRangeImplementation;
		} else if (oDateRangeTypeConfiguration.selectedValues) {
			sConitionType = JSON.stringify({
				module: 'sap.ui.comp.config.condition.DateRangeType',
				operations: {
					filter: [{
						path: 'key',
						contains: oDateRangeTypeConfiguration.selectedValues,
						exclude: (oDateRangeTypeConfiguration.exclude !== undefined) ? oDateRangeTypeConfiguration.exclude : true
					}]
				}
			});
		}
		return sConitionType;
	}

	/**
	 * METHODS USED FOR TEMPLATING STARTS HERE
	 */

	/**
	 * This function returns if the controlConfiguration properties are Date or not.
	 * @param {string} sSelectionFieldName The control configuration property
	 * @param {object} mDateSettings Object mapping all date properties to their condition types
	 * @returns {boolean} indicates if mentioned property is there in oDateSettings
	 */
	function isDateRangeType(sSelectionFieldName, mDateSettings) {
		return mDateSettings.hasOwnProperty(sSelectionFieldName);
	}
	/**
	 * This function returns the condition types for date properties.
	 * @param {string} sSelectionFieldName The control configuration property
	 * @param {object} mDateSettings Object mapping all date properties to their condition types
	 * @return {string} The condition type string to be set while templating
	 */
	function getConditionTypeForDateProperties(sSelectionFieldName, mDateSettings) {
		return mDateSettings[sSelectionFieldName];
	}
	return {
		getDateSettingsMetadata: getDateSettingsMetadata,
		setSemanticDateRangeSettingsForDateProperties: setSemanticDateRangeSettingsForDateProperties,
		isDateRangeType: isDateRangeType,
		getConditionTypeForDateProperties: getConditionTypeForDateProperties
	};
}, /* bExport= */ true);
