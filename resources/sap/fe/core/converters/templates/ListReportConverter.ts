import { EntitySet, EntityType } from "@sap-ux/vocabularies-types";
import { BaseManifestSettings, PageConverterContext, PresentationConfiguration } from "../ManifestSettings";
import { Context } from "sap/ui/model/odata/v4";
import { getPresentation } from "../controls/PresentationConverter";

export type ListReportDefinition = {
	presentation?: PresentationConfiguration;
	selectionFields?: string[];
};

export default {
	convertPage(
		entitySet: Required<EntitySet>,
		oMetaModelContext: Context,
		oManifestSettings: BaseManifestSettings,
		unaliasFn: Function
	): ListReportDefinition {
		const entityType = entitySet.entityTypeInstance as Required<EntityType>;
		const context: PageConverterContext = {
			entitySet,
			entityType,
			manifestSettings: oManifestSettings
		};

		//Currently, on ListReport, only default LineItem or PresentationVariant is authorized (without qualifier)
		const presentationAnnotationPath: string = entityType.annotations?.UI?.PresentationVariant
			? "@com.sap.vocabularies.UI.v1.PresentationVariant"
			: "@com.sap.vocabularies.UI.v1.LineItem";
		const presentation: PresentationConfiguration | undefined = getPresentation(context, presentationAnnotationPath);

		return {
			presentation: presentation
		};
	}
};
