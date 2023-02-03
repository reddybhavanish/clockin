import { EntityType, LineItem, EntitySet, NavigationPropertyPath } from "@sap-ux/vocabularies-types";
import { StableIdHelper } from "sap/fe/core/helpers";
import {
	ActionType,
	BaseManifestSettings,
	ManifestAction,
	DefaultAction,
	TableAnnotationConfiguration,
	TableControlConfiguration,
	TableManifestSettingsConfiguration,
	VisualizationConverterContext
} from "../ManifestSettings";

import {
	getNavigationProperties,
	getTargetEntityType,
	getOnlyAnnotation,
	getPVisualizationP13nMode,
	NavigationProperty
} from "./CommonConverter";

type TargetProperty = {
	entitySet: Required<EntitySet>;
	name: string;
};

const _getDeleteStatus = function(tableContext: VisualizationConverterContext): string | boolean {
	const { entityType, entitySet } = tableContext;
	const targetProperties = _getTargetProperties(tableContext),
		navigationOrCollectionName = targetProperties.name ? targetProperties.name : entityType.name,
		restrictedProperties = entitySet.annotations?.Capabilities?.NavigationRestrictions?.RestrictedProperties,
		isDeletable = targetProperties.entitySet.annotations?.Capabilities?.DeleteRestrictions?.Deletable !== false;
	if (restrictedProperties) {
		const match = restrictedProperties.find(
			property =>
				(property.NavigationProperty as NavigationPropertyPath).value === navigationOrCollectionName && property.DeleteRestrictions
		);
		if (match && match.DeleteRestrictions) {
			return match.DeleteRestrictions.Deletable as boolean;
		}
	}
	return "{= " + (isDeletable !== false) + " && ${ui>/editMode} === 'Editable'}";
};

const _getRowConfigurationProperty = function(tableContext: VisualizationConverterContext) {
	const { entityType, manifestSettings } = tableContext;
	const targetProperties = _getTargetProperties(tableContext);
	const navProperty = targetProperties.name;
	const navigationOrCollectionName = navProperty ? navProperty : entityType.name;
	var pressProperty = undefined,
		navigationTarget;
	if (manifestSettings.navigation) {
		const navigationProperty = manifestSettings.navigation[navigationOrCollectionName];
		if (navigationProperty) {
			navigationTarget = navigationProperty.display?.target;
			if (navigationTarget) {
				pressProperty =
					".handlers.onChevronPressNavigateOutBound( $controller ,'" + navigationTarget + "', ${$parameters>bindingContext})";
			} else if ((navigationTarget = navigationProperty.detail?.outbound)) {
				pressProperty =
					".handlers.onChevronPressNavigateOutBound( $controller ,'" + navigationTarget + "', ${$parameters>bindingContext})";
			} else if ((navigationTarget = navigationProperty.detail?.route)) {
				const targetEntity: Required<EntityType> =
					entityType.name === navigationOrCollectionName
						? entityType
						: getTargetEntityType(navigationOrCollectionName, entityType);
				if (targetEntity) {
					const targetAnnotations = targetProperties.entitySet.annotations;
					pressProperty =
						".routing.navigateForwardToContext(${$parameters>bindingContext}, { targetPath: '" +
						navigationOrCollectionName +
						"', editable : " +
						(targetAnnotations?.Common?.DraftRoot || targetAnnotations?.Common?.DraftNode
							? "!${$parameters>bindingContext}.getProperty('IsActiveEntity')"
							: "undefined") +
						"})"; //Need to access to DraftRoot and DraftNode !!!!!!!
				}
			}
		}
	}
	return {
		press: pressProperty,
		action: pressProperty ? "Navigation" : undefined
	};
};

const _getSelectionMode = function(tableContext: VisualizationConverterContext): string {
	const { entityType, manifestSettings, visualizationPath } = tableContext,
		selectionMode = manifestSettings.controlConfiguration?.[visualizationPath]?.tableSettings?.selectionMode || "Multi",
		targetProperties: TargetProperty = _getTargetProperties(tableContext),
		targetEntityType: Required<EntityType> = targetProperties.name
			? getTargetEntityType(targetProperties.name, entityType)
			: entityType,
		lineItemAnnotation = targetEntityType.annotations?.getAnnotation("UI")[getOnlyAnnotation(visualizationPath)],
		isDeletable = !(targetProperties.entitySet.annotations?.Capabilities?.DeleteRestrictions?.Deletable === false);
	if (lineItemAnnotation) {
		const match = lineItemAnnotation.find(
			(lineItem: any) =>
				(lineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
					(lineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" &&
						lineItem.RequiresContext &&
						(lineItem.RequiresContext === true || lineItem.RequiresContext.Bool === "true"))) &&
				!(lineItem.Inline && lineItem.Inline?.Bool !== "true")
		);
		if (match) {
			return selectionMode;
		} else if (isDeletable) {
			if (targetProperties.name) {
				return "{= ${ui>/editMode} === 'Editable' ? '" + selectionMode + "' : 'None'}";
			} else {
				return selectionMode;
			}
		}
	}
	return "None";
};

const _getTableManifestSettings = function(tableContext: VisualizationConverterContext): TableManifestSettingsConfiguration | undefined {
	const { manifestSettings, visualizationPath } = tableContext;
	return manifestSettings.controlConfiguration ? manifestSettings.controlConfiguration[visualizationPath]?.tableSettings : undefined;
};

const _getTargetProperties = function(tableContext: VisualizationConverterContext): TargetProperty {
	const { entityType, entitySet, visualizationPath } = tableContext;
	const navigationProperty: NavigationProperty = getNavigationProperties(visualizationPath, entityType);
	const name = navigationProperty.property;
	var targetEntitySet;
	if (!name) {
		targetEntitySet = entitySet;
	} else {
		targetEntitySet = name.split("/").reduce((currentEntitySet, namePart) => {
			return currentEntitySet.navigationPropertyBinding[namePart] as Required<EntitySet>;
		}, entitySet);
	}
	return { entitySet: targetEntitySet, name };
};

const _getTableActionsFromManifest = function(manifestActions: Record<string, ManifestAction> | undefined): Record<string, DefaultAction> {
	let tableActions: Record<string, DefaultAction> = {};
	for (let key in manifestActions) {
		let manifestAction: ManifestAction = manifestActions[key];
		let lastDotIndex = manifestAction.press.lastIndexOf(".");
		let tableAction: DefaultAction = {
			controlId: !manifestAction.id ? key : manifestAction.id,
			visible: manifestAction.visible === undefined ? "true" : manifestAction.visible,
			enabled: manifestAction.enabled === undefined ? "true" : manifestAction.enabled,
			handlerModule: manifestAction.press.substring(0, lastDotIndex).replace(/\./gi, "/"),
			handlerMethod: manifestAction.press.substring(lastDotIndex + 1),
			press: manifestAction.press,
			type: ActionType.Default,
			text: manifestAction.text
		};

		tableActions[key] = tableAction;
	}

	return tableActions;
};

/**
 * Get Table properties coming from annotations
 * @param {VisualizationConverterContext} [tableContext] Visualization Context
 * @returns {TableAnnotationConfiguration} table properties coming from Annotation calculation
 */
export function getTableAnnotationConfiguration(tableContext: VisualizationConverterContext): TableAnnotationConfiguration {
	const { entityType, manifestSettings, visualizationPath } = tableContext,
		navigationInfo = getNavigationProperties(visualizationPath, entityType),
		entityName: string = entityType.name,
		isEntitySet: boolean = !navigationInfo.property,
		navProperty: string = navigationInfo.property,
		navigationOrCollectionName = navProperty ? navProperty : entityType.name,
		p13nMode: string | undefined = getPVisualizationP13nMode(tableContext),
		id: string = StableIdHelper.generate([
			"fe",
			"table",
			navigationOrCollectionName,
			visualizationPath.replace(navigationOrCollectionName + "/", "")
		]);

	return {
		id: id,
		collection: "/" + entityName + (!isEntitySet ? "/" + navProperty : ""),
		navigationPath: navProperty,
		navigationOrCollectionName: navigationOrCollectionName,
		row: _getRowConfigurationProperty(tableContext),
		isEntitySet: isEntitySet,
		editMode: isEntitySet ? "Display" : "{ui>/editMode}",
		createMode: isEntitySet ? "false" : "{localUI>/createMode}",
		busy: isEntitySet ? "{ui>/busy}" : "{ui>/busyLocal/" + id + "}",
		p13nMode: p13nMode,
		show: {
			delete: isEntitySet ? undefined : _getDeleteStatus(tableContext),
			create: isEntitySet ? undefined : "{= ${ui>/editMode} === 'Editable'}"
		},
		selectionMode: _getSelectionMode(tableContext),
		autoBindOnInit: !!!isEntitySet,
		enableControlVM: manifestSettings.variantManagement === "Control" ? p13nMode : undefined,
		filterId: isEntitySet ? StableIdHelper.generate(["fe", "FilterBar", entityName]) : undefined
	};
}

/**
 * Get Table properties coming from manifest
 * @param {VisualizationConverterContext} [tableContext] Visualization Context
 * @returns {TableAnnotationConfiguration} table properties coming from Manifest Settings
 */
export function getTableManifestConfiguration(tableContext: VisualizationConverterContext): TableControlConfiguration | undefined {
	const tableManifestSettings = _getTableManifestSettings(tableContext);
	if (tableManifestSettings) {
		const quickSelectionVariant: string = JSON.stringify(tableManifestSettings.quickVariantSelection);
		return {
			quickFilter: quickSelectionVariant,
			type: tableManifestSettings.type,
			headerVisible: quickSelectionVariant && tableManifestSettings.quickVariantSelection.hideTableTitle === true ? false : true,
			enableExport: tableManifestSettings.enableExport,
			creationMode: tableManifestSettings.creationMode?.name,
			createAtEnd: tableManifestSettings.creationMode?.createAtEnd,
			disableAddRowButtonForEmptyData: tableManifestSettings.creationMode?.disableAddRowButtonForEmptyData
		};
	} else {
		return undefined;
	}
}

export function getTableActionsConfiguration(
	visualizationPath: string,
	entityType: Required<EntityType>,
	manifestSettings: BaseManifestSettings
): Record<string, DefaultAction> {
	let manifestActions = manifestSettings.controlConfiguration
		? manifestSettings.controlConfiguration[visualizationPath]?.actions
		: undefined;
	return _getTableActionsFromManifest(manifestActions);
}
