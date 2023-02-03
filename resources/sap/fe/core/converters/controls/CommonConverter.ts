import { EntityType, V4NavigationProperty } from "@sap-ux/vocabularies-types";
import { VisualizationConverterContext } from "../ManifestSettings";
export type NavigationProperty = {
	prefix: string;
	property: string;
};
/**
 * Get navigation properties related to an annotation
 * @param {string} [annotationPath] Relative or absolute annotation path to analyze
 * @param {Required<EntityType>} [entityType] Entitype related to current context
 * @returns {NavigationProperty} object containing navigation name and prefix
 */
export function getNavigationProperties(annotationPath: string, entityType: Required<EntityType>): NavigationProperty {
	const entityName = entityType.name;
	const navigationProperty: string = annotationPath.replace("/" + entityName + "/", "").replace(/\/?@.*/, ""); // To be improved -> Can be done with only one operation
	return {
		property: navigationProperty,
		prefix: navigationProperty ? navigationProperty + "/" : ""
	};
}

/**
 * Get annotation Name (e.g LineItem, Chart, PresentationVariant) and qualifier
 * @param {string} [relativePath] Relative annotation path to analyze
 * @returns {string} annotation name with qualifier
 */
export function getOnlyAnnotation(relativePath: string): string {
	const lastDot = relativePath.lastIndexOf(".");
	return relativePath.substr(lastDot + 1);
}

/**
 * Get human readable annotation Path and compliant with templating
 * @param {string} [absoluePath] Absolute annotation path to analyze
 * @param {Required<EntityType>} [entityType] Entitype related to current context
 * @returns {string} Absolute human readable annotation path
 */
export function getTemplateAnnotationPath(absoluePath: string, entityType: Required<EntityType>): string {
	var sTarget: string = absoluePath.substr(0, absoluePath.indexOf("@"));
	const entityFullQualifiedName = entityType.fullyQualifiedName;
	if (sTarget === entityFullQualifiedName) {
		// No navigation property
		return absoluePath.replace(entityFullQualifiedName, "/" + entityType.name + "/");
	} else {
		//Navigation Entity
		const indexNavEntiType: number = (entityType.navigationProperties as V4NavigationProperty[]).findIndex(
			x => x.targetTypeName === sTarget
		);
		const navigationProperty: V4NavigationProperty = entityType.navigationProperties[indexNavEntiType] as V4NavigationProperty;
		return "/" + entityType.name + "/" + absoluePath.replace(navigationProperty.targetTypeName, navigationProperty.name + "/");
	}
}

/**
 * Get Chart or LineItem P13nMode
 * @param {VisualizationConverterContext} [context] Visualization Context
 * @returns {string} P13nMode (separated by comma)
 */
export function getPVisualizationP13nMode(context: VisualizationConverterContext): string | undefined {
	const { visualizationPath, manifestSettings } = context;
	const isLineItem: boolean = visualizationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1;
	const isVariantManagement: boolean = !!(
		manifestSettings.variantManagement && ["Page", "Control"].indexOf(manifestSettings.variantManagement) > -1
	);
	var personalization: any = true,
		aPersonalization: string[] = [];
	if (manifestSettings.controlConfiguration?.[visualizationPath]?.tableSettings?.personalization !== undefined) {
		personalization = manifestSettings.controlConfiguration[visualizationPath].tableSettings.personalization;
	}
	if (isVariantManagement && personalization) {
		if (personalization === true) {
			return isLineItem ? "Sort,Column" : "Sort,Type,Item";
		} else if (typeof personalization === "object") {
			if (isLineItem && personalization.column) {
				aPersonalization.push("Column");
			}
			if (!isLineItem && personalization.type) {
				aPersonalization.push("Type");
			}
			if (personalization.sort) {
				aPersonalization.push("Sort");
			}
			return aPersonalization.join(",");
		}
	}
	return undefined;
}

/**
 * Get the entity Type related to a navigation property
 * @param {string} [navigationPropertyName] Navigation Property Name
 * @param {Required<EntityType>} [entityType] Entitype related to current context
 * @returns {string} entity Type related to navigation property
 */
export function getTargetEntityType(navigationPropertyName: string, entityType: Required<EntityType>): Required<EntityType> {
	const targetNavProperty = entityType.resolvePath(navigationPropertyName);
	if (targetNavProperty._type === "NavigationProperty") {
		return (targetNavProperty as V4NavigationProperty).targetType as Required<EntityType>;
	} else {
		return (entityType.navigationProperties[
			(entityType.navigationProperties as V4NavigationProperty[]).findIndex(x => x.name === navigationPropertyName)
		] as Required<V4NavigationProperty>).targetType as Required<EntityType>;
	}
}
