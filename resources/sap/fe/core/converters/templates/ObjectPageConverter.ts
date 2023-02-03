import {
	AnnotationTerm,
	ApplyAnnotationExpression,
	CollectionFacet,
	EntitySet,
	EntityType,
	FacetTypes,
	FieldGroup,
	PathAnnotationExpression,
	ReferenceFacet
} from "@sap-ux/vocabularies-types";
import { StableIdHelper } from "sap/fe/core/helpers";
import { AnnotationHelper, Context } from "sap/ui/model/odata/v4";
import {
	BaseSubSection,
	BindingExpression,
	ChartFacet,
	ContactFacet,
	DataFieldForAction,
	DataFieldForIntentBasedNavigationAction,
	Facet,
	FeFacetType,
	FormFacet,
	ManifestSection,
	ObjectPageManifestSettings,
	PageConverterContext,
	Placement,
	Section,
	SectionType,
	SubSection,
	SubSectionAction,
	ActionType,
	TableFacet
} from "../ManifestSettings";
import { getPresentation } from "../controls/PresentationConverter";
import ConverterUtil from "../ConverterUtil";

type ObjectPageDefinition = {
	headerSection: {
		subSection: BaseSubSection;
	};
	sections?: ManifestSection[];
};

const createFacet = (
	context: PageConverterContext,
	currentTarget: string,
	type: FeFacetType,
	facetDefinition: FacetTypes,
	parentFacetDefinition?: FacetTypes
): Facet => {
	const { entityType, manifestSettings: oManifestSettings } = context;
	var entityPath = "/" + entityType.name,
		myFacet: Facet = { type: type, annotationPath: entityPath + "/@" + currentTarget } as Facet;
	switch (type) {
		case FeFacetType.Form:
			myFacet = {
				...myFacet,
				...{
					id: getFacetID([], facetDefinition, currentTarget),
					entitySet: "/" + entityType.name,
					useFormContainerLabels: !!(parentFacetDefinition && (parentFacetDefinition as CollectionFacet).Facets),
					hasFacetsNotPartOfPreview:
						parentFacetDefinition && (parentFacetDefinition as CollectionFacet).Facets
							? (parentFacetDefinition as CollectionFacet).Facets.some(
									childFacet => childFacet.annotations?.UI?.PartOfPreview === false
							  )
							: false,
					hidden: false
				}
			} as FormFacet;
			break;
		case FeFacetType.Table:
			myFacet = {
				...myFacet,
				...{
					presentation: getPresentation(context, (facetDefinition as ReferenceFacet).Target.value)
				}
			} as TableFacet;
			break;
		case FeFacetType.HeaderContact:
			const defintion: ReferenceFacet = facetDefinition as ReferenceFacet;
			myFacet = {
				...myFacet,
				...{
					contact: myFacet.annotationPath + "/Target/$AnnotationPath",
					text: defintion.Target.$target.fn?.$target?.annotations?.Common?.Label
				}
			} as ContactFacet;
			break;
		case FeFacetType.Contact:
			myFacet = {
				...myFacet,
				...{
					text: "For Contacts Fragment"
				}
			} as ContactFacet;
			break;
		case FeFacetType.Chart:
			myFacet = {
				...myFacet,
				...{
					text: "For Chart Fragment"
				}
			} as ChartFacet;
			break;
	}
	return myFacet;
};

const getActionsFromSubSection = (
	context: PageConverterContext,
	oMetaModelContext: Context,
	facetDefinition: FacetTypes
): SubSectionAction[] => {
	const { entityType } = context;
	var actions: SubSectionAction[] = [];
	const _addActions = (_facetDefinition: FacetTypes) => {
		const buttons = getButtonsFromReferenceFacet(entityType, oMetaModelContext, _facetDefinition);
		if (buttons.length > 0) {
			actions = actions.concat(buttons);
		}
	};
	if (facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" && facetDefinition.Facets) {
		facetDefinition.Facets.forEach((nestedFacetDefinition: FacetTypes) => {
			_addActions(nestedFacetDefinition);
		});
	} else {
		_addActions(facetDefinition);
	}
	return actions;
};

const getBindingExpression = function<T>(
	annotationValue: T | PathAnnotationExpression<T> | ApplyAnnotationExpression<T> | undefined,
	currentContext: Context,
	defaultValue?: T
): BindingExpression<T> {
	if (!annotationValue) {
		return defaultValue;
	} else if (isPathExpression(annotationValue)) {
		return AnnotationHelper.format({ $Path: annotationValue.path }, { context: currentContext });
	} else {
		return AnnotationHelper.format(annotationValue, { context: currentContext });
	}
};

const getButtonsFromReferenceFacet = (
	entityType: Required<EntityType>,
	oMetaModelContext: Context,
	facetDefinition: FacetTypes
): SubSectionAction[] => {
	var buttonFacet = facetDefinition as ReferenceFacet;
	var targetAnnotationPath = buttonFacet.Target.value;
	const buttons: SubSectionAction[] = [];
	if (targetAnnotationPath && /.*com\.sap\.vocabularies\.UI\.v1\.(Identification#|FieldGroup|StatusInfo).*/.test(targetAnnotationPath)) {
		const targetAnnotation: any = buttonFacet.Target.$target;
		if (targetAnnotation) {
			const collection = (targetAnnotation as FieldGroup).Data ? targetAnnotation.Data : targetAnnotation;
			collection.forEach((field: any) => {
				if (field.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
					buttons.push({
						id: StableIdHelper.generate(["fe", "Form", { Facet: buttonFacet }, field]),
						type: ActionType.DataFieldForIntentBasedNavigation,
						text: field.Label,
						visible: field.RequiresContext
							? "true"
							: "{= ${localUI>/IBNActions/" +
							  field.SemanticObject +
							  "-" +
							  field.Action +
							  "} === undefined ? false : ${localUI>/IBNActions/" +
							  field.SemanticObject +
							  "-" +
							  field.Action +
							  "} }",
						press:
							".handlers.onDataFieldForIntentBasedNavigation($controller, '" +
							field.SemanticObject +
							"','" +
							field.Action +
							"', '" +
							JSON.stringify(field.Mapping) +
							"', undefined ," +
							field.RequiresContext +
							")"
					} as DataFieldForIntentBasedNavigationAction);
				} else if (field.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
					const action: any = entityType.actions[field.Action];
					const HiddenPath: any = field.annotations?.UI?.Hidden?.path;
					var _getEnabledBinding = (): string => {
						if (action.isBound !== true) {
							return "true";
						}
						const operationAvailable = action.annotations?.Core?.OperationAvailable;
						if (operationAvailable) {
							var bindingExpression = getBindingExpression<string>(operationAvailable, oMetaModelContext);
							if (bindingExpression) {
								/**
								 * Action Parameter is ignored by the formatter when trigger by templating
								 * here it's done manually
								 **/
								var paramSuffix = action.parameters?.[0]?.fullyQualifiedName;
								if (paramSuffix) {
									paramSuffix = paramSuffix.replace(action.fullyQualifiedName + "/", "");
									bindingExpression = bindingExpression.replace(paramSuffix + "/", "");
								}
								return bindingExpression;
							}
							return "true";
						}
						return "true";
						/*
						   FIXME Disable failing music tests
							Due to limitation on CAP the following binding (which is the good one) generates error:
									   return "{= !${#" + field.Action + "} ? false : true }";
							CAP tries to read the action as property and doesn't find it
						*/
					};

					buttons.push({
						id: StableIdHelper.generate(["fe", "Form", { Facet: buttonFacet }, field]),
						enabled: _getEnabledBinding(),
						type: ActionType.DataFieldForAction,
						text: field.Label,
						visible: HiddenPath ? "{= !%{" + HiddenPath + "}}" : "true",
						press:
							".editFlow.onCallAction('" +
							field.Action +
							"', { contexts: ${$view>/#fe::ObjectPage/}.getBindingContext(), invocationGrouping : '" +
							(field.InvocationGrouping === "UI.OperationGroupingType/ChangeSet" ? "ChangeSet" : "Isolated") +
							"', label: '" +
							field.Label +
							"', model: ${$source>/}.getModel()})"
					} as DataFieldForAction);
				}
			});
		}
	}
	return buttons;
};

const getFacetID = (stableIdParts: string[], facetDefinition: FacetTypes, currentTarget: string): string => {
	let idParts: string[] = stableIdParts.concat();
	if (facetDefinition.ID) {
		idParts.push(facetDefinition.ID as string);
	} else {
		switch (facetDefinition.$Type) {
			case "com.sap.vocabularies.UI.v1.ReferenceURLFacet":
				idParts.push(currentTarget);
				break;
			case "com.sap.vocabularies.UI.v1.ReferenceFacet":
				idParts.push(facetDefinition.Target.value);
				break;
			case "com.sap.vocabularies.UI.v1.CollectionFacet":
				idParts.push(currentTarget);
				break;
		}
	}
	return StableIdHelper.generate(idParts);
};

const getFacetRefKey = (facetDefinition: FacetTypes, fallback: string): string => {
	return facetDefinition.ID?.toString() || facetDefinition.Label?.toString() || fallback;
};

const getFacetsFromSubSection = (context: PageConverterContext, subSectionFacetDefinition: FacetTypes, currentTarget: string): Facet[] => {
	const { entityType } = context;
	const _getFinalFacets = (finalCurrentTarget: string, finalFacetDefinition: FacetTypes): Facet[] => {
		var finalFacet: Facet[] = [];
		if (finalFacetDefinition.annotations?.UI?.Hidden !== true) {
			switch (finalFacetDefinition.$Type) {
				case "com.sap.vocabularies.UI.v1.CollectionFacet":
					finalFacet.push(
						createFacet(context, `${finalCurrentTarget}`, FeFacetType.Form, finalFacetDefinition, subSectionFacetDefinition)
					);
					break;
				case "com.sap.vocabularies.UI.v1.ReferenceFacet":
					const annotationtionPath: string = finalFacetDefinition.Target.value;
					const oAnnotation: any = entityType.resolvePath(annotationtionPath);
					if (isFacetFormCompliant(finalFacetDefinition as ReferenceFacet)) {
						finalFacet.push(
							createFacet(context, finalCurrentTarget, FeFacetType.Form, finalFacetDefinition, subSectionFacetDefinition)
						);
					} else {
						const isPresentation: boolean =
							oAnnotation !== undefined &&
							/.*com\.sap\.vocabularies\.UI\.v1\.(LineItem|Presentation).*/.test(annotationtionPath);

						if (isPresentation) {
							finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Table, finalFacetDefinition));
						} else if (annotationtionPath.indexOf("com.sap.vocabularies.Communication.v1.Contact") > -1) {
							finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Contact, finalFacetDefinition));
						} else if (annotationtionPath.indexOf("com.sap.vocabularies.Communication.v1.Chart") > -1) {
							finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Chart, finalFacetDefinition));
						}
					}
					break;
				case "com.sap.vocabularies.UI.v1.ReferenceURLFacet":
					//Not currently managed
					break;
			}
		}
		return finalFacet;
	};

	if (
		subSectionFacetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" &&
		!(subSectionFacetDefinition.Facets as ReferenceFacet[]).every(isFacetFormCompliant)
	) {
		var facets: Facet[] = [];
		subSectionFacetDefinition.Facets.forEach((nestedFacetDefinition: AnnotationTerm<FacetTypes>, nestedFacetIndex: number) => {
			facets = facets.concat(_getFinalFacets(`${currentTarget}/Facets/${nestedFacetIndex}`, nestedFacetDefinition));
		});
		return facets;
	} else {
		return _getFinalFacets(currentTarget, subSectionFacetDefinition);
	}
};

const getHeaderSubSectionFacets = (context: PageConverterContext, facetDefinition: FacetTypes, currentTarget: string): Facet[] => {
	var facets: Facet[] = [];
	const _addFacet = (finalFacetDefinition: ReferenceFacet, finalCurrentTarget: string, finalParentFacetDefinition?: FacetTypes) => {
		if (finalFacetDefinition.annotations?.UI?.Hidden !== true) {
			const feFacetType =
				finalFacetDefinition.Target.$target.$Type === "com.sap.vocabularies.Communication.v1.ContactType"
					? FeFacetType.HeaderContact
					: FeFacetType.Form;
			facets.push(createFacet(context, finalCurrentTarget, feFacetType, finalFacetDefinition, finalParentFacetDefinition));
		}
	};

	if ((facetDefinition as CollectionFacet).Facets) {
		(facetDefinition as CollectionFacet).Facets?.forEach((nestedFacetDefinition: FacetTypes, nestedFacetIndex: number) => {
			_addFacet(nestedFacetDefinition as ReferenceFacet, `${currentTarget}/Facets/${nestedFacetIndex}`, facetDefinition);
		});
	} else {
		_addFacet(facetDefinition as ReferenceFacet, currentTarget);
	}
	return facets;
};

const getInverseBindingExpression = function<T>(
	annotationValue: T | PathAnnotationExpression<T> | ApplyAnnotationExpression<T> | undefined,
	currentContext: Context,
	defaultValue?: T
): BindingExpression<T> {
	if (!annotationValue) {
		return defaultValue;
	}
	const bindingExpression = getBindingExpression(annotationValue, currentContext, defaultValue);
	return `{= !$${bindingExpression}}`;
};

const getSection = (
	context: PageConverterContext,
	facetDefinition: FacetTypes,
	oMetaModelContext: Context,
	stableIdParts: string[],
	currentTarget: string
): ManifestSection => {
	const section: ManifestSection = {
		id: getFacetID(stableIdParts, facetDefinition, currentTarget),
		title: getBindingExpression<string>(facetDefinition.Label, oMetaModelContext),
		visible: getInverseBindingExpression<boolean>(facetDefinition.annotations?.UI?.Hidden, oMetaModelContext, true),
		subSections: {},
		facetType: facetDefinition.$Type,
		type: SectionType.Annotation
	};

	section.showTitle = section.title !== undefined;
	const _getSubSection = (
		subSectionFacetDefinition: FacetTypes,
		subSectionTarget: string,
		subSectionTitle: string | undefined,
		ParentSection: ManifestSection
	): SubSection => {
		const idPart: string = "FacetSubSection";
		var commonsubSection: any = {
			type: SectionType.Annotation,
			visible: ParentSection.visible
		};
		const allFacets = getFacetsFromSubSection(context, subSectionFacetDefinition, subSectionTarget);
		return {
			...{
				title: subSectionTitle,
				id: getFacetID(["fe", idPart], subSectionFacetDefinition, subSectionTarget),
				facets: allFacets,
				moreFacets: allFacets.filter(
					facetDefinition => facetDefinition.type === "Form" && (facetDefinition as FormFacet).hasFacetsNotPartOfPreview
				),
				actions: getActionsFromSubSection(context, oMetaModelContext, subSectionFacetDefinition)
			},
			...commonsubSection
		};
	};

	if (
		facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" &&
		facetDefinition.Facets.find(facetDefinition => facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet")
	) {
		// We have a Collection of Collection
		let sectionKey: string, subSection: SubSection;

		facetDefinition.Facets.forEach((subFacetDefinition: AnnotationTerm<FacetTypes>, subFacetIndex: number) => {
			subSection = _getSubSection(
				subFacetDefinition,
				`${currentTarget}/Facets/${subFacetIndex}`,
				getBindingExpression<string>(subFacetDefinition.Label, oMetaModelContext),
				section
			);
			if (sectionKey !== undefined) {
				subSection.position = { anchor: sectionKey, placement: Placement.After };
			}
			sectionKey = getFacetRefKey(subFacetDefinition, subFacetIndex.toString());
			section.subSections[sectionKey] = subSection;
		});
	} else {
		section.subSections[
			getFacetRefKey(facetDefinition, getFacetID(["fe", "Section"], facetDefinition, currentTarget))
		] = _getSubSection(facetDefinition, currentTarget, section.title, section);
	}
	return section;
};

const isFacetFormCompliant = function(facet: ReferenceFacet) {
	return facet.Target && /.*com\.sap\.vocabularies\.UI\.v1\.(FieldGroup|Identification|DataPoint|StatusInfo).*/.test(facet.Target.value);
};

const isPathExpression = function<T>(expression: any): expression is PathAnnotationExpression<T> {
	return expression.type !== undefined && expression.type === "Path";
};

const prepareSection = (section: ManifestSection | undefined | null, key: string): ManifestSection => {
	if (!section) {
		throw new Error("undefined section");
	}
	if (section.visible === undefined || section.visible === null) {
		section.visible = true;
	}
	section.showTitle = section.title !== undefined;
	if (!section.type) {
		section.type = SectionType.Default;
	}
	if (
		(section.type === SectionType.XMLFragment || section.type === SectionType.Default) &&
		(!section.subSections || !Object.keys(section.subSections).length)
	) {
		section.subSections = {
			"default": {
				...section,
				...{
					visible: true,
					showTitle: false,
					position: undefined,
					id: StableIdHelper.generate(["fe", "CustomSubSection", key])
				}
			}
		};
	}
	return section;
};

export default {
	convertPage(
		entitySet: Required<EntitySet>,
		oMetaModelContext: Context,
		oManifestSettings: ObjectPageManifestSettings,
		unaliasFn: Function
	): ObjectPageDefinition {
		const sections: Record<string, ManifestSection> = {};
		const entityType: Required<EntityType> = entitySet.entityTypeInstance as Required<EntityType>;
		const context: PageConverterContext = {
			entitySet,
			entityType,
			manifestSettings: oManifestSettings
		};
		var optionalKey: any = {};
		let sectionKey: string;
		var Headerfacets: Facet[] = [];
		if (oManifestSettings.editableHeaderContent) {
			entityType.annotations?.UI?.HeaderFacets?.forEach((facetDefinition: FacetTypes, facetIndex: number) => {
				var newFacets = getHeaderSubSectionFacets(context, facetDefinition, `${unaliasFn("UI.HeaderFacets")}/${facetIndex}`);
				if (newFacets.length > 0) {
					Headerfacets = Headerfacets.concat(newFacets);
				}
			});
			if (Headerfacets.length > 0) {
				optionalKey.headerSection = {
					subSection: {
						facets: Headerfacets
					}
				};
			}
		}

		entityType.annotations?.UI?.Facets?.forEach((facetDefinition: FacetTypes, facetIndex: number) => {
			const section: ManifestSection = getSection(
				context,
				facetDefinition,
				oMetaModelContext,
				["fe", "FacetSection"],
				`${unaliasFn("UI.Facets")}/${facetIndex}`
			);
			if (sectionKey != null) {
				section.position = { anchor: sectionKey, placement: Placement.After };
			}
			sectionKey = getFacetRefKey(facetDefinition, facetIndex.toString());
			sections[sectionKey] = section;
		});

		for (let key in oManifestSettings.content?.body?.sections) {
			let customSection: ManifestSection | undefined = oManifestSettings.content?.body?.sections[key];
			sections[key] = prepareSection(
				{ ...{ id: StableIdHelper.generate(["fe", "CustomSection", key]) }, ...sections[key], ...customSection },
				key
			);
		}

		// the "final" structure is different, e.g. resolve before/after ordering into arrays
		// TODO the final transform mechanism from the human readable form to "template ready" should happen at the very end, not here
		let parsedSections: ManifestSection[] = ConverterUtil.orderByPosition(sections)
			.filter(section => section.visible)
			.map(section => {
				((section as unknown) as Section).subSections = ConverterUtil.orderByPosition(section.subSections) as SubSection[];
				return section;
			});

		return { ...{ sections: parsedSections }, ...optionalKey };
	}
};
