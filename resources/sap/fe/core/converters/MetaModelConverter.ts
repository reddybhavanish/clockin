import {
	Action,
	Annotation,
	AnnotationList,
	AnnotationRecord,
	EntityType,
	Expression,
	ParserOutput,
	Property,
	ReferentialConstraint,
	V4NavigationProperty,
	EntitySet
} from "@sap-ux/vocabularies-types";
import templateConverter from "./templates/index";
// This file is retrieved from @sap-ux/annotation-converter, shared code with tool suite
import { AnnotationConverter } from "sap/fe/core/converters/common";
import { BaseManifestSettings, ObjectPageManifestSettings } from "./ManifestSettings";
import { VOCABULARY_ALIAS } from "./Constants";
import { ODataMetaModel } from "sap/ui/model/odata/v4";

enum TemplateConverter {
	ListReport = "ListReport",
	ObjectPage = "ObjectPage"
}

type MetaModelAction = {
	$kind: "Action";
	$IsBound: boolean;
	$EntitySetPath: string;
	$Parameter: {
		$Type: string;
		$Name: string;
		$Nullable?: boolean;
		$MaxLength?: number;
		$Precision?: number;
		$Scale?: number;
	}[];
	$ReturnType: {
		$Type: string;
	};
};

const MetaModelConverter = {
	parsePropertyValue(annotationObject: any, propertyKey: string, currentTarget: string, annotationsLists: any[]): any {
		let value;
		let currentPropertyTarget: string = currentTarget + "/" + propertyKey;
		if (typeof annotationObject === "string") {
			value = { type: "String", String: annotationObject };
		} else if (typeof annotationObject === "boolean") {
			value = { type: "Bool", Bool: annotationObject };
		} else if (typeof annotationObject === "number") {
			value = { type: "Int", Int: annotationObject };
		} else if (Array.isArray(annotationObject)) {
			value = {
				type: "Collection",
				Collection: annotationObject.map((subAnnotationObject, subAnnotationObjectIndex) =>
					this.parseAnnotationObject(
						subAnnotationObject,
						currentPropertyTarget + "/" + subAnnotationObjectIndex,
						annotationsLists
					)
				)
			};
			if (annotationObject.length > 0) {
				if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
					(value.Collection as any).type = "PropertyPath";
				} else if (annotationObject[0].hasOwnProperty("$Path")) {
					(value.Collection as any).type = "Path";
				} else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
					(value.Collection as any).type = "NavigationPropertyPath";
				} else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
					(value.Collection as any).type = "AnnotationPath";
				} else if (annotationObject[0].hasOwnProperty("$Type")) {
					(value.Collection as any).type = "Record";
				} else if (typeof annotationObject[0] === "object") {
					// $Type is optional...
					(value.Collection as any).type = "Record";
				} else {
					(value.Collection as any).type = "String";
				}
			}
		} else if (annotationObject.$Path !== undefined) {
			value = { type: "Path", Path: annotationObject.$Path };
		} else if (annotationObject.$Decimal !== undefined) {
			value = { type: "Decimal", Decimal: parseFloat(annotationObject.$Decimal) };
		} else if (annotationObject.$PropertyPath !== undefined) {
			value = { type: "PropertyPath", PropertyPath: annotationObject.$PropertyPath };
		} else if (annotationObject.$NavigationPropertyPath !== undefined) {
			value = {
				type: "NavigationPropertyPath",
				NavigationPropertyPath: annotationObject.$NavigationPropertyPath
			};
		} else if (annotationObject.$AnnotationPath !== undefined) {
			value = { type: "AnnotationPath", AnnotationPath: annotationObject.$AnnotationPath };
		} else if (annotationObject.$EnumMember !== undefined) {
			value = {
				type: "EnumMember",
				EnumMember:
					this.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
			};
		} else if (annotationObject.$Type) {
			value = {
				type: "Record",
				Record: this.parseAnnotationObject(annotationObject, currentTarget, annotationsLists)
			};
		}

		return {
			name: propertyKey,
			value
		};
	},
	mapNameToAlias(annotationName: string): string {
		let [pathPart, annoPart] = annotationName.split("@");
		if (!annoPart) {
			annoPart = pathPart;
			pathPart = "";
		} else {
			pathPart += "@";
		}
		const lastDot = annoPart.lastIndexOf(".");
		return pathPart + VOCABULARY_ALIAS[annoPart.substr(0, lastDot)] + "." + annoPart.substr(lastDot + 1);
	},
	parseAnnotationObject(
		annotationObject: any,
		currentObjectTarget: string,
		annotationsLists: any[]
	): Expression | AnnotationRecord | Annotation {
		let parsedAnnotationObject: any = {};
		let isCollection = false;
		if (typeof annotationObject === "string") {
			parsedAnnotationObject = { type: "String", String: annotationObject };
		} else if (typeof annotationObject === "boolean") {
			parsedAnnotationObject = { type: "Bool", Bool: annotationObject };
		} else if (typeof annotationObject === "number") {
			parsedAnnotationObject = { type: "Int", Int: annotationObject };
		} else if (annotationObject.$AnnotationPath !== undefined) {
			parsedAnnotationObject = { type: "AnnotationPath", AnnotationPath: annotationObject.$AnnotationPath };
		} else if (annotationObject.$Path !== undefined) {
			parsedAnnotationObject = { type: "Path", Path: annotationObject.$Path };
		} else if (annotationObject.$Decimal !== undefined) {
			parsedAnnotationObject = { type: "Decimal", Decimal: parseFloat(annotationObject.$Decimal) };
		} else if (annotationObject.$PropertyPath !== undefined) {
			parsedAnnotationObject = { type: "PropertyPath", PropertyPath: annotationObject.$PropertyPath };
		} else if (annotationObject.$NavigationPropertyPath !== undefined) {
			parsedAnnotationObject = {
				type: "NavigationPropertyPath",
				NavigationPropertyPath: annotationObject.$NavigationPropertyPath
			};
		} else if (annotationObject.$EnumMember !== undefined) {
			parsedAnnotationObject = {
				type: "EnumMember",
				EnumMember:
					this.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
			};
		} else if (Array.isArray(annotationObject)) {
			isCollection = true;
			const parsedAnnotationCollection = parsedAnnotationObject as any;
			parsedAnnotationCollection.collection = annotationObject.map((subAnnotationObject, subAnnotationIndex) =>
				this.parseAnnotationObject(subAnnotationObject, currentObjectTarget + "/" + subAnnotationIndex, annotationsLists)
			);
			if (annotationObject.length > 0) {
				if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
					(parsedAnnotationCollection.collection as any).type = "PropertyPath";
				} else if (annotationObject[0].hasOwnProperty("$Path")) {
					(parsedAnnotationCollection.collection as any).type = "Path";
				} else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
					(parsedAnnotationCollection.collection as any).type = "NavigationPropertyPath";
				} else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
					(parsedAnnotationCollection.collection as any).type = "AnnotationPath";
				} else if (annotationObject[0].hasOwnProperty("$Type")) {
					(parsedAnnotationCollection.collection as any).type = "Record";
				} else if (typeof annotationObject[0] === "object") {
					(parsedAnnotationCollection.collection as any).type = "Record";
				} else {
					(parsedAnnotationCollection.collection as any).type = "String";
				}
			}
		} else {
			if (annotationObject.$Type) {
				const typeValue = annotationObject.$Type;
				const typeAlias = VOCABULARY_ALIAS[typeValue.substr(0, typeValue.lastIndexOf("."))];
				const typeTerm = typeValue.substr(typeValue.lastIndexOf(".") + 1);
				parsedAnnotationObject.type = `${typeAlias}.${typeTerm}`;
			}
			const propertyValues: any = [];
			Object.keys(annotationObject).forEach(propertyKey => {
				if (propertyKey !== "$Type" && !propertyKey.startsWith("@")) {
					propertyValues.push(
						this.parsePropertyValue(annotationObject[propertyKey], propertyKey, currentObjectTarget, annotationsLists)
					);
				} else if (propertyKey.startsWith("@")) {
					// Annotation of annotation
					const annotationQualifierSplit = propertyKey.split("#");
					const qualifier = annotationQualifierSplit[1];
					let annotationKey = annotationQualifierSplit[0];
					// Check for annotation of annotation
					let currentOutAnnotationObject = this.getOrCreateAnnotationList(currentObjectTarget, annotationsLists);
					currentOutAnnotationObject.annotations.push({
						term: this.mapNameToAlias(annotationKey.substr(1)),
						qualifier: qualifier,
						value: this.parseAnnotationObject(
							annotationObject[propertyKey],
							currentObjectTarget,
							annotationsLists
						) as Expression,
						isCollection: false
					} as Annotation);
				}
			});
			parsedAnnotationObject.propertyValues = propertyValues;
		}
		return parsedAnnotationObject;
	},
	getOrCreateAnnotationList(target: string, annotationsLists: AnnotationList[]): AnnotationList {
		let potentialTarget = annotationsLists.find(annotationList => annotationList.target === target);
		if (!potentialTarget) {
			potentialTarget = {
				target: target,
				annotations: []
			};
			annotationsLists.push(potentialTarget);
		}
		return potentialTarget;
	},

	createAnnotationLists(oMetaModel: ODataMetaModel, annotationObjects: any, annotationTarget: string, annotationLists: any[]) {
		const outAnnotationObject: any = {
			target: annotationTarget,
			annotations: []
		};
		Object.keys(annotationObjects).forEach(annotationKey => {
			let currentOutAnnotationObject = outAnnotationObject;
			const annotationObject = annotationObjects[annotationKey];
			const annotationQualifierSplit = annotationKey.split("#");
			const qualifier = annotationQualifierSplit[1];
			annotationKey = annotationQualifierSplit[0];
			// Check for annotation of annotation
			const annotationOfAnnotationSplit = annotationKey.split("@");
			if (annotationOfAnnotationSplit.length > 2) {
				currentOutAnnotationObject = this.getOrCreateAnnotationList(
					annotationTarget + "@" + this.mapNameToAlias(annotationOfAnnotationSplit[1]),
					annotationLists
				);
				annotationKey = annotationOfAnnotationSplit[2];
			} else {
				annotationKey = annotationOfAnnotationSplit[1];
			}

			const annotationAlias = VOCABULARY_ALIAS[annotationKey.substr(0, annotationKey.lastIndexOf("."))];
			const annotationTerm = annotationKey.substr(annotationKey.lastIndexOf(".") + 1);
			const parsedAnnotationObject: any = {
				term: `${annotationAlias}.${annotationTerm}`,
				qualifier: qualifier
			};
			let currentAnnotationTarget = annotationTarget + "@" + parsedAnnotationObject.term;
			if (qualifier) {
				currentAnnotationTarget += "#" + qualifier;
			}
			let isCollection = false;
			if (annotationObject === null) {
				parsedAnnotationObject.value = { type: "Bool", Bool: annotationObject };
			} else if (typeof annotationObject === "string") {
				parsedAnnotationObject.value = { type: "String", String: annotationObject };
			} else if (typeof annotationObject === "boolean") {
				parsedAnnotationObject.value = { type: "Bool", Bool: annotationObject };
			} else if (typeof annotationObject === "number") {
				parsedAnnotationObject.value = { type: "Int", Int: annotationObject };
			} else if (annotationObject.$Path !== undefined) {
				parsedAnnotationObject.value = { type: "Path", Path: annotationObject.$Path };
			} else if (annotationObject.$AnnotationPath !== undefined) {
				parsedAnnotationObject.value = {
					type: "AnnotationPath",
					AnnotationPath: annotationObject.$AnnotationPath
				};
			} else if (annotationObject.$Decimal !== undefined) {
				parsedAnnotationObject.value = { type: "Decimal", Decimal: parseFloat(annotationObject.$Decimal) };
			} else if (annotationObject.$EnumMember !== undefined) {
				parsedAnnotationObject.value = {
					type: "EnumMember",
					EnumMember:
						this.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
				};
			} else if (Array.isArray(annotationObject)) {
				isCollection = true;
				parsedAnnotationObject.collection = annotationObject.map((subAnnotationObject, subAnnotationIndex) =>
					this.parseAnnotationObject(subAnnotationObject, currentAnnotationTarget + "/" + subAnnotationIndex, annotationLists)
				);
				if (annotationObject.length > 0) {
					if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
						(parsedAnnotationObject.collection as any).type = "PropertyPath";
					} else if (annotationObject[0].hasOwnProperty("$Path")) {
						(parsedAnnotationObject.collection as any).type = "Path";
					} else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
						(parsedAnnotationObject.collection as any).type = "NavigationPropertyPath";
					} else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
						(parsedAnnotationObject.collection as any).type = "AnnotationPath";
					} else if (annotationObject[0].hasOwnProperty("$Type")) {
						(parsedAnnotationObject.collection as any).type = "Record";
					} else if (typeof annotationObject[0] === "object") {
						(parsedAnnotationObject.collection as any).type = "Record";
					} else {
						(parsedAnnotationObject.collection as any).type = "String";
					}
				}
			} else {
				const record: AnnotationRecord = {
					propertyValues: []
				};
				if (annotationObject.$Type) {
					const typeValue = annotationObject.$Type;
					const typeAlias = VOCABULARY_ALIAS[typeValue.substr(0, typeValue.lastIndexOf("."))];
					const typeTerm = typeValue.substr(typeValue.lastIndexOf(".") + 1);
					record.type = `${typeAlias}.${typeTerm}`;
				}
				const propertyValues: any[] = [];
				Object.keys(annotationObject).forEach(propertyKey => {
					if (propertyKey !== "$Type" && !propertyKey.startsWith("@")) {
						propertyValues.push(
							this.parsePropertyValue(annotationObject[propertyKey], propertyKey, currentAnnotationTarget, annotationLists)
						);
					} else if (propertyKey.startsWith("@")) {
						// Annotation of record
						annotationLists.push({
							target: currentAnnotationTarget,
							annotations: [
								{
									value: this.parseAnnotationObject(
										annotationObject[propertyKey],
										currentAnnotationTarget,
										annotationLists
									)
								}
							]
						});
					}
				});
				record.propertyValues = propertyValues;
				parsedAnnotationObject.record = record;
			}
			parsedAnnotationObject.isCollection = isCollection;
			currentOutAnnotationObject.annotations.push(parsedAnnotationObject);
		});
		if (outAnnotationObject.annotations.length > 0) {
			annotationLists.push(outAnnotationObject);
		}
	},
	parseProperty(oMetaModel: any, entityTypeObject: EntityType, propertyName: string, annotationLists: AnnotationList[]): Property {
		const propertyAnnotation = oMetaModel.getObject(`/${entityTypeObject.name}/${propertyName}@`);
		const propertyDefinition = oMetaModel.getObject(`/${entityTypeObject.name}/${propertyName}`);

		const propertyObject: Property = {
			_type: "Property",
			name: propertyName,
			fullyQualifiedName: `${entityTypeObject.fullyQualifiedName}/${propertyName}`,
			type: propertyDefinition.$Type,
			maxLength: propertyDefinition.$MaxLength,
			precision: propertyDefinition.$Precision,
			scale: propertyDefinition.$Scale,
			nullable: propertyDefinition.$Nullable,
			annotations: {}
		};

		this.createAnnotationLists(oMetaModel, propertyAnnotation, propertyObject.fullyQualifiedName, annotationLists);

		return propertyObject;
	},
	parseNavigationProperty(
		oMetaModel: any,
		entityTypeObject: EntityType,
		navPropertyName: string,
		annotationLists: AnnotationList[]
	): V4NavigationProperty {
		const navPropertyAnnotation = oMetaModel.getObject(`/${entityTypeObject.name}/${navPropertyName}@`);
		const navPropertyDefinition = oMetaModel.getObject(`/${entityTypeObject.name}/${navPropertyName}`);

		let referentialConstraint: ReferentialConstraint[] = [];
		if (navPropertyDefinition.$ReferentialConstraint) {
			referentialConstraint = Object.keys(navPropertyDefinition.$ReferentialConstraint).map(sourcePropertyName => {
				return {
					sourceTypeName: entityTypeObject.name,
					sourceProperty: sourcePropertyName,
					targetTypeName: navPropertyDefinition.$Type,
					targetProperty: navPropertyDefinition.$ReferentialConstraint[sourcePropertyName]
				};
			});
		}
		const navigationProperty: V4NavigationProperty = {
			_type: "NavigationProperty",
			name: navPropertyName,
			fullyQualifiedName: `${entityTypeObject.fullyQualifiedName}/${navPropertyName}`,
			partner: navPropertyDefinition.$Partner,
			isCollection: navPropertyDefinition.$isCollection ? navPropertyDefinition.$isCollection : false,
			targetTypeName: navPropertyDefinition.$Type,
			referentialConstraint,
			annotations: {}
		};

		this.createAnnotationLists(oMetaModel, navPropertyAnnotation, navigationProperty.fullyQualifiedName, annotationLists);

		return navigationProperty;
	},
	parseEntityType(
		oMetaModel: any,
		entitySetName: string,
		annotationLists: AnnotationList[],
		entityContainerName: string
	): { entityType: EntityType; entitySet: EntitySet } {
		const entitySetDefinition = oMetaModel.getObject(`/${entitySetName}`);
		const entitySetAnnotation = oMetaModel.getObject(`/${entitySetName}@`);
		const entityTypeAnnotation = oMetaModel.getObject(`/${entitySetName}/@`);
		const entityTypeDefinition = oMetaModel.getObject(`/${entitySetName}/`);
		const entityKeys = entityTypeDefinition.$Key;
		const entityTypeObject: EntityType = {
			_type: "EntityType",
			name: entitySetName,
			fullyQualifiedName: entitySetDefinition.$Type,
			keys: [],
			entityProperties: [],
			navigationProperties: [],
			annotations: {
				getAnnotation(annotationName: string) {
					return (entityTypeObject.annotations as any)[annotationName];
				}
			}
		};

		const entitySetObject: EntitySet = {
			_type: "EntitySet",
			name: entitySetName,
			navigationPropertyBinding: {},
			entityType: entitySetDefinition.$Type,
			fullyQualifiedName: `${entityContainerName}/${entitySetName}`
		};
		this.createAnnotationLists(oMetaModel, entityTypeAnnotation, entityTypeObject.fullyQualifiedName, annotationLists);
		this.createAnnotationLists(oMetaModel, entitySetAnnotation, entitySetObject.fullyQualifiedName, annotationLists);
		const entityProperties = Object.keys(entityTypeDefinition)
			.filter(propertyNameOrNot => {
				if (propertyNameOrNot != "$Key" && propertyNameOrNot != "$kind") {
					return entityTypeDefinition[propertyNameOrNot].$kind === "Property";
				}
			})
			.map(propertyName => {
				return this.parseProperty(oMetaModel, entityTypeObject, propertyName, annotationLists);
			});

		const navigationProperties = Object.keys(entityTypeDefinition)
			.filter(propertyNameOrNot => {
				if (propertyNameOrNot != "$Key" && propertyNameOrNot != "$kind") {
					return entityTypeDefinition[propertyNameOrNot].$kind === "NavigationProperty";
				}
			})
			.map(navPropertyName => {
				return this.parseNavigationProperty(oMetaModel, entityTypeObject, navPropertyName, annotationLists);
			});

		entityTypeObject.keys = entityKeys.map((entityKey: string) =>
			entityProperties.find((property: Property) => property.name === entityKey)
		);
		entityTypeObject.entityProperties = entityProperties;
		entityTypeObject.navigationProperties = navigationProperties;

		return { entityType: entityTypeObject, entitySet: entitySetObject };
	},
	parseAction(actionName: string, actionRawData: MetaModelAction, namespace: string): Action {
		let actionEntityType: string = "";
		let actionFQN = `${actionName}`;
		if (actionRawData.$IsBound) {
			actionEntityType = actionRawData.$Parameter
				.filter(param => param.$Name === actionRawData.$EntitySetPath)
				.map(param => param.$Type)
				.join("");
			actionFQN = `${actionName}(${actionEntityType})`;
		}
		const parameters = actionRawData.$Parameter || [];
		return {
			_type: "Action",
			name: actionName.substr(namespace.length + 1),
			fullyQualifiedName: actionFQN,
			isBound: actionRawData.$IsBound,
			sourceType: actionEntityType,
			returnType: actionRawData.$ReturnType ? actionRawData.$ReturnType.$Type : "",
			parameters: parameters.map(param => {
				return {
					_type: "ActionParameter",
					isEntitySet: param.$Type === actionRawData.$EntitySetPath,
					fullyQualifiedName: `${actionFQN}/${param.$Name}`,
					type: param.$Type
					// TODO missing properties ?
				};
			})
		};
	},
	parseEntityTypes(oMetaModel: any): ParserOutput {
		const oMetaModelData = oMetaModel.getObject("/$");
		const oEntitySets = oMetaModel.getObject("/");
		const annotationLists: AnnotationList[] = [];
		const entityTypes: EntityType[] = [];
		const entitySets: EntitySet[] = [];
		const entityContainerName = oMetaModelData.$EntityContainer;
		Object.keys(oEntitySets)
			.filter(entitySetName => {
				return entitySetName !== "$kind" && oEntitySets[entitySetName].$kind === "EntitySet";
			})
			.forEach(entitySetName => {
				const { entityType, entitySet } = this.parseEntityType(oMetaModel, entitySetName, annotationLists, entityContainerName);
				entityTypes.push(entityType);
				entitySets.push(entitySet);
			});
		entitySets.forEach(entitySet => {
			const navPropertyBindings = oMetaModelData[entityContainerName][entitySet.name].$NavigationPropertyBinding;
			if (navPropertyBindings) {
				Object.keys(navPropertyBindings).forEach(navPropName => {
					const targetEntitySet = entitySets.find(entitySetName => entitySetName.name === navPropertyBindings[navPropName]);
					if (targetEntitySet) {
						entitySet.navigationPropertyBinding[navPropName] = targetEntitySet;
					}
				});
			}
		});
		const unaliasFn = (aliasedValue: string): string => {
			if (!aliasedValue) {
				return aliasedValue;
			}
			const [alias, value] = aliasedValue.split(".");
			const namespace = Object.keys(VOCABULARY_ALIAS).find(originalName => {
				return VOCABULARY_ALIAS[originalName] === alias;
			});
			if (namespace) {
				return `${namespace}.${value}`;
			} else {
				if (aliasedValue.indexOf("@") !== -1) {
					const [preAlias, postAlias] = aliasedValue.split("@");
					return `${preAlias}@${unaliasFn(postAlias)}`;
				} else {
					return aliasedValue;
				}
			}
		};
		let namespace = "";
		const schemaKeys = Object.keys(oMetaModelData).filter(metamodelKey => oMetaModelData[metamodelKey].$kind === "Schema");
		if (schemaKeys && schemaKeys.length > 0) {
			namespace = schemaKeys[0].substr(0, schemaKeys[0].length - 1);
		} else if (entityTypes && entityTypes.length) {
			namespace = entityTypes[0].fullyQualifiedName.replace(entityTypes[0].name, "");
			namespace = namespace.substr(0, namespace.length - 1);
		}
		const actions: Action[] = Object.keys(oMetaModelData)
			.filter(key => {
				return Array.isArray(oMetaModelData[key]) && oMetaModelData[key].length > 0 && oMetaModelData[key][0].$kind === "Action";
			})
			.reduce((outActions: Action[], actionName) => {
				const actions = oMetaModelData[actionName];
				actions.forEach((action: MetaModelAction) => {
					outActions.push(this.parseAction(actionName, action, namespace));
				});
				return outActions;
			}, []);
		// FIXME Crappy code to deal with annotations for functions
		const annotations = oMetaModelData.$Annotations;
		const actionAnnotations = Object.keys(annotations).filter(target => target.indexOf("(") !== -1);
		actionAnnotations.forEach(target => {
			this.createAnnotationLists(oMetaModel, oMetaModelData.$Annotations[target], target, annotationLists);
		});
		return {
			identification: "metamodelResult",
			version: "4.0",
			schema: {
				entityContainer: {},
				entitySets,
				entityTypes,
				associations: [],
				actions,
				namespace,
				annotations: {
					"metamodelResult": annotationLists
				}
			},
			references: [],
			unalias: unaliasFn
		};
	},
	convertTypes(oMetaModel: any) {
		const parsedOutput = this.parseEntityTypes(oMetaModel);

		return AnnotationConverter.convertTypes(parsedOutput);
	},
	convertPage(sTemplate: TemplateConverter, oMetaModel: any, oManifestSettings: BaseManifestSettings) {
		const serviceObject = this.convertTypes(oMetaModel);
		const sEntitySet = oManifestSettings.entitySet;
		const targetEntitySet: EntitySet | undefined = serviceObject.schema.entitySets.find(
			(entitySet: EntitySet) => entitySet.name === sEntitySet
		);
		if (targetEntitySet) {
			const oContext = oMetaModel.createBindingContext("/" + sEntitySet);
			return {
				[sEntitySet]: templateConverter[sTemplate].convertPage(
					targetEntitySet as Required<EntitySet>,
					oContext,
					oManifestSettings as ObjectPageManifestSettings,
					serviceObject.unalias
				)
			};
		}
	}
};

export default MetaModelConverter;
