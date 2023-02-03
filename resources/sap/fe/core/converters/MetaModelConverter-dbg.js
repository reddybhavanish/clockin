sap.ui.define(["./templates/index", "sap/fe/core/converters/common/AnnotationConverter", "./Constants"], function (templateConverter, AnnotationConverter, Constants) {
  "use strict";

  var VOCABULARY_ALIAS = Constants.VOCABULARY_ALIAS;

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  var TemplateConverter;

  (function (TemplateConverter) {
    TemplateConverter["ListReport"] = "ListReport";
    TemplateConverter["ObjectPage"] = "ObjectPage";
  })(TemplateConverter || (TemplateConverter = {}));

  var MetaModelConverter = {
    parsePropertyValue: function (annotationObject, propertyKey, currentTarget, annotationsLists) {
      var _this = this;

      var value;
      var currentPropertyTarget = currentTarget + "/" + propertyKey;

      if (typeof annotationObject === "string") {
        value = {
          type: "String",
          String: annotationObject
        };
      } else if (typeof annotationObject === "boolean") {
        value = {
          type: "Bool",
          Bool: annotationObject
        };
      } else if (typeof annotationObject === "number") {
        value = {
          type: "Int",
          Int: annotationObject
        };
      } else if (Array.isArray(annotationObject)) {
        value = {
          type: "Collection",
          Collection: annotationObject.map(function (subAnnotationObject, subAnnotationObjectIndex) {
            return _this.parseAnnotationObject(subAnnotationObject, currentPropertyTarget + "/" + subAnnotationObjectIndex, annotationsLists);
          })
        };

        if (annotationObject.length > 0) {
          if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
            value.Collection.type = "PropertyPath";
          } else if (annotationObject[0].hasOwnProperty("$Path")) {
            value.Collection.type = "Path";
          } else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
            value.Collection.type = "NavigationPropertyPath";
          } else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
            value.Collection.type = "AnnotationPath";
          } else if (annotationObject[0].hasOwnProperty("$Type")) {
            value.Collection.type = "Record";
          } else if (typeof annotationObject[0] === "object") {
            // $Type is optional...
            value.Collection.type = "Record";
          } else {
            value.Collection.type = "String";
          }
        }
      } else if (annotationObject.$Path !== undefined) {
        value = {
          type: "Path",
          Path: annotationObject.$Path
        };
      } else if (annotationObject.$Decimal !== undefined) {
        value = {
          type: "Decimal",
          Decimal: parseFloat(annotationObject.$Decimal)
        };
      } else if (annotationObject.$PropertyPath !== undefined) {
        value = {
          type: "PropertyPath",
          PropertyPath: annotationObject.$PropertyPath
        };
      } else if (annotationObject.$NavigationPropertyPath !== undefined) {
        value = {
          type: "NavigationPropertyPath",
          NavigationPropertyPath: annotationObject.$NavigationPropertyPath
        };
      } else if (annotationObject.$AnnotationPath !== undefined) {
        value = {
          type: "AnnotationPath",
          AnnotationPath: annotationObject.$AnnotationPath
        };
      } else if (annotationObject.$EnumMember !== undefined) {
        value = {
          type: "EnumMember",
          EnumMember: this.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
        };
      } else if (annotationObject.$Type) {
        value = {
          type: "Record",
          Record: this.parseAnnotationObject(annotationObject, currentTarget, annotationsLists)
        };
      }

      return {
        name: propertyKey,
        value: value
      };
    },
    mapNameToAlias: function (annotationName) {
      var _annotationName$split = annotationName.split("@"),
          _annotationName$split2 = _slicedToArray(_annotationName$split, 2),
          pathPart = _annotationName$split2[0],
          annoPart = _annotationName$split2[1];

      if (!annoPart) {
        annoPart = pathPart;
        pathPart = "";
      } else {
        pathPart += "@";
      }

      var lastDot = annoPart.lastIndexOf(".");
      return pathPart + VOCABULARY_ALIAS[annoPart.substr(0, lastDot)] + "." + annoPart.substr(lastDot + 1);
    },
    parseAnnotationObject: function (annotationObject, currentObjectTarget, annotationsLists) {
      var _this2 = this;

      var parsedAnnotationObject = {};
      var isCollection = false;

      if (typeof annotationObject === "string") {
        parsedAnnotationObject = {
          type: "String",
          String: annotationObject
        };
      } else if (typeof annotationObject === "boolean") {
        parsedAnnotationObject = {
          type: "Bool",
          Bool: annotationObject
        };
      } else if (typeof annotationObject === "number") {
        parsedAnnotationObject = {
          type: "Int",
          Int: annotationObject
        };
      } else if (annotationObject.$AnnotationPath !== undefined) {
        parsedAnnotationObject = {
          type: "AnnotationPath",
          AnnotationPath: annotationObject.$AnnotationPath
        };
      } else if (annotationObject.$Path !== undefined) {
        parsedAnnotationObject = {
          type: "Path",
          Path: annotationObject.$Path
        };
      } else if (annotationObject.$Decimal !== undefined) {
        parsedAnnotationObject = {
          type: "Decimal",
          Decimal: parseFloat(annotationObject.$Decimal)
        };
      } else if (annotationObject.$PropertyPath !== undefined) {
        parsedAnnotationObject = {
          type: "PropertyPath",
          PropertyPath: annotationObject.$PropertyPath
        };
      } else if (annotationObject.$NavigationPropertyPath !== undefined) {
        parsedAnnotationObject = {
          type: "NavigationPropertyPath",
          NavigationPropertyPath: annotationObject.$NavigationPropertyPath
        };
      } else if (annotationObject.$EnumMember !== undefined) {
        parsedAnnotationObject = {
          type: "EnumMember",
          EnumMember: this.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
        };
      } else if (Array.isArray(annotationObject)) {
        isCollection = true;
        var parsedAnnotationCollection = parsedAnnotationObject;
        parsedAnnotationCollection.collection = annotationObject.map(function (subAnnotationObject, subAnnotationIndex) {
          return _this2.parseAnnotationObject(subAnnotationObject, currentObjectTarget + "/" + subAnnotationIndex, annotationsLists);
        });

        if (annotationObject.length > 0) {
          if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
            parsedAnnotationCollection.collection.type = "PropertyPath";
          } else if (annotationObject[0].hasOwnProperty("$Path")) {
            parsedAnnotationCollection.collection.type = "Path";
          } else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
            parsedAnnotationCollection.collection.type = "NavigationPropertyPath";
          } else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
            parsedAnnotationCollection.collection.type = "AnnotationPath";
          } else if (annotationObject[0].hasOwnProperty("$Type")) {
            parsedAnnotationCollection.collection.type = "Record";
          } else if (typeof annotationObject[0] === "object") {
            parsedAnnotationCollection.collection.type = "Record";
          } else {
            parsedAnnotationCollection.collection.type = "String";
          }
        }
      } else {
        if (annotationObject.$Type) {
          var typeValue = annotationObject.$Type;
          var typeAlias = VOCABULARY_ALIAS[typeValue.substr(0, typeValue.lastIndexOf("."))];
          var typeTerm = typeValue.substr(typeValue.lastIndexOf(".") + 1);
          parsedAnnotationObject.type = "".concat(typeAlias, ".").concat(typeTerm);
        }

        var propertyValues = [];
        Object.keys(annotationObject).forEach(function (propertyKey) {
          if (propertyKey !== "$Type" && !propertyKey.startsWith("@")) {
            propertyValues.push(_this2.parsePropertyValue(annotationObject[propertyKey], propertyKey, currentObjectTarget, annotationsLists));
          } else if (propertyKey.startsWith("@")) {
            // Annotation of annotation
            var annotationQualifierSplit = propertyKey.split("#");
            var qualifier = annotationQualifierSplit[1];
            var annotationKey = annotationQualifierSplit[0]; // Check for annotation of annotation

            var currentOutAnnotationObject = _this2.getOrCreateAnnotationList(currentObjectTarget, annotationsLists);

            currentOutAnnotationObject.annotations.push({
              term: _this2.mapNameToAlias(annotationKey.substr(1)),
              qualifier: qualifier,
              value: _this2.parseAnnotationObject(annotationObject[propertyKey], currentObjectTarget, annotationsLists),
              isCollection: false
            });
          }
        });
        parsedAnnotationObject.propertyValues = propertyValues;
      }

      return parsedAnnotationObject;
    },
    getOrCreateAnnotationList: function (target, annotationsLists) {
      var potentialTarget = annotationsLists.find(function (annotationList) {
        return annotationList.target === target;
      });

      if (!potentialTarget) {
        potentialTarget = {
          target: target,
          annotations: []
        };
        annotationsLists.push(potentialTarget);
      }

      return potentialTarget;
    },
    createAnnotationLists: function (oMetaModel, annotationObjects, annotationTarget, annotationLists) {
      var _this3 = this;

      var outAnnotationObject = {
        target: annotationTarget,
        annotations: []
      };
      Object.keys(annotationObjects).forEach(function (annotationKey) {
        var currentOutAnnotationObject = outAnnotationObject;
        var annotationObject = annotationObjects[annotationKey];
        var annotationQualifierSplit = annotationKey.split("#");
        var qualifier = annotationQualifierSplit[1];
        annotationKey = annotationQualifierSplit[0]; // Check for annotation of annotation

        var annotationOfAnnotationSplit = annotationKey.split("@");

        if (annotationOfAnnotationSplit.length > 2) {
          currentOutAnnotationObject = _this3.getOrCreateAnnotationList(annotationTarget + "@" + _this3.mapNameToAlias(annotationOfAnnotationSplit[1]), annotationLists);
          annotationKey = annotationOfAnnotationSplit[2];
        } else {
          annotationKey = annotationOfAnnotationSplit[1];
        }

        var annotationAlias = VOCABULARY_ALIAS[annotationKey.substr(0, annotationKey.lastIndexOf("."))];
        var annotationTerm = annotationKey.substr(annotationKey.lastIndexOf(".") + 1);
        var parsedAnnotationObject = {
          term: "".concat(annotationAlias, ".").concat(annotationTerm),
          qualifier: qualifier
        };
        var currentAnnotationTarget = annotationTarget + "@" + parsedAnnotationObject.term;

        if (qualifier) {
          currentAnnotationTarget += "#" + qualifier;
        }

        var isCollection = false;

        if (annotationObject === null) {
          parsedAnnotationObject.value = {
            type: "Bool",
            Bool: annotationObject
          };
        } else if (typeof annotationObject === "string") {
          parsedAnnotationObject.value = {
            type: "String",
            String: annotationObject
          };
        } else if (typeof annotationObject === "boolean") {
          parsedAnnotationObject.value = {
            type: "Bool",
            Bool: annotationObject
          };
        } else if (typeof annotationObject === "number") {
          parsedAnnotationObject.value = {
            type: "Int",
            Int: annotationObject
          };
        } else if (annotationObject.$Path !== undefined) {
          parsedAnnotationObject.value = {
            type: "Path",
            Path: annotationObject.$Path
          };
        } else if (annotationObject.$AnnotationPath !== undefined) {
          parsedAnnotationObject.value = {
            type: "AnnotationPath",
            AnnotationPath: annotationObject.$AnnotationPath
          };
        } else if (annotationObject.$Decimal !== undefined) {
          parsedAnnotationObject.value = {
            type: "Decimal",
            Decimal: parseFloat(annotationObject.$Decimal)
          };
        } else if (annotationObject.$EnumMember !== undefined) {
          parsedAnnotationObject.value = {
            type: "EnumMember",
            EnumMember: _this3.mapNameToAlias(annotationObject.$EnumMember.split("/")[0]) + "/" + annotationObject.$EnumMember.split("/")[1]
          };
        } else if (Array.isArray(annotationObject)) {
          isCollection = true;
          parsedAnnotationObject.collection = annotationObject.map(function (subAnnotationObject, subAnnotationIndex) {
            return _this3.parseAnnotationObject(subAnnotationObject, currentAnnotationTarget + "/" + subAnnotationIndex, annotationLists);
          });

          if (annotationObject.length > 0) {
            if (annotationObject[0].hasOwnProperty("$PropertyPath")) {
              parsedAnnotationObject.collection.type = "PropertyPath";
            } else if (annotationObject[0].hasOwnProperty("$Path")) {
              parsedAnnotationObject.collection.type = "Path";
            } else if (annotationObject[0].hasOwnProperty("$NavigationPropertyPath")) {
              parsedAnnotationObject.collection.type = "NavigationPropertyPath";
            } else if (annotationObject[0].hasOwnProperty("$AnnotationPath")) {
              parsedAnnotationObject.collection.type = "AnnotationPath";
            } else if (annotationObject[0].hasOwnProperty("$Type")) {
              parsedAnnotationObject.collection.type = "Record";
            } else if (typeof annotationObject[0] === "object") {
              parsedAnnotationObject.collection.type = "Record";
            } else {
              parsedAnnotationObject.collection.type = "String";
            }
          }
        } else {
          var record = {
            propertyValues: []
          };

          if (annotationObject.$Type) {
            var typeValue = annotationObject.$Type;
            var typeAlias = VOCABULARY_ALIAS[typeValue.substr(0, typeValue.lastIndexOf("."))];
            var typeTerm = typeValue.substr(typeValue.lastIndexOf(".") + 1);
            record.type = "".concat(typeAlias, ".").concat(typeTerm);
          }

          var propertyValues = [];
          Object.keys(annotationObject).forEach(function (propertyKey) {
            if (propertyKey !== "$Type" && !propertyKey.startsWith("@")) {
              propertyValues.push(_this3.parsePropertyValue(annotationObject[propertyKey], propertyKey, currentAnnotationTarget, annotationLists));
            } else if (propertyKey.startsWith("@")) {
              // Annotation of record
              annotationLists.push({
                target: currentAnnotationTarget,
                annotations: [{
                  value: _this3.parseAnnotationObject(annotationObject[propertyKey], currentAnnotationTarget, annotationLists)
                }]
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
    parseProperty: function (oMetaModel, entityTypeObject, propertyName, annotationLists) {
      var propertyAnnotation = oMetaModel.getObject("/".concat(entityTypeObject.name, "/").concat(propertyName, "@"));
      var propertyDefinition = oMetaModel.getObject("/".concat(entityTypeObject.name, "/").concat(propertyName));
      var propertyObject = {
        _type: "Property",
        name: propertyName,
        fullyQualifiedName: "".concat(entityTypeObject.fullyQualifiedName, "/").concat(propertyName),
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
    parseNavigationProperty: function (oMetaModel, entityTypeObject, navPropertyName, annotationLists) {
      var navPropertyAnnotation = oMetaModel.getObject("/".concat(entityTypeObject.name, "/").concat(navPropertyName, "@"));
      var navPropertyDefinition = oMetaModel.getObject("/".concat(entityTypeObject.name, "/").concat(navPropertyName));
      var referentialConstraint = [];

      if (navPropertyDefinition.$ReferentialConstraint) {
        referentialConstraint = Object.keys(navPropertyDefinition.$ReferentialConstraint).map(function (sourcePropertyName) {
          return {
            sourceTypeName: entityTypeObject.name,
            sourceProperty: sourcePropertyName,
            targetTypeName: navPropertyDefinition.$Type,
            targetProperty: navPropertyDefinition.$ReferentialConstraint[sourcePropertyName]
          };
        });
      }

      var navigationProperty = {
        _type: "NavigationProperty",
        name: navPropertyName,
        fullyQualifiedName: "".concat(entityTypeObject.fullyQualifiedName, "/").concat(navPropertyName),
        partner: navPropertyDefinition.$Partner,
        isCollection: navPropertyDefinition.$isCollection ? navPropertyDefinition.$isCollection : false,
        targetTypeName: navPropertyDefinition.$Type,
        referentialConstraint: referentialConstraint,
        annotations: {}
      };
      this.createAnnotationLists(oMetaModel, navPropertyAnnotation, navigationProperty.fullyQualifiedName, annotationLists);
      return navigationProperty;
    },
    parseEntityType: function (oMetaModel, entitySetName, annotationLists, entityContainerName) {
      var _this4 = this;

      var entitySetDefinition = oMetaModel.getObject("/".concat(entitySetName));
      var entitySetAnnotation = oMetaModel.getObject("/".concat(entitySetName, "@"));
      var entityTypeAnnotation = oMetaModel.getObject("/".concat(entitySetName, "/@"));
      var entityTypeDefinition = oMetaModel.getObject("/".concat(entitySetName, "/"));
      var entityKeys = entityTypeDefinition.$Key;
      var entityTypeObject = {
        _type: "EntityType",
        name: entitySetName,
        fullyQualifiedName: entitySetDefinition.$Type,
        keys: [],
        entityProperties: [],
        navigationProperties: [],
        annotations: {
          getAnnotation: function (annotationName) {
            return entityTypeObject.annotations[annotationName];
          }
        }
      };
      var entitySetObject = {
        _type: "EntitySet",
        name: entitySetName,
        navigationPropertyBinding: {},
        entityType: entitySetDefinition.$Type,
        fullyQualifiedName: "".concat(entityContainerName, "/").concat(entitySetName)
      };
      this.createAnnotationLists(oMetaModel, entityTypeAnnotation, entityTypeObject.fullyQualifiedName, annotationLists);
      this.createAnnotationLists(oMetaModel, entitySetAnnotation, entitySetObject.fullyQualifiedName, annotationLists);
      var entityProperties = Object.keys(entityTypeDefinition).filter(function (propertyNameOrNot) {
        if (propertyNameOrNot != "$Key" && propertyNameOrNot != "$kind") {
          return entityTypeDefinition[propertyNameOrNot].$kind === "Property";
        }
      }).map(function (propertyName) {
        return _this4.parseProperty(oMetaModel, entityTypeObject, propertyName, annotationLists);
      });
      var navigationProperties = Object.keys(entityTypeDefinition).filter(function (propertyNameOrNot) {
        if (propertyNameOrNot != "$Key" && propertyNameOrNot != "$kind") {
          return entityTypeDefinition[propertyNameOrNot].$kind === "NavigationProperty";
        }
      }).map(function (navPropertyName) {
        return _this4.parseNavigationProperty(oMetaModel, entityTypeObject, navPropertyName, annotationLists);
      });
      entityTypeObject.keys = entityKeys.map(function (entityKey) {
        return entityProperties.find(function (property) {
          return property.name === entityKey;
        });
      });
      entityTypeObject.entityProperties = entityProperties;
      entityTypeObject.navigationProperties = navigationProperties;
      return {
        entityType: entityTypeObject,
        entitySet: entitySetObject
      };
    },
    parseAction: function (actionName, actionRawData, namespace) {
      var actionEntityType = "";
      var actionFQN = "".concat(actionName);

      if (actionRawData.$IsBound) {
        actionEntityType = actionRawData.$Parameter.filter(function (param) {
          return param.$Name === actionRawData.$EntitySetPath;
        }).map(function (param) {
          return param.$Type;
        }).join("");
        actionFQN = "".concat(actionName, "(").concat(actionEntityType, ")");
      }

      var parameters = actionRawData.$Parameter || [];
      return {
        _type: "Action",
        name: actionName.substr(namespace.length + 1),
        fullyQualifiedName: actionFQN,
        isBound: actionRawData.$IsBound,
        sourceType: actionEntityType,
        returnType: actionRawData.$ReturnType ? actionRawData.$ReturnType.$Type : "",
        parameters: parameters.map(function (param) {
          return {
            _type: "ActionParameter",
            isEntitySet: param.$Type === actionRawData.$EntitySetPath,
            fullyQualifiedName: "".concat(actionFQN, "/").concat(param.$Name),
            type: param.$Type // TODO missing properties ?

          };
        })
      };
    },
    parseEntityTypes: function (oMetaModel) {
      var _this5 = this;

      var oMetaModelData = oMetaModel.getObject("/$");
      var oEntitySets = oMetaModel.getObject("/");
      var annotationLists = [];
      var entityTypes = [];
      var entitySets = [];
      var entityContainerName = oMetaModelData.$EntityContainer;
      Object.keys(oEntitySets).filter(function (entitySetName) {
        return entitySetName !== "$kind" && oEntitySets[entitySetName].$kind === "EntitySet";
      }).forEach(function (entitySetName) {
        var _this5$parseEntityTyp = _this5.parseEntityType(oMetaModel, entitySetName, annotationLists, entityContainerName),
            entityType = _this5$parseEntityTyp.entityType,
            entitySet = _this5$parseEntityTyp.entitySet;

        entityTypes.push(entityType);
        entitySets.push(entitySet);
      });
      entitySets.forEach(function (entitySet) {
        var navPropertyBindings = oMetaModelData[entityContainerName][entitySet.name].$NavigationPropertyBinding;

        if (navPropertyBindings) {
          Object.keys(navPropertyBindings).forEach(function (navPropName) {
            var targetEntitySet = entitySets.find(function (entitySetName) {
              return entitySetName.name === navPropertyBindings[navPropName];
            });

            if (targetEntitySet) {
              entitySet.navigationPropertyBinding[navPropName] = targetEntitySet;
            }
          });
        }
      });

      var unaliasFn = function (aliasedValue) {
        if (!aliasedValue) {
          return aliasedValue;
        }

        var _aliasedValue$split = aliasedValue.split("."),
            _aliasedValue$split2 = _slicedToArray(_aliasedValue$split, 2),
            alias = _aliasedValue$split2[0],
            value = _aliasedValue$split2[1];

        var namespace = Object.keys(VOCABULARY_ALIAS).find(function (originalName) {
          return VOCABULARY_ALIAS[originalName] === alias;
        });

        if (namespace) {
          return "".concat(namespace, ".").concat(value);
        } else {
          if (aliasedValue.indexOf("@") !== -1) {
            var _aliasedValue$split3 = aliasedValue.split("@"),
                _aliasedValue$split4 = _slicedToArray(_aliasedValue$split3, 2),
                preAlias = _aliasedValue$split4[0],
                postAlias = _aliasedValue$split4[1];

            return "".concat(preAlias, "@").concat(unaliasFn(postAlias));
          } else {
            return aliasedValue;
          }
        }
      };

      var namespace = "";
      var schemaKeys = Object.keys(oMetaModelData).filter(function (metamodelKey) {
        return oMetaModelData[metamodelKey].$kind === "Schema";
      });

      if (schemaKeys && schemaKeys.length > 0) {
        namespace = schemaKeys[0].substr(0, schemaKeys[0].length - 1);
      } else if (entityTypes && entityTypes.length) {
        namespace = entityTypes[0].fullyQualifiedName.replace(entityTypes[0].name, "");
        namespace = namespace.substr(0, namespace.length - 1);
      }

      var actions = Object.keys(oMetaModelData).filter(function (key) {
        return Array.isArray(oMetaModelData[key]) && oMetaModelData[key].length > 0 && oMetaModelData[key][0].$kind === "Action";
      }).reduce(function (outActions, actionName) {
        var actions = oMetaModelData[actionName];
        actions.forEach(function (action) {
          outActions.push(_this5.parseAction(actionName, action, namespace));
        });
        return outActions;
      }, []); // FIXME Crappy code to deal with annotations for functions

      var annotations = oMetaModelData.$Annotations;
      var actionAnnotations = Object.keys(annotations).filter(function (target) {
        return target.indexOf("(") !== -1;
      });
      actionAnnotations.forEach(function (target) {
        _this5.createAnnotationLists(oMetaModel, oMetaModelData.$Annotations[target], target, annotationLists);
      });
      return {
        identification: "metamodelResult",
        version: "4.0",
        schema: {
          entityContainer: {},
          entitySets: entitySets,
          entityTypes: entityTypes,
          associations: [],
          actions: actions,
          namespace: namespace,
          annotations: {
            "metamodelResult": annotationLists
          }
        },
        references: [],
        unalias: unaliasFn
      };
    },
    convertTypes: function (oMetaModel) {
      var parsedOutput = this.parseEntityTypes(oMetaModel);
      return AnnotationConverter.convertTypes(parsedOutput);
    },
    convertPage: function (sTemplate, oMetaModel, oManifestSettings) {
      var serviceObject = this.convertTypes(oMetaModel);
      var sEntitySet = oManifestSettings.entitySet;
      var targetEntitySet = serviceObject.schema.entitySets.find(function (entitySet) {
        return entitySet.name === sEntitySet;
      });

      if (targetEntitySet) {
        var oContext = oMetaModel.createBindingContext("/" + sEntitySet);
        return _defineProperty({}, sEntitySet, templateConverter[sTemplate].convertPage(targetEntitySet, oContext, oManifestSettings, serviceObject.unalias));
      }
    }
  };
  return MetaModelConverter;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1ldGFNb2RlbENvbnZlcnRlci50cyJdLCJuYW1lcyI6WyJUZW1wbGF0ZUNvbnZlcnRlciIsIk1ldGFNb2RlbENvbnZlcnRlciIsInBhcnNlUHJvcGVydHlWYWx1ZSIsImFubm90YXRpb25PYmplY3QiLCJwcm9wZXJ0eUtleSIsImN1cnJlbnRUYXJnZXQiLCJhbm5vdGF0aW9uc0xpc3RzIiwidmFsdWUiLCJjdXJyZW50UHJvcGVydHlUYXJnZXQiLCJ0eXBlIiwiU3RyaW5nIiwiQm9vbCIsIkludCIsIkFycmF5IiwiaXNBcnJheSIsIkNvbGxlY3Rpb24iLCJtYXAiLCJzdWJBbm5vdGF0aW9uT2JqZWN0Iiwic3ViQW5ub3RhdGlvbk9iamVjdEluZGV4IiwicGFyc2VBbm5vdGF0aW9uT2JqZWN0IiwibGVuZ3RoIiwiaGFzT3duUHJvcGVydHkiLCIkUGF0aCIsInVuZGVmaW5lZCIsIlBhdGgiLCIkRGVjaW1hbCIsIkRlY2ltYWwiLCJwYXJzZUZsb2F0IiwiJFByb3BlcnR5UGF0aCIsIlByb3BlcnR5UGF0aCIsIiROYXZpZ2F0aW9uUHJvcGVydHlQYXRoIiwiTmF2aWdhdGlvblByb3BlcnR5UGF0aCIsIiRBbm5vdGF0aW9uUGF0aCIsIkFubm90YXRpb25QYXRoIiwiJEVudW1NZW1iZXIiLCJFbnVtTWVtYmVyIiwibWFwTmFtZVRvQWxpYXMiLCJzcGxpdCIsIiRUeXBlIiwiUmVjb3JkIiwibmFtZSIsImFubm90YXRpb25OYW1lIiwicGF0aFBhcnQiLCJhbm5vUGFydCIsImxhc3REb3QiLCJsYXN0SW5kZXhPZiIsIlZPQ0FCVUxBUllfQUxJQVMiLCJzdWJzdHIiLCJjdXJyZW50T2JqZWN0VGFyZ2V0IiwicGFyc2VkQW5ub3RhdGlvbk9iamVjdCIsImlzQ29sbGVjdGlvbiIsInBhcnNlZEFubm90YXRpb25Db2xsZWN0aW9uIiwiY29sbGVjdGlvbiIsInN1YkFubm90YXRpb25JbmRleCIsInR5cGVWYWx1ZSIsInR5cGVBbGlhcyIsInR5cGVUZXJtIiwicHJvcGVydHlWYWx1ZXMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInN0YXJ0c1dpdGgiLCJwdXNoIiwiYW5ub3RhdGlvblF1YWxpZmllclNwbGl0IiwicXVhbGlmaWVyIiwiYW5ub3RhdGlvbktleSIsImN1cnJlbnRPdXRBbm5vdGF0aW9uT2JqZWN0IiwiZ2V0T3JDcmVhdGVBbm5vdGF0aW9uTGlzdCIsImFubm90YXRpb25zIiwidGVybSIsInRhcmdldCIsInBvdGVudGlhbFRhcmdldCIsImZpbmQiLCJhbm5vdGF0aW9uTGlzdCIsImNyZWF0ZUFubm90YXRpb25MaXN0cyIsIm9NZXRhTW9kZWwiLCJhbm5vdGF0aW9uT2JqZWN0cyIsImFubm90YXRpb25UYXJnZXQiLCJhbm5vdGF0aW9uTGlzdHMiLCJvdXRBbm5vdGF0aW9uT2JqZWN0IiwiYW5ub3RhdGlvbk9mQW5ub3RhdGlvblNwbGl0IiwiYW5ub3RhdGlvbkFsaWFzIiwiYW5ub3RhdGlvblRlcm0iLCJjdXJyZW50QW5ub3RhdGlvblRhcmdldCIsInJlY29yZCIsInBhcnNlUHJvcGVydHkiLCJlbnRpdHlUeXBlT2JqZWN0IiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlBbm5vdGF0aW9uIiwiZ2V0T2JqZWN0IiwicHJvcGVydHlEZWZpbml0aW9uIiwicHJvcGVydHlPYmplY3QiLCJfdHlwZSIsImZ1bGx5UXVhbGlmaWVkTmFtZSIsIm1heExlbmd0aCIsIiRNYXhMZW5ndGgiLCJwcmVjaXNpb24iLCIkUHJlY2lzaW9uIiwic2NhbGUiLCIkU2NhbGUiLCJudWxsYWJsZSIsIiROdWxsYWJsZSIsInBhcnNlTmF2aWdhdGlvblByb3BlcnR5IiwibmF2UHJvcGVydHlOYW1lIiwibmF2UHJvcGVydHlBbm5vdGF0aW9uIiwibmF2UHJvcGVydHlEZWZpbml0aW9uIiwicmVmZXJlbnRpYWxDb25zdHJhaW50IiwiJFJlZmVyZW50aWFsQ29uc3RyYWludCIsInNvdXJjZVByb3BlcnR5TmFtZSIsInNvdXJjZVR5cGVOYW1lIiwic291cmNlUHJvcGVydHkiLCJ0YXJnZXRUeXBlTmFtZSIsInRhcmdldFByb3BlcnR5IiwibmF2aWdhdGlvblByb3BlcnR5IiwicGFydG5lciIsIiRQYXJ0bmVyIiwiJGlzQ29sbGVjdGlvbiIsInBhcnNlRW50aXR5VHlwZSIsImVudGl0eVNldE5hbWUiLCJlbnRpdHlDb250YWluZXJOYW1lIiwiZW50aXR5U2V0RGVmaW5pdGlvbiIsImVudGl0eVNldEFubm90YXRpb24iLCJlbnRpdHlUeXBlQW5ub3RhdGlvbiIsImVudGl0eVR5cGVEZWZpbml0aW9uIiwiZW50aXR5S2V5cyIsIiRLZXkiLCJlbnRpdHlQcm9wZXJ0aWVzIiwibmF2aWdhdGlvblByb3BlcnRpZXMiLCJnZXRBbm5vdGF0aW9uIiwiZW50aXR5U2V0T2JqZWN0IiwibmF2aWdhdGlvblByb3BlcnR5QmluZGluZyIsImVudGl0eVR5cGUiLCJmaWx0ZXIiLCJwcm9wZXJ0eU5hbWVPck5vdCIsIiRraW5kIiwiZW50aXR5S2V5IiwicHJvcGVydHkiLCJlbnRpdHlTZXQiLCJwYXJzZUFjdGlvbiIsImFjdGlvbk5hbWUiLCJhY3Rpb25SYXdEYXRhIiwibmFtZXNwYWNlIiwiYWN0aW9uRW50aXR5VHlwZSIsImFjdGlvbkZRTiIsIiRJc0JvdW5kIiwiJFBhcmFtZXRlciIsInBhcmFtIiwiJE5hbWUiLCIkRW50aXR5U2V0UGF0aCIsImpvaW4iLCJwYXJhbWV0ZXJzIiwiaXNCb3VuZCIsInNvdXJjZVR5cGUiLCJyZXR1cm5UeXBlIiwiJFJldHVyblR5cGUiLCJpc0VudGl0eVNldCIsInBhcnNlRW50aXR5VHlwZXMiLCJvTWV0YU1vZGVsRGF0YSIsIm9FbnRpdHlTZXRzIiwiZW50aXR5VHlwZXMiLCJlbnRpdHlTZXRzIiwiJEVudGl0eUNvbnRhaW5lciIsIm5hdlByb3BlcnR5QmluZGluZ3MiLCIkTmF2aWdhdGlvblByb3BlcnR5QmluZGluZyIsIm5hdlByb3BOYW1lIiwidGFyZ2V0RW50aXR5U2V0IiwidW5hbGlhc0ZuIiwiYWxpYXNlZFZhbHVlIiwiYWxpYXMiLCJvcmlnaW5hbE5hbWUiLCJpbmRleE9mIiwicHJlQWxpYXMiLCJwb3N0QWxpYXMiLCJzY2hlbWFLZXlzIiwibWV0YW1vZGVsS2V5IiwicmVwbGFjZSIsImFjdGlvbnMiLCJrZXkiLCJyZWR1Y2UiLCJvdXRBY3Rpb25zIiwiYWN0aW9uIiwiJEFubm90YXRpb25zIiwiYWN0aW9uQW5ub3RhdGlvbnMiLCJpZGVudGlmaWNhdGlvbiIsInZlcnNpb24iLCJzY2hlbWEiLCJlbnRpdHlDb250YWluZXIiLCJhc3NvY2lhdGlvbnMiLCJyZWZlcmVuY2VzIiwidW5hbGlhcyIsImNvbnZlcnRUeXBlcyIsInBhcnNlZE91dHB1dCIsIkFubm90YXRpb25Db252ZXJ0ZXIiLCJjb252ZXJ0UGFnZSIsInNUZW1wbGF0ZSIsIm9NYW5pZmVzdFNldHRpbmdzIiwic2VydmljZU9iamVjdCIsInNFbnRpdHlTZXQiLCJvQ29udGV4dCIsImNyZWF0ZUJpbmRpbmdDb250ZXh0IiwidGVtcGxhdGVDb252ZXJ0ZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7TUFvQktBLGlCOzthQUFBQSxpQjtBQUFBQSxJQUFBQSxpQjtBQUFBQSxJQUFBQSxpQjtLQUFBQSxpQixLQUFBQSxpQjs7QUFzQkwsTUFBTUMsa0JBQWtCLEdBQUc7QUFDMUJDLElBQUFBLGtCQUQwQixZQUNQQyxnQkFETyxFQUNnQkMsV0FEaEIsRUFDcUNDLGFBRHJDLEVBQzREQyxnQkFENUQsRUFDMEY7QUFBQTs7QUFDbkgsVUFBSUMsS0FBSjtBQUNBLFVBQUlDLHFCQUE2QixHQUFHSCxhQUFhLEdBQUcsR0FBaEIsR0FBc0JELFdBQTFEOztBQUNBLFVBQUksT0FBT0QsZ0JBQVAsS0FBNEIsUUFBaEMsRUFBMEM7QUFDekNJLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsUUFBUjtBQUFrQkMsVUFBQUEsTUFBTSxFQUFFUDtBQUExQixTQUFSO0FBQ0EsT0FGRCxNQUVPLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsU0FBaEMsRUFBMkM7QUFDakRJLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsTUFBUjtBQUFnQkUsVUFBQUEsSUFBSSxFQUFFUjtBQUF0QixTQUFSO0FBQ0EsT0FGTSxNQUVBLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsUUFBaEMsRUFBMEM7QUFDaERJLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsS0FBUjtBQUFlRyxVQUFBQSxHQUFHLEVBQUVUO0FBQXBCLFNBQVI7QUFDQSxPQUZNLE1BRUEsSUFBSVUsS0FBSyxDQUFDQyxPQUFOLENBQWNYLGdCQUFkLENBQUosRUFBcUM7QUFDM0NJLFFBQUFBLEtBQUssR0FBRztBQUNQRSxVQUFBQSxJQUFJLEVBQUUsWUFEQztBQUVQTSxVQUFBQSxVQUFVLEVBQUVaLGdCQUFnQixDQUFDYSxHQUFqQixDQUFxQixVQUFDQyxtQkFBRCxFQUFzQkMsd0JBQXRCO0FBQUEsbUJBQ2hDLEtBQUksQ0FBQ0MscUJBQUwsQ0FDQ0YsbUJBREQsRUFFQ1QscUJBQXFCLEdBQUcsR0FBeEIsR0FBOEJVLHdCQUYvQixFQUdDWixnQkFIRCxDQURnQztBQUFBLFdBQXJCO0FBRkwsU0FBUjs7QUFVQSxZQUFJSCxnQkFBZ0IsQ0FBQ2lCLE1BQWpCLEdBQTBCLENBQTlCLEVBQWlDO0FBQ2hDLGNBQUlqQixnQkFBZ0IsQ0FBQyxDQUFELENBQWhCLENBQW9Ca0IsY0FBcEIsQ0FBbUMsZUFBbkMsQ0FBSixFQUF5RDtBQUN2RGQsWUFBQUEsS0FBSyxDQUFDUSxVQUFQLENBQTBCTixJQUExQixHQUFpQyxjQUFqQztBQUNBLFdBRkQsTUFFTyxJQUFJTixnQkFBZ0IsQ0FBQyxDQUFELENBQWhCLENBQW9Ca0IsY0FBcEIsQ0FBbUMsT0FBbkMsQ0FBSixFQUFpRDtBQUN0RGQsWUFBQUEsS0FBSyxDQUFDUSxVQUFQLENBQTBCTixJQUExQixHQUFpQyxNQUFqQztBQUNBLFdBRk0sTUFFQSxJQUFJTixnQkFBZ0IsQ0FBQyxDQUFELENBQWhCLENBQW9Ca0IsY0FBcEIsQ0FBbUMseUJBQW5DLENBQUosRUFBbUU7QUFDeEVkLFlBQUFBLEtBQUssQ0FBQ1EsVUFBUCxDQUEwQk4sSUFBMUIsR0FBaUMsd0JBQWpDO0FBQ0EsV0FGTSxNQUVBLElBQUlOLGdCQUFnQixDQUFDLENBQUQsQ0FBaEIsQ0FBb0JrQixjQUFwQixDQUFtQyxpQkFBbkMsQ0FBSixFQUEyRDtBQUNoRWQsWUFBQUEsS0FBSyxDQUFDUSxVQUFQLENBQTBCTixJQUExQixHQUFpQyxnQkFBakM7QUFDQSxXQUZNLE1BRUEsSUFBSU4sZ0JBQWdCLENBQUMsQ0FBRCxDQUFoQixDQUFvQmtCLGNBQXBCLENBQW1DLE9BQW5DLENBQUosRUFBaUQ7QUFDdERkLFlBQUFBLEtBQUssQ0FBQ1EsVUFBUCxDQUEwQk4sSUFBMUIsR0FBaUMsUUFBakM7QUFDQSxXQUZNLE1BRUEsSUFBSSxPQUFPTixnQkFBZ0IsQ0FBQyxDQUFELENBQXZCLEtBQStCLFFBQW5DLEVBQTZDO0FBQ25EO0FBQ0NJLFlBQUFBLEtBQUssQ0FBQ1EsVUFBUCxDQUEwQk4sSUFBMUIsR0FBaUMsUUFBakM7QUFDQSxXQUhNLE1BR0E7QUFDTEYsWUFBQUEsS0FBSyxDQUFDUSxVQUFQLENBQTBCTixJQUExQixHQUFpQyxRQUFqQztBQUNBO0FBQ0Q7QUFDRCxPQTdCTSxNQTZCQSxJQUFJTixnQkFBZ0IsQ0FBQ21CLEtBQWpCLEtBQTJCQyxTQUEvQixFQUEwQztBQUNoRGhCLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsTUFBUjtBQUFnQmUsVUFBQUEsSUFBSSxFQUFFckIsZ0JBQWdCLENBQUNtQjtBQUF2QyxTQUFSO0FBQ0EsT0FGTSxNQUVBLElBQUluQixnQkFBZ0IsQ0FBQ3NCLFFBQWpCLEtBQThCRixTQUFsQyxFQUE2QztBQUNuRGhCLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsU0FBUjtBQUFtQmlCLFVBQUFBLE9BQU8sRUFBRUMsVUFBVSxDQUFDeEIsZ0JBQWdCLENBQUNzQixRQUFsQjtBQUF0QyxTQUFSO0FBQ0EsT0FGTSxNQUVBLElBQUl0QixnQkFBZ0IsQ0FBQ3lCLGFBQWpCLEtBQW1DTCxTQUF2QyxFQUFrRDtBQUN4RGhCLFFBQUFBLEtBQUssR0FBRztBQUFFRSxVQUFBQSxJQUFJLEVBQUUsY0FBUjtBQUF3Qm9CLFVBQUFBLFlBQVksRUFBRTFCLGdCQUFnQixDQUFDeUI7QUFBdkQsU0FBUjtBQUNBLE9BRk0sTUFFQSxJQUFJekIsZ0JBQWdCLENBQUMyQix1QkFBakIsS0FBNkNQLFNBQWpELEVBQTREO0FBQ2xFaEIsUUFBQUEsS0FBSyxHQUFHO0FBQ1BFLFVBQUFBLElBQUksRUFBRSx3QkFEQztBQUVQc0IsVUFBQUEsc0JBQXNCLEVBQUU1QixnQkFBZ0IsQ0FBQzJCO0FBRmxDLFNBQVI7QUFJQSxPQUxNLE1BS0EsSUFBSTNCLGdCQUFnQixDQUFDNkIsZUFBakIsS0FBcUNULFNBQXpDLEVBQW9EO0FBQzFEaEIsUUFBQUEsS0FBSyxHQUFHO0FBQUVFLFVBQUFBLElBQUksRUFBRSxnQkFBUjtBQUEwQndCLFVBQUFBLGNBQWMsRUFBRTlCLGdCQUFnQixDQUFDNkI7QUFBM0QsU0FBUjtBQUNBLE9BRk0sTUFFQSxJQUFJN0IsZ0JBQWdCLENBQUMrQixXQUFqQixLQUFpQ1gsU0FBckMsRUFBZ0Q7QUFDdERoQixRQUFBQSxLQUFLLEdBQUc7QUFDUEUsVUFBQUEsSUFBSSxFQUFFLFlBREM7QUFFUDBCLFVBQUFBLFVBQVUsRUFDVCxLQUFLQyxjQUFMLENBQW9CakMsZ0JBQWdCLENBQUMrQixXQUFqQixDQUE2QkcsS0FBN0IsQ0FBbUMsR0FBbkMsRUFBd0MsQ0FBeEMsQ0FBcEIsSUFBa0UsR0FBbEUsR0FBd0VsQyxnQkFBZ0IsQ0FBQytCLFdBQWpCLENBQTZCRyxLQUE3QixDQUFtQyxHQUFuQyxFQUF3QyxDQUF4QztBQUhsRSxTQUFSO0FBS0EsT0FOTSxNQU1BLElBQUlsQyxnQkFBZ0IsQ0FBQ21DLEtBQXJCLEVBQTRCO0FBQ2xDL0IsUUFBQUEsS0FBSyxHQUFHO0FBQ1BFLFVBQUFBLElBQUksRUFBRSxRQURDO0FBRVA4QixVQUFBQSxNQUFNLEVBQUUsS0FBS3BCLHFCQUFMLENBQTJCaEIsZ0JBQTNCLEVBQTZDRSxhQUE3QyxFQUE0REMsZ0JBQTVEO0FBRkQsU0FBUjtBQUlBOztBQUVELGFBQU87QUFDTmtDLFFBQUFBLElBQUksRUFBRXBDLFdBREE7QUFFTkcsUUFBQUEsS0FBSyxFQUFMQTtBQUZNLE9BQVA7QUFJQSxLQXJFeUI7QUFzRTFCNkIsSUFBQUEsY0F0RTBCLFlBc0VYSyxjQXRFVyxFQXNFcUI7QUFBQSxrQ0FDbkJBLGNBQWMsQ0FBQ0osS0FBZixDQUFxQixHQUFyQixDQURtQjtBQUFBO0FBQUEsVUFDekNLLFFBRHlDO0FBQUEsVUFDL0JDLFFBRCtCOztBQUU5QyxVQUFJLENBQUNBLFFBQUwsRUFBZTtBQUNkQSxRQUFBQSxRQUFRLEdBQUdELFFBQVg7QUFDQUEsUUFBQUEsUUFBUSxHQUFHLEVBQVg7QUFDQSxPQUhELE1BR087QUFDTkEsUUFBQUEsUUFBUSxJQUFJLEdBQVo7QUFDQTs7QUFDRCxVQUFNRSxPQUFPLEdBQUdELFFBQVEsQ0FBQ0UsV0FBVCxDQUFxQixHQUFyQixDQUFoQjtBQUNBLGFBQU9ILFFBQVEsR0FBR0ksZ0JBQWdCLENBQUNILFFBQVEsQ0FBQ0ksTUFBVCxDQUFnQixDQUFoQixFQUFtQkgsT0FBbkIsQ0FBRCxDQUEzQixHQUEyRCxHQUEzRCxHQUFpRUQsUUFBUSxDQUFDSSxNQUFULENBQWdCSCxPQUFPLEdBQUcsQ0FBMUIsQ0FBeEU7QUFDQSxLQWhGeUI7QUFpRjFCekIsSUFBQUEscUJBakYwQixZQWtGekJoQixnQkFsRnlCLEVBbUZ6QjZDLG1CQW5GeUIsRUFvRnpCMUMsZ0JBcEZ5QixFQXFGb0I7QUFBQTs7QUFDN0MsVUFBSTJDLHNCQUEyQixHQUFHLEVBQWxDO0FBQ0EsVUFBSUMsWUFBWSxHQUFHLEtBQW5COztBQUNBLFVBQUksT0FBTy9DLGdCQUFQLEtBQTRCLFFBQWhDLEVBQTBDO0FBQ3pDOEMsUUFBQUEsc0JBQXNCLEdBQUc7QUFBRXhDLFVBQUFBLElBQUksRUFBRSxRQUFSO0FBQWtCQyxVQUFBQSxNQUFNLEVBQUVQO0FBQTFCLFNBQXpCO0FBQ0EsT0FGRCxNQUVPLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsU0FBaEMsRUFBMkM7QUFDakQ4QyxRQUFBQSxzQkFBc0IsR0FBRztBQUFFeEMsVUFBQUEsSUFBSSxFQUFFLE1BQVI7QUFBZ0JFLFVBQUFBLElBQUksRUFBRVI7QUFBdEIsU0FBekI7QUFDQSxPQUZNLE1BRUEsSUFBSSxPQUFPQSxnQkFBUCxLQUE0QixRQUFoQyxFQUEwQztBQUNoRDhDLFFBQUFBLHNCQUFzQixHQUFHO0FBQUV4QyxVQUFBQSxJQUFJLEVBQUUsS0FBUjtBQUFlRyxVQUFBQSxHQUFHLEVBQUVUO0FBQXBCLFNBQXpCO0FBQ0EsT0FGTSxNQUVBLElBQUlBLGdCQUFnQixDQUFDNkIsZUFBakIsS0FBcUNULFNBQXpDLEVBQW9EO0FBQzFEMEIsUUFBQUEsc0JBQXNCLEdBQUc7QUFBRXhDLFVBQUFBLElBQUksRUFBRSxnQkFBUjtBQUEwQndCLFVBQUFBLGNBQWMsRUFBRTlCLGdCQUFnQixDQUFDNkI7QUFBM0QsU0FBekI7QUFDQSxPQUZNLE1BRUEsSUFBSTdCLGdCQUFnQixDQUFDbUIsS0FBakIsS0FBMkJDLFNBQS9CLEVBQTBDO0FBQ2hEMEIsUUFBQUEsc0JBQXNCLEdBQUc7QUFBRXhDLFVBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCZSxVQUFBQSxJQUFJLEVBQUVyQixnQkFBZ0IsQ0FBQ21CO0FBQXZDLFNBQXpCO0FBQ0EsT0FGTSxNQUVBLElBQUluQixnQkFBZ0IsQ0FBQ3NCLFFBQWpCLEtBQThCRixTQUFsQyxFQUE2QztBQUNuRDBCLFFBQUFBLHNCQUFzQixHQUFHO0FBQUV4QyxVQUFBQSxJQUFJLEVBQUUsU0FBUjtBQUFtQmlCLFVBQUFBLE9BQU8sRUFBRUMsVUFBVSxDQUFDeEIsZ0JBQWdCLENBQUNzQixRQUFsQjtBQUF0QyxTQUF6QjtBQUNBLE9BRk0sTUFFQSxJQUFJdEIsZ0JBQWdCLENBQUN5QixhQUFqQixLQUFtQ0wsU0FBdkMsRUFBa0Q7QUFDeEQwQixRQUFBQSxzQkFBc0IsR0FBRztBQUFFeEMsVUFBQUEsSUFBSSxFQUFFLGNBQVI7QUFBd0JvQixVQUFBQSxZQUFZLEVBQUUxQixnQkFBZ0IsQ0FBQ3lCO0FBQXZELFNBQXpCO0FBQ0EsT0FGTSxNQUVBLElBQUl6QixnQkFBZ0IsQ0FBQzJCLHVCQUFqQixLQUE2Q1AsU0FBakQsRUFBNEQ7QUFDbEUwQixRQUFBQSxzQkFBc0IsR0FBRztBQUN4QnhDLFVBQUFBLElBQUksRUFBRSx3QkFEa0I7QUFFeEJzQixVQUFBQSxzQkFBc0IsRUFBRTVCLGdCQUFnQixDQUFDMkI7QUFGakIsU0FBekI7QUFJQSxPQUxNLE1BS0EsSUFBSTNCLGdCQUFnQixDQUFDK0IsV0FBakIsS0FBaUNYLFNBQXJDLEVBQWdEO0FBQ3REMEIsUUFBQUEsc0JBQXNCLEdBQUc7QUFDeEJ4QyxVQUFBQSxJQUFJLEVBQUUsWUFEa0I7QUFFeEIwQixVQUFBQSxVQUFVLEVBQ1QsS0FBS0MsY0FBTCxDQUFvQmpDLGdCQUFnQixDQUFDK0IsV0FBakIsQ0FBNkJHLEtBQTdCLENBQW1DLEdBQW5DLEVBQXdDLENBQXhDLENBQXBCLElBQWtFLEdBQWxFLEdBQXdFbEMsZ0JBQWdCLENBQUMrQixXQUFqQixDQUE2QkcsS0FBN0IsQ0FBbUMsR0FBbkMsRUFBd0MsQ0FBeEM7QUFIakQsU0FBekI7QUFLQSxPQU5NLE1BTUEsSUFBSXhCLEtBQUssQ0FBQ0MsT0FBTixDQUFjWCxnQkFBZCxDQUFKLEVBQXFDO0FBQzNDK0MsUUFBQUEsWUFBWSxHQUFHLElBQWY7QUFDQSxZQUFNQywwQkFBMEIsR0FBR0Ysc0JBQW5DO0FBQ0FFLFFBQUFBLDBCQUEwQixDQUFDQyxVQUEzQixHQUF3Q2pELGdCQUFnQixDQUFDYSxHQUFqQixDQUFxQixVQUFDQyxtQkFBRCxFQUFzQm9DLGtCQUF0QjtBQUFBLGlCQUM1RCxNQUFJLENBQUNsQyxxQkFBTCxDQUEyQkYsbUJBQTNCLEVBQWdEK0IsbUJBQW1CLEdBQUcsR0FBdEIsR0FBNEJLLGtCQUE1RSxFQUFnRy9DLGdCQUFoRyxDQUQ0RDtBQUFBLFNBQXJCLENBQXhDOztBQUdBLFlBQUlILGdCQUFnQixDQUFDaUIsTUFBakIsR0FBMEIsQ0FBOUIsRUFBaUM7QUFDaEMsY0FBSWpCLGdCQUFnQixDQUFDLENBQUQsQ0FBaEIsQ0FBb0JrQixjQUFwQixDQUFtQyxlQUFuQyxDQUFKLEVBQXlEO0FBQ3ZEOEIsWUFBQUEsMEJBQTBCLENBQUNDLFVBQTVCLENBQStDM0MsSUFBL0MsR0FBc0QsY0FBdEQ7QUFDQSxXQUZELE1BRU8sSUFBSU4sZ0JBQWdCLENBQUMsQ0FBRCxDQUFoQixDQUFvQmtCLGNBQXBCLENBQW1DLE9BQW5DLENBQUosRUFBaUQ7QUFDdEQ4QixZQUFBQSwwQkFBMEIsQ0FBQ0MsVUFBNUIsQ0FBK0MzQyxJQUEvQyxHQUFzRCxNQUF0RDtBQUNBLFdBRk0sTUFFQSxJQUFJTixnQkFBZ0IsQ0FBQyxDQUFELENBQWhCLENBQW9Ca0IsY0FBcEIsQ0FBbUMseUJBQW5DLENBQUosRUFBbUU7QUFDeEU4QixZQUFBQSwwQkFBMEIsQ0FBQ0MsVUFBNUIsQ0FBK0MzQyxJQUEvQyxHQUFzRCx3QkFBdEQ7QUFDQSxXQUZNLE1BRUEsSUFBSU4sZ0JBQWdCLENBQUMsQ0FBRCxDQUFoQixDQUFvQmtCLGNBQXBCLENBQW1DLGlCQUFuQyxDQUFKLEVBQTJEO0FBQ2hFOEIsWUFBQUEsMEJBQTBCLENBQUNDLFVBQTVCLENBQStDM0MsSUFBL0MsR0FBc0QsZ0JBQXREO0FBQ0EsV0FGTSxNQUVBLElBQUlOLGdCQUFnQixDQUFDLENBQUQsQ0FBaEIsQ0FBb0JrQixjQUFwQixDQUFtQyxPQUFuQyxDQUFKLEVBQWlEO0FBQ3REOEIsWUFBQUEsMEJBQTBCLENBQUNDLFVBQTVCLENBQStDM0MsSUFBL0MsR0FBc0QsUUFBdEQ7QUFDQSxXQUZNLE1BRUEsSUFBSSxPQUFPTixnQkFBZ0IsQ0FBQyxDQUFELENBQXZCLEtBQStCLFFBQW5DLEVBQTZDO0FBQ2xEZ0QsWUFBQUEsMEJBQTBCLENBQUNDLFVBQTVCLENBQStDM0MsSUFBL0MsR0FBc0QsUUFBdEQ7QUFDQSxXQUZNLE1BRUE7QUFDTDBDLFlBQUFBLDBCQUEwQixDQUFDQyxVQUE1QixDQUErQzNDLElBQS9DLEdBQXNELFFBQXREO0FBQ0E7QUFDRDtBQUNELE9BdkJNLE1BdUJBO0FBQ04sWUFBSU4sZ0JBQWdCLENBQUNtQyxLQUFyQixFQUE0QjtBQUMzQixjQUFNZ0IsU0FBUyxHQUFHbkQsZ0JBQWdCLENBQUNtQyxLQUFuQztBQUNBLGNBQU1pQixTQUFTLEdBQUdULGdCQUFnQixDQUFDUSxTQUFTLENBQUNQLE1BQVYsQ0FBaUIsQ0FBakIsRUFBb0JPLFNBQVMsQ0FBQ1QsV0FBVixDQUFzQixHQUF0QixDQUFwQixDQUFELENBQWxDO0FBQ0EsY0FBTVcsUUFBUSxHQUFHRixTQUFTLENBQUNQLE1BQVYsQ0FBaUJPLFNBQVMsQ0FBQ1QsV0FBVixDQUFzQixHQUF0QixJQUE2QixDQUE5QyxDQUFqQjtBQUNBSSxVQUFBQSxzQkFBc0IsQ0FBQ3hDLElBQXZCLGFBQWlDOEMsU0FBakMsY0FBOENDLFFBQTlDO0FBQ0E7O0FBQ0QsWUFBTUMsY0FBbUIsR0FBRyxFQUE1QjtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXhELGdCQUFaLEVBQThCeUQsT0FBOUIsQ0FBc0MsVUFBQXhELFdBQVcsRUFBSTtBQUNwRCxjQUFJQSxXQUFXLEtBQUssT0FBaEIsSUFBMkIsQ0FBQ0EsV0FBVyxDQUFDeUQsVUFBWixDQUF1QixHQUF2QixDQUFoQyxFQUE2RDtBQUM1REosWUFBQUEsY0FBYyxDQUFDSyxJQUFmLENBQ0MsTUFBSSxDQUFDNUQsa0JBQUwsQ0FBd0JDLGdCQUFnQixDQUFDQyxXQUFELENBQXhDLEVBQXVEQSxXQUF2RCxFQUFvRTRDLG1CQUFwRSxFQUF5RjFDLGdCQUF6RixDQUREO0FBR0EsV0FKRCxNQUlPLElBQUlGLFdBQVcsQ0FBQ3lELFVBQVosQ0FBdUIsR0FBdkIsQ0FBSixFQUFpQztBQUN2QztBQUNBLGdCQUFNRSx3QkFBd0IsR0FBRzNELFdBQVcsQ0FBQ2lDLEtBQVosQ0FBa0IsR0FBbEIsQ0FBakM7QUFDQSxnQkFBTTJCLFNBQVMsR0FBR0Qsd0JBQXdCLENBQUMsQ0FBRCxDQUExQztBQUNBLGdCQUFJRSxhQUFhLEdBQUdGLHdCQUF3QixDQUFDLENBQUQsQ0FBNUMsQ0FKdUMsQ0FLdkM7O0FBQ0EsZ0JBQUlHLDBCQUEwQixHQUFHLE1BQUksQ0FBQ0MseUJBQUwsQ0FBK0JuQixtQkFBL0IsRUFBb0QxQyxnQkFBcEQsQ0FBakM7O0FBQ0E0RCxZQUFBQSwwQkFBMEIsQ0FBQ0UsV0FBM0IsQ0FBdUNOLElBQXZDLENBQTRDO0FBQzNDTyxjQUFBQSxJQUFJLEVBQUUsTUFBSSxDQUFDakMsY0FBTCxDQUFvQjZCLGFBQWEsQ0FBQ2xCLE1BQWQsQ0FBcUIsQ0FBckIsQ0FBcEIsQ0FEcUM7QUFFM0NpQixjQUFBQSxTQUFTLEVBQUVBLFNBRmdDO0FBRzNDekQsY0FBQUEsS0FBSyxFQUFFLE1BQUksQ0FBQ1kscUJBQUwsQ0FDTmhCLGdCQUFnQixDQUFDQyxXQUFELENBRFYsRUFFTjRDLG1CQUZNLEVBR04xQyxnQkFITSxDQUhvQztBQVEzQzRDLGNBQUFBLFlBQVksRUFBRTtBQVI2QixhQUE1QztBQVVBO0FBQ0QsU0F2QkQ7QUF3QkFELFFBQUFBLHNCQUFzQixDQUFDUSxjQUF2QixHQUF3Q0EsY0FBeEM7QUFDQTs7QUFDRCxhQUFPUixzQkFBUDtBQUNBLEtBM0t5QjtBQTRLMUJrQixJQUFBQSx5QkE1SzBCLFlBNEtBRyxNQTVLQSxFQTRLZ0JoRSxnQkE1S2hCLEVBNEtvRTtBQUM3RixVQUFJaUUsZUFBZSxHQUFHakUsZ0JBQWdCLENBQUNrRSxJQUFqQixDQUFzQixVQUFBQyxjQUFjO0FBQUEsZUFBSUEsY0FBYyxDQUFDSCxNQUFmLEtBQTBCQSxNQUE5QjtBQUFBLE9BQXBDLENBQXRCOztBQUNBLFVBQUksQ0FBQ0MsZUFBTCxFQUFzQjtBQUNyQkEsUUFBQUEsZUFBZSxHQUFHO0FBQ2pCRCxVQUFBQSxNQUFNLEVBQUVBLE1BRFM7QUFFakJGLFVBQUFBLFdBQVcsRUFBRTtBQUZJLFNBQWxCO0FBSUE5RCxRQUFBQSxnQkFBZ0IsQ0FBQ3dELElBQWpCLENBQXNCUyxlQUF0QjtBQUNBOztBQUNELGFBQU9BLGVBQVA7QUFDQSxLQXRMeUI7QUF3TDFCRyxJQUFBQSxxQkF4TDBCLFlBd0xKQyxVQXhMSSxFQXdMd0JDLGlCQXhMeEIsRUF3TGdEQyxnQkF4TGhELEVBd0wwRUMsZUF4TDFFLEVBd0xrRztBQUFBOztBQUMzSCxVQUFNQyxtQkFBd0IsR0FBRztBQUNoQ1QsUUFBQUEsTUFBTSxFQUFFTyxnQkFEd0I7QUFFaENULFFBQUFBLFdBQVcsRUFBRTtBQUZtQixPQUFqQztBQUlBVixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWWlCLGlCQUFaLEVBQStCaEIsT0FBL0IsQ0FBdUMsVUFBQUssYUFBYSxFQUFJO0FBQ3ZELFlBQUlDLDBCQUEwQixHQUFHYSxtQkFBakM7QUFDQSxZQUFNNUUsZ0JBQWdCLEdBQUd5RSxpQkFBaUIsQ0FBQ1gsYUFBRCxDQUExQztBQUNBLFlBQU1GLHdCQUF3QixHQUFHRSxhQUFhLENBQUM1QixLQUFkLENBQW9CLEdBQXBCLENBQWpDO0FBQ0EsWUFBTTJCLFNBQVMsR0FBR0Qsd0JBQXdCLENBQUMsQ0FBRCxDQUExQztBQUNBRSxRQUFBQSxhQUFhLEdBQUdGLHdCQUF3QixDQUFDLENBQUQsQ0FBeEMsQ0FMdUQsQ0FNdkQ7O0FBQ0EsWUFBTWlCLDJCQUEyQixHQUFHZixhQUFhLENBQUM1QixLQUFkLENBQW9CLEdBQXBCLENBQXBDOztBQUNBLFlBQUkyQywyQkFBMkIsQ0FBQzVELE1BQTVCLEdBQXFDLENBQXpDLEVBQTRDO0FBQzNDOEMsVUFBQUEsMEJBQTBCLEdBQUcsTUFBSSxDQUFDQyx5QkFBTCxDQUM1QlUsZ0JBQWdCLEdBQUcsR0FBbkIsR0FBeUIsTUFBSSxDQUFDekMsY0FBTCxDQUFvQjRDLDJCQUEyQixDQUFDLENBQUQsQ0FBL0MsQ0FERyxFQUU1QkYsZUFGNEIsQ0FBN0I7QUFJQWIsVUFBQUEsYUFBYSxHQUFHZSwyQkFBMkIsQ0FBQyxDQUFELENBQTNDO0FBQ0EsU0FORCxNQU1PO0FBQ05mLFVBQUFBLGFBQWEsR0FBR2UsMkJBQTJCLENBQUMsQ0FBRCxDQUEzQztBQUNBOztBQUVELFlBQU1DLGVBQWUsR0FBR25DLGdCQUFnQixDQUFDbUIsYUFBYSxDQUFDbEIsTUFBZCxDQUFxQixDQUFyQixFQUF3QmtCLGFBQWEsQ0FBQ3BCLFdBQWQsQ0FBMEIsR0FBMUIsQ0FBeEIsQ0FBRCxDQUF4QztBQUNBLFlBQU1xQyxjQUFjLEdBQUdqQixhQUFhLENBQUNsQixNQUFkLENBQXFCa0IsYUFBYSxDQUFDcEIsV0FBZCxDQUEwQixHQUExQixJQUFpQyxDQUF0RCxDQUF2QjtBQUNBLFlBQU1JLHNCQUEyQixHQUFHO0FBQ25Db0IsVUFBQUEsSUFBSSxZQUFLWSxlQUFMLGNBQXdCQyxjQUF4QixDQUQrQjtBQUVuQ2xCLFVBQUFBLFNBQVMsRUFBRUE7QUFGd0IsU0FBcEM7QUFJQSxZQUFJbUIsdUJBQXVCLEdBQUdOLGdCQUFnQixHQUFHLEdBQW5CLEdBQXlCNUIsc0JBQXNCLENBQUNvQixJQUE5RTs7QUFDQSxZQUFJTCxTQUFKLEVBQWU7QUFDZG1CLFVBQUFBLHVCQUF1QixJQUFJLE1BQU1uQixTQUFqQztBQUNBOztBQUNELFlBQUlkLFlBQVksR0FBRyxLQUFuQjs7QUFDQSxZQUFJL0MsZ0JBQWdCLEtBQUssSUFBekIsRUFBK0I7QUFDOUI4QyxVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQUVFLFlBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCRSxZQUFBQSxJQUFJLEVBQUVSO0FBQXRCLFdBQS9CO0FBQ0EsU0FGRCxNQUVPLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsUUFBaEMsRUFBMEM7QUFDaEQ4QyxVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQUVFLFlBQUFBLElBQUksRUFBRSxRQUFSO0FBQWtCQyxZQUFBQSxNQUFNLEVBQUVQO0FBQTFCLFdBQS9CO0FBQ0EsU0FGTSxNQUVBLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsU0FBaEMsRUFBMkM7QUFDakQ4QyxVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQUVFLFlBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCRSxZQUFBQSxJQUFJLEVBQUVSO0FBQXRCLFdBQS9CO0FBQ0EsU0FGTSxNQUVBLElBQUksT0FBT0EsZ0JBQVAsS0FBNEIsUUFBaEMsRUFBMEM7QUFDaEQ4QyxVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQUVFLFlBQUFBLElBQUksRUFBRSxLQUFSO0FBQWVHLFlBQUFBLEdBQUcsRUFBRVQ7QUFBcEIsV0FBL0I7QUFDQSxTQUZNLE1BRUEsSUFBSUEsZ0JBQWdCLENBQUNtQixLQUFqQixLQUEyQkMsU0FBL0IsRUFBMEM7QUFDaEQwQixVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQUVFLFlBQUFBLElBQUksRUFBRSxNQUFSO0FBQWdCZSxZQUFBQSxJQUFJLEVBQUVyQixnQkFBZ0IsQ0FBQ21CO0FBQXZDLFdBQS9CO0FBQ0EsU0FGTSxNQUVBLElBQUluQixnQkFBZ0IsQ0FBQzZCLGVBQWpCLEtBQXFDVCxTQUF6QyxFQUFvRDtBQUMxRDBCLFVBQUFBLHNCQUFzQixDQUFDMUMsS0FBdkIsR0FBK0I7QUFDOUJFLFlBQUFBLElBQUksRUFBRSxnQkFEd0I7QUFFOUJ3QixZQUFBQSxjQUFjLEVBQUU5QixnQkFBZ0IsQ0FBQzZCO0FBRkgsV0FBL0I7QUFJQSxTQUxNLE1BS0EsSUFBSTdCLGdCQUFnQixDQUFDc0IsUUFBakIsS0FBOEJGLFNBQWxDLEVBQTZDO0FBQ25EMEIsVUFBQUEsc0JBQXNCLENBQUMxQyxLQUF2QixHQUErQjtBQUFFRSxZQUFBQSxJQUFJLEVBQUUsU0FBUjtBQUFtQmlCLFlBQUFBLE9BQU8sRUFBRUMsVUFBVSxDQUFDeEIsZ0JBQWdCLENBQUNzQixRQUFsQjtBQUF0QyxXQUEvQjtBQUNBLFNBRk0sTUFFQSxJQUFJdEIsZ0JBQWdCLENBQUMrQixXQUFqQixLQUFpQ1gsU0FBckMsRUFBZ0Q7QUFDdEQwQixVQUFBQSxzQkFBc0IsQ0FBQzFDLEtBQXZCLEdBQStCO0FBQzlCRSxZQUFBQSxJQUFJLEVBQUUsWUFEd0I7QUFFOUIwQixZQUFBQSxVQUFVLEVBQ1QsTUFBSSxDQUFDQyxjQUFMLENBQW9CakMsZ0JBQWdCLENBQUMrQixXQUFqQixDQUE2QkcsS0FBN0IsQ0FBbUMsR0FBbkMsRUFBd0MsQ0FBeEMsQ0FBcEIsSUFBa0UsR0FBbEUsR0FBd0VsQyxnQkFBZ0IsQ0FBQytCLFdBQWpCLENBQTZCRyxLQUE3QixDQUFtQyxHQUFuQyxFQUF3QyxDQUF4QztBQUgzQyxXQUEvQjtBQUtBLFNBTk0sTUFNQSxJQUFJeEIsS0FBSyxDQUFDQyxPQUFOLENBQWNYLGdCQUFkLENBQUosRUFBcUM7QUFDM0MrQyxVQUFBQSxZQUFZLEdBQUcsSUFBZjtBQUNBRCxVQUFBQSxzQkFBc0IsQ0FBQ0csVUFBdkIsR0FBb0NqRCxnQkFBZ0IsQ0FBQ2EsR0FBakIsQ0FBcUIsVUFBQ0MsbUJBQUQsRUFBc0JvQyxrQkFBdEI7QUFBQSxtQkFDeEQsTUFBSSxDQUFDbEMscUJBQUwsQ0FBMkJGLG1CQUEzQixFQUFnRGtFLHVCQUF1QixHQUFHLEdBQTFCLEdBQWdDOUIsa0JBQWhGLEVBQW9HeUIsZUFBcEcsQ0FEd0Q7QUFBQSxXQUFyQixDQUFwQzs7QUFHQSxjQUFJM0UsZ0JBQWdCLENBQUNpQixNQUFqQixHQUEwQixDQUE5QixFQUFpQztBQUNoQyxnQkFBSWpCLGdCQUFnQixDQUFDLENBQUQsQ0FBaEIsQ0FBb0JrQixjQUFwQixDQUFtQyxlQUFuQyxDQUFKLEVBQXlEO0FBQ3ZENEIsY0FBQUEsc0JBQXNCLENBQUNHLFVBQXhCLENBQTJDM0MsSUFBM0MsR0FBa0QsY0FBbEQ7QUFDQSxhQUZELE1BRU8sSUFBSU4sZ0JBQWdCLENBQUMsQ0FBRCxDQUFoQixDQUFvQmtCLGNBQXBCLENBQW1DLE9BQW5DLENBQUosRUFBaUQ7QUFDdEQ0QixjQUFBQSxzQkFBc0IsQ0FBQ0csVUFBeEIsQ0FBMkMzQyxJQUEzQyxHQUFrRCxNQUFsRDtBQUNBLGFBRk0sTUFFQSxJQUFJTixnQkFBZ0IsQ0FBQyxDQUFELENBQWhCLENBQW9Ca0IsY0FBcEIsQ0FBbUMseUJBQW5DLENBQUosRUFBbUU7QUFDeEU0QixjQUFBQSxzQkFBc0IsQ0FBQ0csVUFBeEIsQ0FBMkMzQyxJQUEzQyxHQUFrRCx3QkFBbEQ7QUFDQSxhQUZNLE1BRUEsSUFBSU4sZ0JBQWdCLENBQUMsQ0FBRCxDQUFoQixDQUFvQmtCLGNBQXBCLENBQW1DLGlCQUFuQyxDQUFKLEVBQTJEO0FBQ2hFNEIsY0FBQUEsc0JBQXNCLENBQUNHLFVBQXhCLENBQTJDM0MsSUFBM0MsR0FBa0QsZ0JBQWxEO0FBQ0EsYUFGTSxNQUVBLElBQUlOLGdCQUFnQixDQUFDLENBQUQsQ0FBaEIsQ0FBb0JrQixjQUFwQixDQUFtQyxPQUFuQyxDQUFKLEVBQWlEO0FBQ3RENEIsY0FBQUEsc0JBQXNCLENBQUNHLFVBQXhCLENBQTJDM0MsSUFBM0MsR0FBa0QsUUFBbEQ7QUFDQSxhQUZNLE1BRUEsSUFBSSxPQUFPTixnQkFBZ0IsQ0FBQyxDQUFELENBQXZCLEtBQStCLFFBQW5DLEVBQTZDO0FBQ2xEOEMsY0FBQUEsc0JBQXNCLENBQUNHLFVBQXhCLENBQTJDM0MsSUFBM0MsR0FBa0QsUUFBbEQ7QUFDQSxhQUZNLE1BRUE7QUFDTHdDLGNBQUFBLHNCQUFzQixDQUFDRyxVQUF4QixDQUEyQzNDLElBQTNDLEdBQWtELFFBQWxEO0FBQ0E7QUFDRDtBQUNELFNBdEJNLE1Bc0JBO0FBQ04sY0FBTTJFLE1BQXdCLEdBQUc7QUFDaEMzQixZQUFBQSxjQUFjLEVBQUU7QUFEZ0IsV0FBakM7O0FBR0EsY0FBSXRELGdCQUFnQixDQUFDbUMsS0FBckIsRUFBNEI7QUFDM0IsZ0JBQU1nQixTQUFTLEdBQUduRCxnQkFBZ0IsQ0FBQ21DLEtBQW5DO0FBQ0EsZ0JBQU1pQixTQUFTLEdBQUdULGdCQUFnQixDQUFDUSxTQUFTLENBQUNQLE1BQVYsQ0FBaUIsQ0FBakIsRUFBb0JPLFNBQVMsQ0FBQ1QsV0FBVixDQUFzQixHQUF0QixDQUFwQixDQUFELENBQWxDO0FBQ0EsZ0JBQU1XLFFBQVEsR0FBR0YsU0FBUyxDQUFDUCxNQUFWLENBQWlCTyxTQUFTLENBQUNULFdBQVYsQ0FBc0IsR0FBdEIsSUFBNkIsQ0FBOUMsQ0FBakI7QUFDQXVDLFlBQUFBLE1BQU0sQ0FBQzNFLElBQVAsYUFBaUI4QyxTQUFqQixjQUE4QkMsUUFBOUI7QUFDQTs7QUFDRCxjQUFNQyxjQUFxQixHQUFHLEVBQTlCO0FBQ0FDLFVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZeEQsZ0JBQVosRUFBOEJ5RCxPQUE5QixDQUFzQyxVQUFBeEQsV0FBVyxFQUFJO0FBQ3BELGdCQUFJQSxXQUFXLEtBQUssT0FBaEIsSUFBMkIsQ0FBQ0EsV0FBVyxDQUFDeUQsVUFBWixDQUF1QixHQUF2QixDQUFoQyxFQUE2RDtBQUM1REosY0FBQUEsY0FBYyxDQUFDSyxJQUFmLENBQ0MsTUFBSSxDQUFDNUQsa0JBQUwsQ0FBd0JDLGdCQUFnQixDQUFDQyxXQUFELENBQXhDLEVBQXVEQSxXQUF2RCxFQUFvRStFLHVCQUFwRSxFQUE2RkwsZUFBN0YsQ0FERDtBQUdBLGFBSkQsTUFJTyxJQUFJMUUsV0FBVyxDQUFDeUQsVUFBWixDQUF1QixHQUF2QixDQUFKLEVBQWlDO0FBQ3ZDO0FBQ0FpQixjQUFBQSxlQUFlLENBQUNoQixJQUFoQixDQUFxQjtBQUNwQlEsZ0JBQUFBLE1BQU0sRUFBRWEsdUJBRFk7QUFFcEJmLGdCQUFBQSxXQUFXLEVBQUUsQ0FDWjtBQUNDN0Qsa0JBQUFBLEtBQUssRUFBRSxNQUFJLENBQUNZLHFCQUFMLENBQ05oQixnQkFBZ0IsQ0FBQ0MsV0FBRCxDQURWLEVBRU4rRSx1QkFGTSxFQUdOTCxlQUhNO0FBRFIsaUJBRFk7QUFGTyxlQUFyQjtBQVlBO0FBQ0QsV0FwQkQ7QUFxQkFNLFVBQUFBLE1BQU0sQ0FBQzNCLGNBQVAsR0FBd0JBLGNBQXhCO0FBQ0FSLFVBQUFBLHNCQUFzQixDQUFDbUMsTUFBdkIsR0FBZ0NBLE1BQWhDO0FBQ0E7O0FBQ0RuQyxRQUFBQSxzQkFBc0IsQ0FBQ0MsWUFBdkIsR0FBc0NBLFlBQXRDO0FBQ0FnQixRQUFBQSwwQkFBMEIsQ0FBQ0UsV0FBM0IsQ0FBdUNOLElBQXZDLENBQTRDYixzQkFBNUM7QUFDQSxPQS9HRDs7QUFnSEEsVUFBSThCLG1CQUFtQixDQUFDWCxXQUFwQixDQUFnQ2hELE1BQWhDLEdBQXlDLENBQTdDLEVBQWdEO0FBQy9DMEQsUUFBQUEsZUFBZSxDQUFDaEIsSUFBaEIsQ0FBcUJpQixtQkFBckI7QUFDQTtBQUNELEtBaFR5QjtBQWlUMUJNLElBQUFBLGFBalQwQixZQWlUWlYsVUFqVFksRUFpVEtXLGdCQWpUTCxFQWlUbUNDLFlBalRuQyxFQWlUeURULGVBalR6RCxFQWlUc0c7QUFDL0gsVUFBTVUsa0JBQWtCLEdBQUdiLFVBQVUsQ0FBQ2MsU0FBWCxZQUF5QkgsZ0JBQWdCLENBQUM5QyxJQUExQyxjQUFrRCtDLFlBQWxELE9BQTNCO0FBQ0EsVUFBTUcsa0JBQWtCLEdBQUdmLFVBQVUsQ0FBQ2MsU0FBWCxZQUF5QkgsZ0JBQWdCLENBQUM5QyxJQUExQyxjQUFrRCtDLFlBQWxELEVBQTNCO0FBRUEsVUFBTUksY0FBd0IsR0FBRztBQUNoQ0MsUUFBQUEsS0FBSyxFQUFFLFVBRHlCO0FBRWhDcEQsUUFBQUEsSUFBSSxFQUFFK0MsWUFGMEI7QUFHaENNLFFBQUFBLGtCQUFrQixZQUFLUCxnQkFBZ0IsQ0FBQ08sa0JBQXRCLGNBQTRDTixZQUE1QyxDQUhjO0FBSWhDOUUsUUFBQUEsSUFBSSxFQUFFaUYsa0JBQWtCLENBQUNwRCxLQUpPO0FBS2hDd0QsUUFBQUEsU0FBUyxFQUFFSixrQkFBa0IsQ0FBQ0ssVUFMRTtBQU1oQ0MsUUFBQUEsU0FBUyxFQUFFTixrQkFBa0IsQ0FBQ08sVUFORTtBQU9oQ0MsUUFBQUEsS0FBSyxFQUFFUixrQkFBa0IsQ0FBQ1MsTUFQTTtBQVFoQ0MsUUFBQUEsUUFBUSxFQUFFVixrQkFBa0IsQ0FBQ1csU0FSRztBQVNoQ2pDLFFBQUFBLFdBQVcsRUFBRTtBQVRtQixPQUFqQztBQVlBLFdBQUtNLHFCQUFMLENBQTJCQyxVQUEzQixFQUF1Q2Esa0JBQXZDLEVBQTJERyxjQUFjLENBQUNFLGtCQUExRSxFQUE4RmYsZUFBOUY7QUFFQSxhQUFPYSxjQUFQO0FBQ0EsS0FwVXlCO0FBcVUxQlcsSUFBQUEsdUJBclUwQixZQXNVekIzQixVQXRVeUIsRUF1VXpCVyxnQkF2VXlCLEVBd1V6QmlCLGVBeFV5QixFQXlVekJ6QixlQXpVeUIsRUEwVUY7QUFDdkIsVUFBTTBCLHFCQUFxQixHQUFHN0IsVUFBVSxDQUFDYyxTQUFYLFlBQXlCSCxnQkFBZ0IsQ0FBQzlDLElBQTFDLGNBQWtEK0QsZUFBbEQsT0FBOUI7QUFDQSxVQUFNRSxxQkFBcUIsR0FBRzlCLFVBQVUsQ0FBQ2MsU0FBWCxZQUF5QkgsZ0JBQWdCLENBQUM5QyxJQUExQyxjQUFrRCtELGVBQWxELEVBQTlCO0FBRUEsVUFBSUcscUJBQThDLEdBQUcsRUFBckQ7O0FBQ0EsVUFBSUQscUJBQXFCLENBQUNFLHNCQUExQixFQUFrRDtBQUNqREQsUUFBQUEscUJBQXFCLEdBQUdoRCxNQUFNLENBQUNDLElBQVAsQ0FBWThDLHFCQUFxQixDQUFDRSxzQkFBbEMsRUFBMEQzRixHQUExRCxDQUE4RCxVQUFBNEYsa0JBQWtCLEVBQUk7QUFDM0csaUJBQU87QUFDTkMsWUFBQUEsY0FBYyxFQUFFdkIsZ0JBQWdCLENBQUM5QyxJQUQzQjtBQUVOc0UsWUFBQUEsY0FBYyxFQUFFRixrQkFGVjtBQUdORyxZQUFBQSxjQUFjLEVBQUVOLHFCQUFxQixDQUFDbkUsS0FIaEM7QUFJTjBFLFlBQUFBLGNBQWMsRUFBRVAscUJBQXFCLENBQUNFLHNCQUF0QixDQUE2Q0Msa0JBQTdDO0FBSlYsV0FBUDtBQU1BLFNBUHVCLENBQXhCO0FBUUE7O0FBQ0QsVUFBTUssa0JBQXdDLEdBQUc7QUFDaERyQixRQUFBQSxLQUFLLEVBQUUsb0JBRHlDO0FBRWhEcEQsUUFBQUEsSUFBSSxFQUFFK0QsZUFGMEM7QUFHaERWLFFBQUFBLGtCQUFrQixZQUFLUCxnQkFBZ0IsQ0FBQ08sa0JBQXRCLGNBQTRDVSxlQUE1QyxDQUg4QjtBQUloRFcsUUFBQUEsT0FBTyxFQUFFVCxxQkFBcUIsQ0FBQ1UsUUFKaUI7QUFLaERqRSxRQUFBQSxZQUFZLEVBQUV1RCxxQkFBcUIsQ0FBQ1csYUFBdEIsR0FBc0NYLHFCQUFxQixDQUFDVyxhQUE1RCxHQUE0RSxLQUwxQztBQU1oREwsUUFBQUEsY0FBYyxFQUFFTixxQkFBcUIsQ0FBQ25FLEtBTlU7QUFPaERvRSxRQUFBQSxxQkFBcUIsRUFBckJBLHFCQVBnRDtBQVFoRHRDLFFBQUFBLFdBQVcsRUFBRTtBQVJtQyxPQUFqRDtBQVdBLFdBQUtNLHFCQUFMLENBQTJCQyxVQUEzQixFQUF1QzZCLHFCQUF2QyxFQUE4RFMsa0JBQWtCLENBQUNwQixrQkFBakYsRUFBcUdmLGVBQXJHO0FBRUEsYUFBT21DLGtCQUFQO0FBQ0EsS0F2V3lCO0FBd1cxQkksSUFBQUEsZUF4VzBCLFlBeVd6QjFDLFVBeld5QixFQTBXekIyQyxhQTFXeUIsRUEyV3pCeEMsZUEzV3lCLEVBNFd6QnlDLG1CQTVXeUIsRUE2VzBCO0FBQUE7O0FBQ25ELFVBQU1DLG1CQUFtQixHQUFHN0MsVUFBVSxDQUFDYyxTQUFYLFlBQXlCNkIsYUFBekIsRUFBNUI7QUFDQSxVQUFNRyxtQkFBbUIsR0FBRzlDLFVBQVUsQ0FBQ2MsU0FBWCxZQUF5QjZCLGFBQXpCLE9BQTVCO0FBQ0EsVUFBTUksb0JBQW9CLEdBQUcvQyxVQUFVLENBQUNjLFNBQVgsWUFBeUI2QixhQUF6QixRQUE3QjtBQUNBLFVBQU1LLG9CQUFvQixHQUFHaEQsVUFBVSxDQUFDYyxTQUFYLFlBQXlCNkIsYUFBekIsT0FBN0I7QUFDQSxVQUFNTSxVQUFVLEdBQUdELG9CQUFvQixDQUFDRSxJQUF4QztBQUNBLFVBQU12QyxnQkFBNEIsR0FBRztBQUNwQ00sUUFBQUEsS0FBSyxFQUFFLFlBRDZCO0FBRXBDcEQsUUFBQUEsSUFBSSxFQUFFOEUsYUFGOEI7QUFHcEN6QixRQUFBQSxrQkFBa0IsRUFBRTJCLG1CQUFtQixDQUFDbEYsS0FISjtBQUlwQ3FCLFFBQUFBLElBQUksRUFBRSxFQUo4QjtBQUtwQ21FLFFBQUFBLGdCQUFnQixFQUFFLEVBTGtCO0FBTXBDQyxRQUFBQSxvQkFBb0IsRUFBRSxFQU5jO0FBT3BDM0QsUUFBQUEsV0FBVyxFQUFFO0FBQ1o0RCxVQUFBQSxhQURZLFlBQ0V2RixjQURGLEVBQzBCO0FBQ3JDLG1CQUFRNkMsZ0JBQWdCLENBQUNsQixXQUFsQixDQUFzQzNCLGNBQXRDLENBQVA7QUFDQTtBQUhXO0FBUHVCLE9BQXJDO0FBY0EsVUFBTXdGLGVBQTBCLEdBQUc7QUFDbENyQyxRQUFBQSxLQUFLLEVBQUUsV0FEMkI7QUFFbENwRCxRQUFBQSxJQUFJLEVBQUU4RSxhQUY0QjtBQUdsQ1ksUUFBQUEseUJBQXlCLEVBQUUsRUFITztBQUlsQ0MsUUFBQUEsVUFBVSxFQUFFWCxtQkFBbUIsQ0FBQ2xGLEtBSkU7QUFLbEN1RCxRQUFBQSxrQkFBa0IsWUFBSzBCLG1CQUFMLGNBQTRCRCxhQUE1QjtBQUxnQixPQUFuQztBQU9BLFdBQUs1QyxxQkFBTCxDQUEyQkMsVUFBM0IsRUFBdUMrQyxvQkFBdkMsRUFBNkRwQyxnQkFBZ0IsQ0FBQ08sa0JBQTlFLEVBQWtHZixlQUFsRztBQUNBLFdBQUtKLHFCQUFMLENBQTJCQyxVQUEzQixFQUF1QzhDLG1CQUF2QyxFQUE0RFEsZUFBZSxDQUFDcEMsa0JBQTVFLEVBQWdHZixlQUFoRztBQUNBLFVBQU1nRCxnQkFBZ0IsR0FBR3BFLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZZ0Usb0JBQVosRUFDdkJTLE1BRHVCLENBQ2hCLFVBQUFDLGlCQUFpQixFQUFJO0FBQzVCLFlBQUlBLGlCQUFpQixJQUFJLE1BQXJCLElBQStCQSxpQkFBaUIsSUFBSSxPQUF4RCxFQUFpRTtBQUNoRSxpQkFBT1Ysb0JBQW9CLENBQUNVLGlCQUFELENBQXBCLENBQXdDQyxLQUF4QyxLQUFrRCxVQUF6RDtBQUNBO0FBQ0QsT0FMdUIsRUFNdkJ0SCxHQU51QixDQU1uQixVQUFBdUUsWUFBWSxFQUFJO0FBQ3BCLGVBQU8sTUFBSSxDQUFDRixhQUFMLENBQW1CVixVQUFuQixFQUErQlcsZ0JBQS9CLEVBQWlEQyxZQUFqRCxFQUErRFQsZUFBL0QsQ0FBUDtBQUNBLE9BUnVCLENBQXpCO0FBVUEsVUFBTWlELG9CQUFvQixHQUFHckUsTUFBTSxDQUFDQyxJQUFQLENBQVlnRSxvQkFBWixFQUMzQlMsTUFEMkIsQ0FDcEIsVUFBQUMsaUJBQWlCLEVBQUk7QUFDNUIsWUFBSUEsaUJBQWlCLElBQUksTUFBckIsSUFBK0JBLGlCQUFpQixJQUFJLE9BQXhELEVBQWlFO0FBQ2hFLGlCQUFPVixvQkFBb0IsQ0FBQ1UsaUJBQUQsQ0FBcEIsQ0FBd0NDLEtBQXhDLEtBQWtELG9CQUF6RDtBQUNBO0FBQ0QsT0FMMkIsRUFNM0J0SCxHQU4yQixDQU12QixVQUFBdUYsZUFBZSxFQUFJO0FBQ3ZCLGVBQU8sTUFBSSxDQUFDRCx1QkFBTCxDQUE2QjNCLFVBQTdCLEVBQXlDVyxnQkFBekMsRUFBMkRpQixlQUEzRCxFQUE0RXpCLGVBQTVFLENBQVA7QUFDQSxPQVIyQixDQUE3QjtBQVVBUSxNQUFBQSxnQkFBZ0IsQ0FBQzNCLElBQWpCLEdBQXdCaUUsVUFBVSxDQUFDNUcsR0FBWCxDQUFlLFVBQUN1SCxTQUFEO0FBQUEsZUFDdENULGdCQUFnQixDQUFDdEQsSUFBakIsQ0FBc0IsVUFBQ2dFLFFBQUQ7QUFBQSxpQkFBd0JBLFFBQVEsQ0FBQ2hHLElBQVQsS0FBa0IrRixTQUExQztBQUFBLFNBQXRCLENBRHNDO0FBQUEsT0FBZixDQUF4QjtBQUdBakQsTUFBQUEsZ0JBQWdCLENBQUN3QyxnQkFBakIsR0FBb0NBLGdCQUFwQztBQUNBeEMsTUFBQUEsZ0JBQWdCLENBQUN5QyxvQkFBakIsR0FBd0NBLG9CQUF4QztBQUVBLGFBQU87QUFBRUksUUFBQUEsVUFBVSxFQUFFN0MsZ0JBQWQ7QUFBZ0NtRCxRQUFBQSxTQUFTLEVBQUVSO0FBQTNDLE9BQVA7QUFDQSxLQXJheUI7QUFzYTFCUyxJQUFBQSxXQXRhMEIsWUFzYWRDLFVBdGFjLEVBc2FNQyxhQXRhTixFQXNhc0NDLFNBdGF0QyxFQXNhaUU7QUFDMUYsVUFBSUMsZ0JBQXdCLEdBQUcsRUFBL0I7QUFDQSxVQUFJQyxTQUFTLGFBQU1KLFVBQU4sQ0FBYjs7QUFDQSxVQUFJQyxhQUFhLENBQUNJLFFBQWxCLEVBQTRCO0FBQzNCRixRQUFBQSxnQkFBZ0IsR0FBR0YsYUFBYSxDQUFDSyxVQUFkLENBQ2pCYixNQURpQixDQUNWLFVBQUFjLEtBQUs7QUFBQSxpQkFBSUEsS0FBSyxDQUFDQyxLQUFOLEtBQWdCUCxhQUFhLENBQUNRLGNBQWxDO0FBQUEsU0FESyxFQUVqQnBJLEdBRmlCLENBRWIsVUFBQWtJLEtBQUs7QUFBQSxpQkFBSUEsS0FBSyxDQUFDNUcsS0FBVjtBQUFBLFNBRlEsRUFHakIrRyxJQUhpQixDQUdaLEVBSFksQ0FBbkI7QUFJQU4sUUFBQUEsU0FBUyxhQUFNSixVQUFOLGNBQW9CRyxnQkFBcEIsTUFBVDtBQUNBOztBQUNELFVBQU1RLFVBQVUsR0FBR1YsYUFBYSxDQUFDSyxVQUFkLElBQTRCLEVBQS9DO0FBQ0EsYUFBTztBQUNOckQsUUFBQUEsS0FBSyxFQUFFLFFBREQ7QUFFTnBELFFBQUFBLElBQUksRUFBRW1HLFVBQVUsQ0FBQzVGLE1BQVgsQ0FBa0I4RixTQUFTLENBQUN6SCxNQUFWLEdBQW1CLENBQXJDLENBRkE7QUFHTnlFLFFBQUFBLGtCQUFrQixFQUFFa0QsU0FIZDtBQUlOUSxRQUFBQSxPQUFPLEVBQUVYLGFBQWEsQ0FBQ0ksUUFKakI7QUFLTlEsUUFBQUEsVUFBVSxFQUFFVixnQkFMTjtBQU1OVyxRQUFBQSxVQUFVLEVBQUViLGFBQWEsQ0FBQ2MsV0FBZCxHQUE0QmQsYUFBYSxDQUFDYyxXQUFkLENBQTBCcEgsS0FBdEQsR0FBOEQsRUFOcEU7QUFPTmdILFFBQUFBLFVBQVUsRUFBRUEsVUFBVSxDQUFDdEksR0FBWCxDQUFlLFVBQUFrSSxLQUFLLEVBQUk7QUFDbkMsaUJBQU87QUFDTnRELFlBQUFBLEtBQUssRUFBRSxpQkFERDtBQUVOK0QsWUFBQUEsV0FBVyxFQUFFVCxLQUFLLENBQUM1RyxLQUFOLEtBQWdCc0csYUFBYSxDQUFDUSxjQUZyQztBQUdOdkQsWUFBQUEsa0JBQWtCLFlBQUtrRCxTQUFMLGNBQWtCRyxLQUFLLENBQUNDLEtBQXhCLENBSFo7QUFJTjFJLFlBQUFBLElBQUksRUFBRXlJLEtBQUssQ0FBQzVHLEtBSk4sQ0FLTjs7QUFMTSxXQUFQO0FBT0EsU0FSVztBQVBOLE9BQVA7QUFpQkEsS0FsY3lCO0FBbWMxQnNILElBQUFBLGdCQW5jMEIsWUFtY1RqRixVQW5jUyxFQW1jc0I7QUFBQTs7QUFDL0MsVUFBTWtGLGNBQWMsR0FBR2xGLFVBQVUsQ0FBQ2MsU0FBWCxDQUFxQixJQUFyQixDQUF2QjtBQUNBLFVBQU1xRSxXQUFXLEdBQUduRixVQUFVLENBQUNjLFNBQVgsQ0FBcUIsR0FBckIsQ0FBcEI7QUFDQSxVQUFNWCxlQUFpQyxHQUFHLEVBQTFDO0FBQ0EsVUFBTWlGLFdBQXlCLEdBQUcsRUFBbEM7QUFDQSxVQUFNQyxVQUF1QixHQUFHLEVBQWhDO0FBQ0EsVUFBTXpDLG1CQUFtQixHQUFHc0MsY0FBYyxDQUFDSSxnQkFBM0M7QUFDQXZHLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZbUcsV0FBWixFQUNFMUIsTUFERixDQUNTLFVBQUFkLGFBQWEsRUFBSTtBQUN4QixlQUFPQSxhQUFhLEtBQUssT0FBbEIsSUFBNkJ3QyxXQUFXLENBQUN4QyxhQUFELENBQVgsQ0FBMkJnQixLQUEzQixLQUFxQyxXQUF6RTtBQUNBLE9BSEYsRUFJRTFFLE9BSkYsQ0FJVSxVQUFBMEQsYUFBYSxFQUFJO0FBQUEsb0NBQ1MsTUFBSSxDQUFDRCxlQUFMLENBQXFCMUMsVUFBckIsRUFBaUMyQyxhQUFqQyxFQUFnRHhDLGVBQWhELEVBQWlFeUMsbUJBQWpFLENBRFQ7QUFBQSxZQUNqQlksVUFEaUIseUJBQ2pCQSxVQURpQjtBQUFBLFlBQ0xNLFNBREsseUJBQ0xBLFNBREs7O0FBRXpCc0IsUUFBQUEsV0FBVyxDQUFDakcsSUFBWixDQUFpQnFFLFVBQWpCO0FBQ0E2QixRQUFBQSxVQUFVLENBQUNsRyxJQUFYLENBQWdCMkUsU0FBaEI7QUFDQSxPQVJGO0FBU0F1QixNQUFBQSxVQUFVLENBQUNwRyxPQUFYLENBQW1CLFVBQUE2RSxTQUFTLEVBQUk7QUFDL0IsWUFBTXlCLG1CQUFtQixHQUFHTCxjQUFjLENBQUN0QyxtQkFBRCxDQUFkLENBQW9Da0IsU0FBUyxDQUFDakcsSUFBOUMsRUFBb0QySCwwQkFBaEY7O0FBQ0EsWUFBSUQsbUJBQUosRUFBeUI7QUFDeEJ4RyxVQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXVHLG1CQUFaLEVBQWlDdEcsT0FBakMsQ0FBeUMsVUFBQXdHLFdBQVcsRUFBSTtBQUN2RCxnQkFBTUMsZUFBZSxHQUFHTCxVQUFVLENBQUN4RixJQUFYLENBQWdCLFVBQUE4QyxhQUFhO0FBQUEscUJBQUlBLGFBQWEsQ0FBQzlFLElBQWQsS0FBdUIwSCxtQkFBbUIsQ0FBQ0UsV0FBRCxDQUE5QztBQUFBLGFBQTdCLENBQXhCOztBQUNBLGdCQUFJQyxlQUFKLEVBQXFCO0FBQ3BCNUIsY0FBQUEsU0FBUyxDQUFDUCx5QkFBVixDQUFvQ2tDLFdBQXBDLElBQW1EQyxlQUFuRDtBQUNBO0FBQ0QsV0FMRDtBQU1BO0FBQ0QsT0FWRDs7QUFXQSxVQUFNQyxTQUFTLEdBQUcsVUFBQ0MsWUFBRCxFQUFrQztBQUNuRCxZQUFJLENBQUNBLFlBQUwsRUFBbUI7QUFDbEIsaUJBQU9BLFlBQVA7QUFDQTs7QUFIa0Qsa0NBSTVCQSxZQUFZLENBQUNsSSxLQUFiLENBQW1CLEdBQW5CLENBSjRCO0FBQUE7QUFBQSxZQUk1Q21JLEtBSjRDO0FBQUEsWUFJckNqSyxLQUpxQzs7QUFLbkQsWUFBTXNJLFNBQVMsR0FBR25GLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZYixnQkFBWixFQUE4QjBCLElBQTlCLENBQW1DLFVBQUFpRyxZQUFZLEVBQUk7QUFDcEUsaUJBQU8zSCxnQkFBZ0IsQ0FBQzJILFlBQUQsQ0FBaEIsS0FBbUNELEtBQTFDO0FBQ0EsU0FGaUIsQ0FBbEI7O0FBR0EsWUFBSTNCLFNBQUosRUFBZTtBQUNkLDJCQUFVQSxTQUFWLGNBQXVCdEksS0FBdkI7QUFDQSxTQUZELE1BRU87QUFDTixjQUFJZ0ssWUFBWSxDQUFDRyxPQUFiLENBQXFCLEdBQXJCLE1BQThCLENBQUMsQ0FBbkMsRUFBc0M7QUFBQSx1Q0FDUEgsWUFBWSxDQUFDbEksS0FBYixDQUFtQixHQUFuQixDQURPO0FBQUE7QUFBQSxnQkFDOUJzSSxRQUQ4QjtBQUFBLGdCQUNwQkMsU0FEb0I7O0FBRXJDLDZCQUFVRCxRQUFWLGNBQXNCTCxTQUFTLENBQUNNLFNBQUQsQ0FBL0I7QUFDQSxXQUhELE1BR087QUFDTixtQkFBT0wsWUFBUDtBQUNBO0FBQ0Q7QUFDRCxPQWxCRDs7QUFtQkEsVUFBSTFCLFNBQVMsR0FBRyxFQUFoQjtBQUNBLFVBQU1nQyxVQUFVLEdBQUduSCxNQUFNLENBQUNDLElBQVAsQ0FBWWtHLGNBQVosRUFBNEJ6QixNQUE1QixDQUFtQyxVQUFBMEMsWUFBWTtBQUFBLGVBQUlqQixjQUFjLENBQUNpQixZQUFELENBQWQsQ0FBNkJ4QyxLQUE3QixLQUF1QyxRQUEzQztBQUFBLE9BQS9DLENBQW5COztBQUNBLFVBQUl1QyxVQUFVLElBQUlBLFVBQVUsQ0FBQ3pKLE1BQVgsR0FBb0IsQ0FBdEMsRUFBeUM7QUFDeEN5SCxRQUFBQSxTQUFTLEdBQUdnQyxVQUFVLENBQUMsQ0FBRCxDQUFWLENBQWM5SCxNQUFkLENBQXFCLENBQXJCLEVBQXdCOEgsVUFBVSxDQUFDLENBQUQsQ0FBVixDQUFjekosTUFBZCxHQUF1QixDQUEvQyxDQUFaO0FBQ0EsT0FGRCxNQUVPLElBQUkySSxXQUFXLElBQUlBLFdBQVcsQ0FBQzNJLE1BQS9CLEVBQXVDO0FBQzdDeUgsUUFBQUEsU0FBUyxHQUFHa0IsV0FBVyxDQUFDLENBQUQsQ0FBWCxDQUFlbEUsa0JBQWYsQ0FBa0NrRixPQUFsQyxDQUEwQ2hCLFdBQVcsQ0FBQyxDQUFELENBQVgsQ0FBZXZILElBQXpELEVBQStELEVBQS9ELENBQVo7QUFDQXFHLFFBQUFBLFNBQVMsR0FBR0EsU0FBUyxDQUFDOUYsTUFBVixDQUFpQixDQUFqQixFQUFvQjhGLFNBQVMsQ0FBQ3pILE1BQVYsR0FBbUIsQ0FBdkMsQ0FBWjtBQUNBOztBQUNELFVBQU00SixPQUFpQixHQUFHdEgsTUFBTSxDQUFDQyxJQUFQLENBQVlrRyxjQUFaLEVBQ3hCekIsTUFEd0IsQ0FDakIsVUFBQTZDLEdBQUcsRUFBSTtBQUNkLGVBQU9wSyxLQUFLLENBQUNDLE9BQU4sQ0FBYytJLGNBQWMsQ0FBQ29CLEdBQUQsQ0FBNUIsS0FBc0NwQixjQUFjLENBQUNvQixHQUFELENBQWQsQ0FBb0I3SixNQUFwQixHQUE2QixDQUFuRSxJQUF3RXlJLGNBQWMsQ0FBQ29CLEdBQUQsQ0FBZCxDQUFvQixDQUFwQixFQUF1QjNDLEtBQXZCLEtBQWlDLFFBQWhIO0FBQ0EsT0FId0IsRUFJeEI0QyxNQUp3QixDQUlqQixVQUFDQyxVQUFELEVBQXVCeEMsVUFBdkIsRUFBc0M7QUFDN0MsWUFBTXFDLE9BQU8sR0FBR25CLGNBQWMsQ0FBQ2xCLFVBQUQsQ0FBOUI7QUFDQXFDLFFBQUFBLE9BQU8sQ0FBQ3BILE9BQVIsQ0FBZ0IsVUFBQ3dILE1BQUQsRUFBNkI7QUFDNUNELFVBQUFBLFVBQVUsQ0FBQ3JILElBQVgsQ0FBZ0IsTUFBSSxDQUFDNEUsV0FBTCxDQUFpQkMsVUFBakIsRUFBNkJ5QyxNQUE3QixFQUFxQ3ZDLFNBQXJDLENBQWhCO0FBQ0EsU0FGRDtBQUdBLGVBQU9zQyxVQUFQO0FBQ0EsT0FWd0IsRUFVdEIsRUFWc0IsQ0FBMUIsQ0F0RCtDLENBaUUvQzs7QUFDQSxVQUFNL0csV0FBVyxHQUFHeUYsY0FBYyxDQUFDd0IsWUFBbkM7QUFDQSxVQUFNQyxpQkFBaUIsR0FBRzVILE1BQU0sQ0FBQ0MsSUFBUCxDQUFZUyxXQUFaLEVBQXlCZ0UsTUFBekIsQ0FBZ0MsVUFBQTlELE1BQU07QUFBQSxlQUFJQSxNQUFNLENBQUNvRyxPQUFQLENBQWUsR0FBZixNQUF3QixDQUFDLENBQTdCO0FBQUEsT0FBdEMsQ0FBMUI7QUFDQVksTUFBQUEsaUJBQWlCLENBQUMxSCxPQUFsQixDQUEwQixVQUFBVSxNQUFNLEVBQUk7QUFDbkMsUUFBQSxNQUFJLENBQUNJLHFCQUFMLENBQTJCQyxVQUEzQixFQUF1Q2tGLGNBQWMsQ0FBQ3dCLFlBQWYsQ0FBNEIvRyxNQUE1QixDQUF2QyxFQUE0RUEsTUFBNUUsRUFBb0ZRLGVBQXBGO0FBQ0EsT0FGRDtBQUdBLGFBQU87QUFDTnlHLFFBQUFBLGNBQWMsRUFBRSxpQkFEVjtBQUVOQyxRQUFBQSxPQUFPLEVBQUUsS0FGSDtBQUdOQyxRQUFBQSxNQUFNLEVBQUU7QUFDUEMsVUFBQUEsZUFBZSxFQUFFLEVBRFY7QUFFUDFCLFVBQUFBLFVBQVUsRUFBVkEsVUFGTztBQUdQRCxVQUFBQSxXQUFXLEVBQVhBLFdBSE87QUFJUDRCLFVBQUFBLFlBQVksRUFBRSxFQUpQO0FBS1BYLFVBQUFBLE9BQU8sRUFBUEEsT0FMTztBQU1QbkMsVUFBQUEsU0FBUyxFQUFUQSxTQU5PO0FBT1B6RSxVQUFBQSxXQUFXLEVBQUU7QUFDWiwrQkFBbUJVO0FBRFA7QUFQTixTQUhGO0FBY044RyxRQUFBQSxVQUFVLEVBQUUsRUFkTjtBQWVOQyxRQUFBQSxPQUFPLEVBQUV2QjtBQWZILE9BQVA7QUFpQkEsS0EzaEJ5QjtBQTRoQjFCd0IsSUFBQUEsWUE1aEIwQixZQTRoQmJuSCxVQTVoQmEsRUE0aEJJO0FBQzdCLFVBQU1vSCxZQUFZLEdBQUcsS0FBS25DLGdCQUFMLENBQXNCakYsVUFBdEIsQ0FBckI7QUFFQSxhQUFPcUgsbUJBQW1CLENBQUNGLFlBQXBCLENBQWlDQyxZQUFqQyxDQUFQO0FBQ0EsS0FoaUJ5QjtBQWlpQjFCRSxJQUFBQSxXQWppQjBCLFlBaWlCZEMsU0FqaUJjLEVBaWlCZ0J2SCxVQWppQmhCLEVBaWlCaUN3SCxpQkFqaUJqQyxFQWlpQjBFO0FBQ25HLFVBQU1DLGFBQWEsR0FBRyxLQUFLTixZQUFMLENBQWtCbkgsVUFBbEIsQ0FBdEI7QUFDQSxVQUFNMEgsVUFBVSxHQUFHRixpQkFBaUIsQ0FBQzFELFNBQXJDO0FBQ0EsVUFBTTRCLGVBQXNDLEdBQUcrQixhQUFhLENBQUNYLE1BQWQsQ0FBcUJ6QixVQUFyQixDQUFnQ3hGLElBQWhDLENBQzlDLFVBQUNpRSxTQUFEO0FBQUEsZUFBMEJBLFNBQVMsQ0FBQ2pHLElBQVYsS0FBbUI2SixVQUE3QztBQUFBLE9BRDhDLENBQS9DOztBQUdBLFVBQUloQyxlQUFKLEVBQXFCO0FBQ3BCLFlBQU1pQyxRQUFRLEdBQUczSCxVQUFVLENBQUM0SCxvQkFBWCxDQUFnQyxNQUFNRixVQUF0QyxDQUFqQjtBQUNBLG1DQUNFQSxVQURGLEVBQ2VHLGlCQUFpQixDQUFDTixTQUFELENBQWpCLENBQTZCRCxXQUE3QixDQUNiNUIsZUFEYSxFQUViaUMsUUFGYSxFQUdiSCxpQkFIYSxFQUliQyxhQUFhLENBQUNQLE9BSkQsQ0FEZjtBQVFBO0FBQ0Q7QUFsakJ5QixHQUEzQjtTQXFqQmU1TCxrQiIsInNvdXJjZVJvb3QiOiIuIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcblx0QWN0aW9uLFxuXHRBbm5vdGF0aW9uLFxuXHRBbm5vdGF0aW9uTGlzdCxcblx0QW5ub3RhdGlvblJlY29yZCxcblx0RW50aXR5VHlwZSxcblx0RXhwcmVzc2lvbixcblx0UGFyc2VyT3V0cHV0LFxuXHRQcm9wZXJ0eSxcblx0UmVmZXJlbnRpYWxDb25zdHJhaW50LFxuXHRWNE5hdmlnYXRpb25Qcm9wZXJ0eSxcblx0RW50aXR5U2V0XG59IGZyb20gXCJAc2FwLXV4L3ZvY2FidWxhcmllcy10eXBlc1wiO1xuaW1wb3J0IHRlbXBsYXRlQ29udmVydGVyIGZyb20gXCIuL3RlbXBsYXRlcy9pbmRleFwiO1xuLy8gVGhpcyBmaWxlIGlzIHJldHJpZXZlZCBmcm9tIEBzYXAtdXgvYW5ub3RhdGlvbi1jb252ZXJ0ZXIsIHNoYXJlZCBjb2RlIHdpdGggdG9vbCBzdWl0ZVxuaW1wb3J0IHsgQW5ub3RhdGlvbkNvbnZlcnRlciB9IGZyb20gXCJzYXAvZmUvY29yZS9jb252ZXJ0ZXJzL2NvbW1vblwiO1xuaW1wb3J0IHsgQmFzZU1hbmlmZXN0U2V0dGluZ3MsIE9iamVjdFBhZ2VNYW5pZmVzdFNldHRpbmdzIH0gZnJvbSBcIi4vTWFuaWZlc3RTZXR0aW5nc1wiO1xuaW1wb3J0IHsgVk9DQUJVTEFSWV9BTElBUyB9IGZyb20gXCIuL0NvbnN0YW50c1wiO1xuaW1wb3J0IHsgT0RhdGFNZXRhTW9kZWwgfSBmcm9tIFwic2FwL3VpL21vZGVsL29kYXRhL3Y0XCI7XG5cbmVudW0gVGVtcGxhdGVDb252ZXJ0ZXIge1xuXHRMaXN0UmVwb3J0ID0gXCJMaXN0UmVwb3J0XCIsXG5cdE9iamVjdFBhZ2UgPSBcIk9iamVjdFBhZ2VcIlxufVxuXG50eXBlIE1ldGFNb2RlbEFjdGlvbiA9IHtcblx0JGtpbmQ6IFwiQWN0aW9uXCI7XG5cdCRJc0JvdW5kOiBib29sZWFuO1xuXHQkRW50aXR5U2V0UGF0aDogc3RyaW5nO1xuXHQkUGFyYW1ldGVyOiB7XG5cdFx0JFR5cGU6IHN0cmluZztcblx0XHQkTmFtZTogc3RyaW5nO1xuXHRcdCROdWxsYWJsZT86IGJvb2xlYW47XG5cdFx0JE1heExlbmd0aD86IG51bWJlcjtcblx0XHQkUHJlY2lzaW9uPzogbnVtYmVyO1xuXHRcdCRTY2FsZT86IG51bWJlcjtcblx0fVtdO1xuXHQkUmV0dXJuVHlwZToge1xuXHRcdCRUeXBlOiBzdHJpbmc7XG5cdH07XG59O1xuXG5jb25zdCBNZXRhTW9kZWxDb252ZXJ0ZXIgPSB7XG5cdHBhcnNlUHJvcGVydHlWYWx1ZShhbm5vdGF0aW9uT2JqZWN0OiBhbnksIHByb3BlcnR5S2V5OiBzdHJpbmcsIGN1cnJlbnRUYXJnZXQ6IHN0cmluZywgYW5ub3RhdGlvbnNMaXN0czogYW55W10pOiBhbnkge1xuXHRcdGxldCB2YWx1ZTtcblx0XHRsZXQgY3VycmVudFByb3BlcnR5VGFyZ2V0OiBzdHJpbmcgPSBjdXJyZW50VGFyZ2V0ICsgXCIvXCIgKyBwcm9wZXJ0eUtleTtcblx0XHRpZiAodHlwZW9mIGFubm90YXRpb25PYmplY3QgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdHZhbHVlID0geyB0eXBlOiBcIlN0cmluZ1wiLCBTdHJpbmc6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0ID09PSBcImJvb2xlYW5cIikge1xuXHRcdFx0dmFsdWUgPSB7IHR5cGU6IFwiQm9vbFwiLCBCb29sOiBhbm5vdGF0aW9uT2JqZWN0IH07XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgYW5ub3RhdGlvbk9iamVjdCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0dmFsdWUgPSB7IHR5cGU6IFwiSW50XCIsIEludDogYW5ub3RhdGlvbk9iamVjdCB9O1xuXHRcdH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhbm5vdGF0aW9uT2JqZWN0KSkge1xuXHRcdFx0dmFsdWUgPSB7XG5cdFx0XHRcdHR5cGU6IFwiQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRDb2xsZWN0aW9uOiBhbm5vdGF0aW9uT2JqZWN0Lm1hcCgoc3ViQW5ub3RhdGlvbk9iamVjdCwgc3ViQW5ub3RhdGlvbk9iamVjdEluZGV4KSA9PlxuXHRcdFx0XHRcdHRoaXMucGFyc2VBbm5vdGF0aW9uT2JqZWN0KFxuXHRcdFx0XHRcdFx0c3ViQW5ub3RhdGlvbk9iamVjdCxcblx0XHRcdFx0XHRcdGN1cnJlbnRQcm9wZXJ0eVRhcmdldCArIFwiL1wiICsgc3ViQW5ub3RhdGlvbk9iamVjdEluZGV4LFxuXHRcdFx0XHRcdFx0YW5ub3RhdGlvbnNMaXN0c1xuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0fTtcblx0XHRcdGlmIChhbm5vdGF0aW9uT2JqZWN0Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0aWYgKGFubm90YXRpb25PYmplY3RbMF0uaGFzT3duUHJvcGVydHkoXCIkUHJvcGVydHlQYXRoXCIpKSB7XG5cdFx0XHRcdFx0KHZhbHVlLkNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJQcm9wZXJ0eVBhdGhcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0WzBdLmhhc093blByb3BlcnR5KFwiJFBhdGhcIikpIHtcblx0XHRcdFx0XHQodmFsdWUuQ29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIlBhdGhcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0WzBdLmhhc093blByb3BlcnR5KFwiJE5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIikpIHtcblx0XHRcdFx0XHQodmFsdWUuQ29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0WzBdLmhhc093blByb3BlcnR5KFwiJEFubm90YXRpb25QYXRoXCIpKSB7XG5cdFx0XHRcdFx0KHZhbHVlLkNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJBbm5vdGF0aW9uUGF0aFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3RbMF0uaGFzT3duUHJvcGVydHkoXCIkVHlwZVwiKSkge1xuXHRcdFx0XHRcdCh2YWx1ZS5Db2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiUmVjb3JkXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGFubm90YXRpb25PYmplY3RbMF0gPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHQvLyAkVHlwZSBpcyBvcHRpb25hbC4uLlxuXHRcdFx0XHRcdCh2YWx1ZS5Db2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiUmVjb3JkXCI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0KHZhbHVlLkNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJTdHJpbmdcIjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdC4kUGF0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YWx1ZSA9IHsgdHlwZTogXCJQYXRoXCIsIFBhdGg6IGFubm90YXRpb25PYmplY3QuJFBhdGggfTtcblx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJERlY2ltYWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFsdWUgPSB7IHR5cGU6IFwiRGVjaW1hbFwiLCBEZWNpbWFsOiBwYXJzZUZsb2F0KGFubm90YXRpb25PYmplY3QuJERlY2ltYWwpIH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiRQcm9wZXJ0eVBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFsdWUgPSB7IHR5cGU6IFwiUHJvcGVydHlQYXRoXCIsIFByb3BlcnR5UGF0aDogYW5ub3RhdGlvbk9iamVjdC4kUHJvcGVydHlQYXRoIH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiROYXZpZ2F0aW9uUHJvcGVydHlQYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhbHVlID0ge1xuXHRcdFx0XHR0eXBlOiBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIixcblx0XHRcdFx0TmF2aWdhdGlvblByb3BlcnR5UGF0aDogYW5ub3RhdGlvbk9iamVjdC4kTmF2aWdhdGlvblByb3BlcnR5UGF0aFxuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJEFubm90YXRpb25QYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhbHVlID0geyB0eXBlOiBcIkFubm90YXRpb25QYXRoXCIsIEFubm90YXRpb25QYXRoOiBhbm5vdGF0aW9uT2JqZWN0LiRBbm5vdGF0aW9uUGF0aCB9O1xuXHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdC4kRW51bU1lbWJlciAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YWx1ZSA9IHtcblx0XHRcdFx0dHlwZTogXCJFbnVtTWVtYmVyXCIsXG5cdFx0XHRcdEVudW1NZW1iZXI6XG5cdFx0XHRcdFx0dGhpcy5tYXBOYW1lVG9BbGlhcyhhbm5vdGF0aW9uT2JqZWN0LiRFbnVtTWVtYmVyLnNwbGl0KFwiL1wiKVswXSkgKyBcIi9cIiArIGFubm90YXRpb25PYmplY3QuJEVudW1NZW1iZXIuc3BsaXQoXCIvXCIpWzFdXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdC4kVHlwZSkge1xuXHRcdFx0dmFsdWUgPSB7XG5cdFx0XHRcdHR5cGU6IFwiUmVjb3JkXCIsXG5cdFx0XHRcdFJlY29yZDogdGhpcy5wYXJzZUFubm90YXRpb25PYmplY3QoYW5ub3RhdGlvbk9iamVjdCwgY3VycmVudFRhcmdldCwgYW5ub3RhdGlvbnNMaXN0cylcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG5hbWU6IHByb3BlcnR5S2V5LFxuXHRcdFx0dmFsdWVcblx0XHR9O1xuXHR9LFxuXHRtYXBOYW1lVG9BbGlhcyhhbm5vdGF0aW9uTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRsZXQgW3BhdGhQYXJ0LCBhbm5vUGFydF0gPSBhbm5vdGF0aW9uTmFtZS5zcGxpdChcIkBcIik7XG5cdFx0aWYgKCFhbm5vUGFydCkge1xuXHRcdFx0YW5ub1BhcnQgPSBwYXRoUGFydDtcblx0XHRcdHBhdGhQYXJ0ID0gXCJcIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGF0aFBhcnQgKz0gXCJAXCI7XG5cdFx0fVxuXHRcdGNvbnN0IGxhc3REb3QgPSBhbm5vUGFydC5sYXN0SW5kZXhPZihcIi5cIik7XG5cdFx0cmV0dXJuIHBhdGhQYXJ0ICsgVk9DQUJVTEFSWV9BTElBU1thbm5vUGFydC5zdWJzdHIoMCwgbGFzdERvdCldICsgXCIuXCIgKyBhbm5vUGFydC5zdWJzdHIobGFzdERvdCArIDEpO1xuXHR9LFxuXHRwYXJzZUFubm90YXRpb25PYmplY3QoXG5cdFx0YW5ub3RhdGlvbk9iamVjdDogYW55LFxuXHRcdGN1cnJlbnRPYmplY3RUYXJnZXQ6IHN0cmluZyxcblx0XHRhbm5vdGF0aW9uc0xpc3RzOiBhbnlbXVxuXHQpOiBFeHByZXNzaW9uIHwgQW5ub3RhdGlvblJlY29yZCB8IEFubm90YXRpb24ge1xuXHRcdGxldCBwYXJzZWRBbm5vdGF0aW9uT2JqZWN0OiBhbnkgPSB7fTtcblx0XHRsZXQgaXNDb2xsZWN0aW9uID0gZmFsc2U7XG5cdFx0aWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0ID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0ID0geyB0eXBlOiBcIlN0cmluZ1wiLCBTdHJpbmc6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0ID09PSBcImJvb2xlYW5cIikge1xuXHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdCA9IHsgdHlwZTogXCJCb29sXCIsIEJvb2w6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0ID0geyB0eXBlOiBcIkludFwiLCBJbnQ6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJEFubm90YXRpb25QYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QgPSB7IHR5cGU6IFwiQW5ub3RhdGlvblBhdGhcIiwgQW5ub3RhdGlvblBhdGg6IGFubm90YXRpb25PYmplY3QuJEFubm90YXRpb25QYXRoIH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiRQYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QgPSB7IHR5cGU6IFwiUGF0aFwiLCBQYXRoOiBhbm5vdGF0aW9uT2JqZWN0LiRQYXRoIH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiREZWNpbWFsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QgPSB7IHR5cGU6IFwiRGVjaW1hbFwiLCBEZWNpbWFsOiBwYXJzZUZsb2F0KGFubm90YXRpb25PYmplY3QuJERlY2ltYWwpIH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiRQcm9wZXJ0eVBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdCA9IHsgdHlwZTogXCJQcm9wZXJ0eVBhdGhcIiwgUHJvcGVydHlQYXRoOiBhbm5vdGF0aW9uT2JqZWN0LiRQcm9wZXJ0eVBhdGggfTtcblx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJE5hdmlnYXRpb25Qcm9wZXJ0eVBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdCA9IHtcblx0XHRcdFx0dHlwZTogXCJOYXZpZ2F0aW9uUHJvcGVydHlQYXRoXCIsXG5cdFx0XHRcdE5hdmlnYXRpb25Qcm9wZXJ0eVBhdGg6IGFubm90YXRpb25PYmplY3QuJE5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcblx0XHRcdH07XG5cdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiRFbnVtTWVtYmVyICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QgPSB7XG5cdFx0XHRcdHR5cGU6IFwiRW51bU1lbWJlclwiLFxuXHRcdFx0XHRFbnVtTWVtYmVyOlxuXHRcdFx0XHRcdHRoaXMubWFwTmFtZVRvQWxpYXMoYW5ub3RhdGlvbk9iamVjdC4kRW51bU1lbWJlci5zcGxpdChcIi9cIilbMF0pICsgXCIvXCIgKyBhbm5vdGF0aW9uT2JqZWN0LiRFbnVtTWVtYmVyLnNwbGl0KFwiL1wiKVsxXVxuXHRcdFx0fTtcblx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYW5ub3RhdGlvbk9iamVjdCkpIHtcblx0XHRcdGlzQ29sbGVjdGlvbiA9IHRydWU7XG5cdFx0XHRjb25zdCBwYXJzZWRBbm5vdGF0aW9uQ29sbGVjdGlvbiA9IHBhcnNlZEFubm90YXRpb25PYmplY3QgYXMgYW55O1xuXHRcdFx0cGFyc2VkQW5ub3RhdGlvbkNvbGxlY3Rpb24uY29sbGVjdGlvbiA9IGFubm90YXRpb25PYmplY3QubWFwKChzdWJBbm5vdGF0aW9uT2JqZWN0LCBzdWJBbm5vdGF0aW9uSW5kZXgpID0+XG5cdFx0XHRcdHRoaXMucGFyc2VBbm5vdGF0aW9uT2JqZWN0KHN1YkFubm90YXRpb25PYmplY3QsIGN1cnJlbnRPYmplY3RUYXJnZXQgKyBcIi9cIiArIHN1YkFubm90YXRpb25JbmRleCwgYW5ub3RhdGlvbnNMaXN0cylcblx0XHRcdCk7XG5cdFx0XHRpZiAoYW5ub3RhdGlvbk9iamVjdC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGlmIChhbm5vdGF0aW9uT2JqZWN0WzBdLmhhc093blByb3BlcnR5KFwiJFByb3BlcnR5UGF0aFwiKSkge1xuXHRcdFx0XHRcdChwYXJzZWRBbm5vdGF0aW9uQ29sbGVjdGlvbi5jb2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiUHJvcGVydHlQYXRoXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdFswXS5oYXNPd25Qcm9wZXJ0eShcIiRQYXRoXCIpKSB7XG5cdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25Db2xsZWN0aW9uLmNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJQYXRoXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdFswXS5oYXNPd25Qcm9wZXJ0eShcIiROYXZpZ2F0aW9uUHJvcGVydHlQYXRoXCIpKSB7XG5cdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25Db2xsZWN0aW9uLmNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJOYXZpZ2F0aW9uUHJvcGVydHlQYXRoXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdFswXS5oYXNPd25Qcm9wZXJ0eShcIiRBbm5vdGF0aW9uUGF0aFwiKSkge1xuXHRcdFx0XHRcdChwYXJzZWRBbm5vdGF0aW9uQ29sbGVjdGlvbi5jb2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiQW5ub3RhdGlvblBhdGhcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0WzBdLmhhc093blByb3BlcnR5KFwiJFR5cGVcIikpIHtcblx0XHRcdFx0XHQocGFyc2VkQW5ub3RhdGlvbkNvbGxlY3Rpb24uY29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIlJlY29yZFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0WzBdID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25Db2xsZWN0aW9uLmNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJSZWNvcmRcIjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQocGFyc2VkQW5ub3RhdGlvbkNvbGxlY3Rpb24uY29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIlN0cmluZ1wiO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChhbm5vdGF0aW9uT2JqZWN0LiRUeXBlKSB7XG5cdFx0XHRcdGNvbnN0IHR5cGVWYWx1ZSA9IGFubm90YXRpb25PYmplY3QuJFR5cGU7XG5cdFx0XHRcdGNvbnN0IHR5cGVBbGlhcyA9IFZPQ0FCVUxBUllfQUxJQVNbdHlwZVZhbHVlLnN1YnN0cigwLCB0eXBlVmFsdWUubGFzdEluZGV4T2YoXCIuXCIpKV07XG5cdFx0XHRcdGNvbnN0IHR5cGVUZXJtID0gdHlwZVZhbHVlLnN1YnN0cih0eXBlVmFsdWUubGFzdEluZGV4T2YoXCIuXCIpICsgMSk7XG5cdFx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QudHlwZSA9IGAke3R5cGVBbGlhc30uJHt0eXBlVGVybX1gO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgcHJvcGVydHlWYWx1ZXM6IGFueSA9IFtdO1xuXHRcdFx0T2JqZWN0LmtleXMoYW5ub3RhdGlvbk9iamVjdCkuZm9yRWFjaChwcm9wZXJ0eUtleSA9PiB7XG5cdFx0XHRcdGlmIChwcm9wZXJ0eUtleSAhPT0gXCIkVHlwZVwiICYmICFwcm9wZXJ0eUtleS5zdGFydHNXaXRoKFwiQFwiKSkge1xuXHRcdFx0XHRcdHByb3BlcnR5VmFsdWVzLnB1c2goXG5cdFx0XHRcdFx0XHR0aGlzLnBhcnNlUHJvcGVydHlWYWx1ZShhbm5vdGF0aW9uT2JqZWN0W3Byb3BlcnR5S2V5XSwgcHJvcGVydHlLZXksIGN1cnJlbnRPYmplY3RUYXJnZXQsIGFubm90YXRpb25zTGlzdHMpXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSBlbHNlIGlmIChwcm9wZXJ0eUtleS5zdGFydHNXaXRoKFwiQFwiKSkge1xuXHRcdFx0XHRcdC8vIEFubm90YXRpb24gb2YgYW5ub3RhdGlvblxuXHRcdFx0XHRcdGNvbnN0IGFubm90YXRpb25RdWFsaWZpZXJTcGxpdCA9IHByb3BlcnR5S2V5LnNwbGl0KFwiI1wiKTtcblx0XHRcdFx0XHRjb25zdCBxdWFsaWZpZXIgPSBhbm5vdGF0aW9uUXVhbGlmaWVyU3BsaXRbMV07XG5cdFx0XHRcdFx0bGV0IGFubm90YXRpb25LZXkgPSBhbm5vdGF0aW9uUXVhbGlmaWVyU3BsaXRbMF07XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgZm9yIGFubm90YXRpb24gb2YgYW5ub3RhdGlvblxuXHRcdFx0XHRcdGxldCBjdXJyZW50T3V0QW5ub3RhdGlvbk9iamVjdCA9IHRoaXMuZ2V0T3JDcmVhdGVBbm5vdGF0aW9uTGlzdChjdXJyZW50T2JqZWN0VGFyZ2V0LCBhbm5vdGF0aW9uc0xpc3RzKTtcblx0XHRcdFx0XHRjdXJyZW50T3V0QW5ub3RhdGlvbk9iamVjdC5hbm5vdGF0aW9ucy5wdXNoKHtcblx0XHRcdFx0XHRcdHRlcm06IHRoaXMubWFwTmFtZVRvQWxpYXMoYW5ub3RhdGlvbktleS5zdWJzdHIoMSkpLFxuXHRcdFx0XHRcdFx0cXVhbGlmaWVyOiBxdWFsaWZpZXIsXG5cdFx0XHRcdFx0XHR2YWx1ZTogdGhpcy5wYXJzZUFubm90YXRpb25PYmplY3QoXG5cdFx0XHRcdFx0XHRcdGFubm90YXRpb25PYmplY3RbcHJvcGVydHlLZXldLFxuXHRcdFx0XHRcdFx0XHRjdXJyZW50T2JqZWN0VGFyZ2V0LFxuXHRcdFx0XHRcdFx0XHRhbm5vdGF0aW9uc0xpc3RzXG5cdFx0XHRcdFx0XHQpIGFzIEV4cHJlc3Npb24sXG5cdFx0XHRcdFx0XHRpc0NvbGxlY3Rpb246IGZhbHNlXG5cdFx0XHRcdFx0fSBhcyBBbm5vdGF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LnByb3BlcnR5VmFsdWVzID0gcHJvcGVydHlWYWx1ZXM7XG5cdFx0fVxuXHRcdHJldHVybiBwYXJzZWRBbm5vdGF0aW9uT2JqZWN0O1xuXHR9LFxuXHRnZXRPckNyZWF0ZUFubm90YXRpb25MaXN0KHRhcmdldDogc3RyaW5nLCBhbm5vdGF0aW9uc0xpc3RzOiBBbm5vdGF0aW9uTGlzdFtdKTogQW5ub3RhdGlvbkxpc3Qge1xuXHRcdGxldCBwb3RlbnRpYWxUYXJnZXQgPSBhbm5vdGF0aW9uc0xpc3RzLmZpbmQoYW5ub3RhdGlvbkxpc3QgPT4gYW5ub3RhdGlvbkxpc3QudGFyZ2V0ID09PSB0YXJnZXQpO1xuXHRcdGlmICghcG90ZW50aWFsVGFyZ2V0KSB7XG5cdFx0XHRwb3RlbnRpYWxUYXJnZXQgPSB7XG5cdFx0XHRcdHRhcmdldDogdGFyZ2V0LFxuXHRcdFx0XHRhbm5vdGF0aW9uczogW11cblx0XHRcdH07XG5cdFx0XHRhbm5vdGF0aW9uc0xpc3RzLnB1c2gocG90ZW50aWFsVGFyZ2V0KTtcblx0XHR9XG5cdFx0cmV0dXJuIHBvdGVudGlhbFRhcmdldDtcblx0fSxcblxuXHRjcmVhdGVBbm5vdGF0aW9uTGlzdHMob01ldGFNb2RlbDogT0RhdGFNZXRhTW9kZWwsIGFubm90YXRpb25PYmplY3RzOiBhbnksIGFubm90YXRpb25UYXJnZXQ6IHN0cmluZywgYW5ub3RhdGlvbkxpc3RzOiBhbnlbXSkge1xuXHRcdGNvbnN0IG91dEFubm90YXRpb25PYmplY3Q6IGFueSA9IHtcblx0XHRcdHRhcmdldDogYW5ub3RhdGlvblRhcmdldCxcblx0XHRcdGFubm90YXRpb25zOiBbXVxuXHRcdH07XG5cdFx0T2JqZWN0LmtleXMoYW5ub3RhdGlvbk9iamVjdHMpLmZvckVhY2goYW5ub3RhdGlvbktleSA9PiB7XG5cdFx0XHRsZXQgY3VycmVudE91dEFubm90YXRpb25PYmplY3QgPSBvdXRBbm5vdGF0aW9uT2JqZWN0O1xuXHRcdFx0Y29uc3QgYW5ub3RhdGlvbk9iamVjdCA9IGFubm90YXRpb25PYmplY3RzW2Fubm90YXRpb25LZXldO1xuXHRcdFx0Y29uc3QgYW5ub3RhdGlvblF1YWxpZmllclNwbGl0ID0gYW5ub3RhdGlvbktleS5zcGxpdChcIiNcIik7XG5cdFx0XHRjb25zdCBxdWFsaWZpZXIgPSBhbm5vdGF0aW9uUXVhbGlmaWVyU3BsaXRbMV07XG5cdFx0XHRhbm5vdGF0aW9uS2V5ID0gYW5ub3RhdGlvblF1YWxpZmllclNwbGl0WzBdO1xuXHRcdFx0Ly8gQ2hlY2sgZm9yIGFubm90YXRpb24gb2YgYW5ub3RhdGlvblxuXHRcdFx0Y29uc3QgYW5ub3RhdGlvbk9mQW5ub3RhdGlvblNwbGl0ID0gYW5ub3RhdGlvbktleS5zcGxpdChcIkBcIik7XG5cdFx0XHRpZiAoYW5ub3RhdGlvbk9mQW5ub3RhdGlvblNwbGl0Lmxlbmd0aCA+IDIpIHtcblx0XHRcdFx0Y3VycmVudE91dEFubm90YXRpb25PYmplY3QgPSB0aGlzLmdldE9yQ3JlYXRlQW5ub3RhdGlvbkxpc3QoXG5cdFx0XHRcdFx0YW5ub3RhdGlvblRhcmdldCArIFwiQFwiICsgdGhpcy5tYXBOYW1lVG9BbGlhcyhhbm5vdGF0aW9uT2ZBbm5vdGF0aW9uU3BsaXRbMV0pLFxuXHRcdFx0XHRcdGFubm90YXRpb25MaXN0c1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRhbm5vdGF0aW9uS2V5ID0gYW5ub3RhdGlvbk9mQW5ub3RhdGlvblNwbGl0WzJdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YW5ub3RhdGlvbktleSA9IGFubm90YXRpb25PZkFubm90YXRpb25TcGxpdFsxXTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYW5ub3RhdGlvbkFsaWFzID0gVk9DQUJVTEFSWV9BTElBU1thbm5vdGF0aW9uS2V5LnN1YnN0cigwLCBhbm5vdGF0aW9uS2V5Lmxhc3RJbmRleE9mKFwiLlwiKSldO1xuXHRcdFx0Y29uc3QgYW5ub3RhdGlvblRlcm0gPSBhbm5vdGF0aW9uS2V5LnN1YnN0cihhbm5vdGF0aW9uS2V5Lmxhc3RJbmRleE9mKFwiLlwiKSArIDEpO1xuXHRcdFx0Y29uc3QgcGFyc2VkQW5ub3RhdGlvbk9iamVjdDogYW55ID0ge1xuXHRcdFx0XHR0ZXJtOiBgJHthbm5vdGF0aW9uQWxpYXN9LiR7YW5ub3RhdGlvblRlcm19YCxcblx0XHRcdFx0cXVhbGlmaWVyOiBxdWFsaWZpZXJcblx0XHRcdH07XG5cdFx0XHRsZXQgY3VycmVudEFubm90YXRpb25UYXJnZXQgPSBhbm5vdGF0aW9uVGFyZ2V0ICsgXCJAXCIgKyBwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LnRlcm07XG5cdFx0XHRpZiAocXVhbGlmaWVyKSB7XG5cdFx0XHRcdGN1cnJlbnRBbm5vdGF0aW9uVGFyZ2V0ICs9IFwiI1wiICsgcXVhbGlmaWVyO1xuXHRcdFx0fVxuXHRcdFx0bGV0IGlzQ29sbGVjdGlvbiA9IGZhbHNlO1xuXHRcdFx0aWYgKGFubm90YXRpb25PYmplY3QgPT09IG51bGwpIHtcblx0XHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC52YWx1ZSA9IHsgdHlwZTogXCJCb29sXCIsIEJvb2w6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGFubm90YXRpb25PYmplY3QgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC52YWx1ZSA9IHsgdHlwZTogXCJTdHJpbmdcIiwgU3RyaW5nOiBhbm5vdGF0aW9uT2JqZWN0IH07XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBhbm5vdGF0aW9uT2JqZWN0ID09PSBcImJvb2xlYW5cIikge1xuXHRcdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LnZhbHVlID0geyB0eXBlOiBcIkJvb2xcIiwgQm9vbDogYW5ub3RhdGlvbk9iamVjdCB9O1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgYW5ub3RhdGlvbk9iamVjdCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LnZhbHVlID0geyB0eXBlOiBcIkludFwiLCBJbnQ6IGFubm90YXRpb25PYmplY3QgfTtcblx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdC4kUGF0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QudmFsdWUgPSB7IHR5cGU6IFwiUGF0aFwiLCBQYXRoOiBhbm5vdGF0aW9uT2JqZWN0LiRQYXRoIH07XG5cdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJEFubm90YXRpb25QYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC52YWx1ZSA9IHtcblx0XHRcdFx0XHR0eXBlOiBcIkFubm90YXRpb25QYXRoXCIsXG5cdFx0XHRcdFx0QW5ub3RhdGlvblBhdGg6IGFubm90YXRpb25PYmplY3QuJEFubm90YXRpb25QYXRoXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3QuJERlY2ltYWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LnZhbHVlID0geyB0eXBlOiBcIkRlY2ltYWxcIiwgRGVjaW1hbDogcGFyc2VGbG9hdChhbm5vdGF0aW9uT2JqZWN0LiREZWNpbWFsKSB9O1xuXHRcdFx0fSBlbHNlIGlmIChhbm5vdGF0aW9uT2JqZWN0LiRFbnVtTWVtYmVyICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC52YWx1ZSA9IHtcblx0XHRcdFx0XHR0eXBlOiBcIkVudW1NZW1iZXJcIixcblx0XHRcdFx0XHRFbnVtTWVtYmVyOlxuXHRcdFx0XHRcdFx0dGhpcy5tYXBOYW1lVG9BbGlhcyhhbm5vdGF0aW9uT2JqZWN0LiRFbnVtTWVtYmVyLnNwbGl0KFwiL1wiKVswXSkgKyBcIi9cIiArIGFubm90YXRpb25PYmplY3QuJEVudW1NZW1iZXIuc3BsaXQoXCIvXCIpWzFdXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYW5ub3RhdGlvbk9iamVjdCkpIHtcblx0XHRcdFx0aXNDb2xsZWN0aW9uID0gdHJ1ZTtcblx0XHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC5jb2xsZWN0aW9uID0gYW5ub3RhdGlvbk9iamVjdC5tYXAoKHN1YkFubm90YXRpb25PYmplY3QsIHN1YkFubm90YXRpb25JbmRleCkgPT5cblx0XHRcdFx0XHR0aGlzLnBhcnNlQW5ub3RhdGlvbk9iamVjdChzdWJBbm5vdGF0aW9uT2JqZWN0LCBjdXJyZW50QW5ub3RhdGlvblRhcmdldCArIFwiL1wiICsgc3ViQW5ub3RhdGlvbkluZGV4LCBhbm5vdGF0aW9uTGlzdHMpXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGlmIChhbm5vdGF0aW9uT2JqZWN0Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRpZiAoYW5ub3RhdGlvbk9iamVjdFswXS5oYXNPd25Qcm9wZXJ0eShcIiRQcm9wZXJ0eVBhdGhcIikpIHtcblx0XHRcdFx0XHRcdChwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LmNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJQcm9wZXJ0eVBhdGhcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3RbMF0uaGFzT3duUHJvcGVydHkoXCIkUGF0aFwiKSkge1xuXHRcdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25PYmplY3QuY29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIlBhdGhcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3RbMF0uaGFzT3duUHJvcGVydHkoXCIkTmF2aWdhdGlvblByb3BlcnR5UGF0aFwiKSkge1xuXHRcdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25PYmplY3QuY29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb25PYmplY3RbMF0uaGFzT3duUHJvcGVydHkoXCIkQW5ub3RhdGlvblBhdGhcIikpIHtcblx0XHRcdFx0XHRcdChwYXJzZWRBbm5vdGF0aW9uT2JqZWN0LmNvbGxlY3Rpb24gYXMgYW55KS50eXBlID0gXCJBbm5vdGF0aW9uUGF0aFwiO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbk9iamVjdFswXS5oYXNPd25Qcm9wZXJ0eShcIiRUeXBlXCIpKSB7XG5cdFx0XHRcdFx0XHQocGFyc2VkQW5ub3RhdGlvbk9iamVjdC5jb2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiUmVjb3JkXCI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgYW5ub3RhdGlvbk9iamVjdFswXSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRcdFx0KHBhcnNlZEFubm90YXRpb25PYmplY3QuY29sbGVjdGlvbiBhcyBhbnkpLnR5cGUgPSBcIlJlY29yZFwiO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQocGFyc2VkQW5ub3RhdGlvbk9iamVjdC5jb2xsZWN0aW9uIGFzIGFueSkudHlwZSA9IFwiU3RyaW5nXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCByZWNvcmQ6IEFubm90YXRpb25SZWNvcmQgPSB7XG5cdFx0XHRcdFx0cHJvcGVydHlWYWx1ZXM6IFtdXG5cdFx0XHRcdH07XG5cdFx0XHRcdGlmIChhbm5vdGF0aW9uT2JqZWN0LiRUeXBlKSB7XG5cdFx0XHRcdFx0Y29uc3QgdHlwZVZhbHVlID0gYW5ub3RhdGlvbk9iamVjdC4kVHlwZTtcblx0XHRcdFx0XHRjb25zdCB0eXBlQWxpYXMgPSBWT0NBQlVMQVJZX0FMSUFTW3R5cGVWYWx1ZS5zdWJzdHIoMCwgdHlwZVZhbHVlLmxhc3RJbmRleE9mKFwiLlwiKSldO1xuXHRcdFx0XHRcdGNvbnN0IHR5cGVUZXJtID0gdHlwZVZhbHVlLnN1YnN0cih0eXBlVmFsdWUubGFzdEluZGV4T2YoXCIuXCIpICsgMSk7XG5cdFx0XHRcdFx0cmVjb3JkLnR5cGUgPSBgJHt0eXBlQWxpYXN9LiR7dHlwZVRlcm19YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBwcm9wZXJ0eVZhbHVlczogYW55W10gPSBbXTtcblx0XHRcdFx0T2JqZWN0LmtleXMoYW5ub3RhdGlvbk9iamVjdCkuZm9yRWFjaChwcm9wZXJ0eUtleSA9PiB7XG5cdFx0XHRcdFx0aWYgKHByb3BlcnR5S2V5ICE9PSBcIiRUeXBlXCIgJiYgIXByb3BlcnR5S2V5LnN0YXJ0c1dpdGgoXCJAXCIpKSB7XG5cdFx0XHRcdFx0XHRwcm9wZXJ0eVZhbHVlcy5wdXNoKFxuXHRcdFx0XHRcdFx0XHR0aGlzLnBhcnNlUHJvcGVydHlWYWx1ZShhbm5vdGF0aW9uT2JqZWN0W3Byb3BlcnR5S2V5XSwgcHJvcGVydHlLZXksIGN1cnJlbnRBbm5vdGF0aW9uVGFyZ2V0LCBhbm5vdGF0aW9uTGlzdHMpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocHJvcGVydHlLZXkuc3RhcnRzV2l0aChcIkBcIikpIHtcblx0XHRcdFx0XHRcdC8vIEFubm90YXRpb24gb2YgcmVjb3JkXG5cdFx0XHRcdFx0XHRhbm5vdGF0aW9uTGlzdHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHRhcmdldDogY3VycmVudEFubm90YXRpb25UYXJnZXQsXG5cdFx0XHRcdFx0XHRcdGFubm90YXRpb25zOiBbXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWU6IHRoaXMucGFyc2VBbm5vdGF0aW9uT2JqZWN0KFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhbm5vdGF0aW9uT2JqZWN0W3Byb3BlcnR5S2V5XSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y3VycmVudEFubm90YXRpb25UYXJnZXQsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFubm90YXRpb25MaXN0c1xuXHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmVjb3JkLnByb3BlcnR5VmFsdWVzID0gcHJvcGVydHlWYWx1ZXM7XG5cdFx0XHRcdHBhcnNlZEFubm90YXRpb25PYmplY3QucmVjb3JkID0gcmVjb3JkO1xuXHRcdFx0fVxuXHRcdFx0cGFyc2VkQW5ub3RhdGlvbk9iamVjdC5pc0NvbGxlY3Rpb24gPSBpc0NvbGxlY3Rpb247XG5cdFx0XHRjdXJyZW50T3V0QW5ub3RhdGlvbk9iamVjdC5hbm5vdGF0aW9ucy5wdXNoKHBhcnNlZEFubm90YXRpb25PYmplY3QpO1xuXHRcdH0pO1xuXHRcdGlmIChvdXRBbm5vdGF0aW9uT2JqZWN0LmFubm90YXRpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdGFubm90YXRpb25MaXN0cy5wdXNoKG91dEFubm90YXRpb25PYmplY3QpO1xuXHRcdH1cblx0fSxcblx0cGFyc2VQcm9wZXJ0eShvTWV0YU1vZGVsOiBhbnksIGVudGl0eVR5cGVPYmplY3Q6IEVudGl0eVR5cGUsIHByb3BlcnR5TmFtZTogc3RyaW5nLCBhbm5vdGF0aW9uTGlzdHM6IEFubm90YXRpb25MaXN0W10pOiBQcm9wZXJ0eSB7XG5cdFx0Y29uc3QgcHJvcGVydHlBbm5vdGF0aW9uID0gb01ldGFNb2RlbC5nZXRPYmplY3QoYC8ke2VudGl0eVR5cGVPYmplY3QubmFtZX0vJHtwcm9wZXJ0eU5hbWV9QGApO1xuXHRcdGNvbnN0IHByb3BlcnR5RGVmaW5pdGlvbiA9IG9NZXRhTW9kZWwuZ2V0T2JqZWN0KGAvJHtlbnRpdHlUeXBlT2JqZWN0Lm5hbWV9LyR7cHJvcGVydHlOYW1lfWApO1xuXG5cdFx0Y29uc3QgcHJvcGVydHlPYmplY3Q6IFByb3BlcnR5ID0ge1xuXHRcdFx0X3R5cGU6IFwiUHJvcGVydHlcIixcblx0XHRcdG5hbWU6IHByb3BlcnR5TmFtZSxcblx0XHRcdGZ1bGx5UXVhbGlmaWVkTmFtZTogYCR7ZW50aXR5VHlwZU9iamVjdC5mdWxseVF1YWxpZmllZE5hbWV9LyR7cHJvcGVydHlOYW1lfWAsXG5cdFx0XHR0eXBlOiBwcm9wZXJ0eURlZmluaXRpb24uJFR5cGUsXG5cdFx0XHRtYXhMZW5ndGg6IHByb3BlcnR5RGVmaW5pdGlvbi4kTWF4TGVuZ3RoLFxuXHRcdFx0cHJlY2lzaW9uOiBwcm9wZXJ0eURlZmluaXRpb24uJFByZWNpc2lvbixcblx0XHRcdHNjYWxlOiBwcm9wZXJ0eURlZmluaXRpb24uJFNjYWxlLFxuXHRcdFx0bnVsbGFibGU6IHByb3BlcnR5RGVmaW5pdGlvbi4kTnVsbGFibGUsXG5cdFx0XHRhbm5vdGF0aW9uczoge31cblx0XHR9O1xuXG5cdFx0dGhpcy5jcmVhdGVBbm5vdGF0aW9uTGlzdHMob01ldGFNb2RlbCwgcHJvcGVydHlBbm5vdGF0aW9uLCBwcm9wZXJ0eU9iamVjdC5mdWxseVF1YWxpZmllZE5hbWUsIGFubm90YXRpb25MaXN0cyk7XG5cblx0XHRyZXR1cm4gcHJvcGVydHlPYmplY3Q7XG5cdH0sXG5cdHBhcnNlTmF2aWdhdGlvblByb3BlcnR5KFxuXHRcdG9NZXRhTW9kZWw6IGFueSxcblx0XHRlbnRpdHlUeXBlT2JqZWN0OiBFbnRpdHlUeXBlLFxuXHRcdG5hdlByb3BlcnR5TmFtZTogc3RyaW5nLFxuXHRcdGFubm90YXRpb25MaXN0czogQW5ub3RhdGlvbkxpc3RbXVxuXHQpOiBWNE5hdmlnYXRpb25Qcm9wZXJ0eSB7XG5cdFx0Y29uc3QgbmF2UHJvcGVydHlBbm5vdGF0aW9uID0gb01ldGFNb2RlbC5nZXRPYmplY3QoYC8ke2VudGl0eVR5cGVPYmplY3QubmFtZX0vJHtuYXZQcm9wZXJ0eU5hbWV9QGApO1xuXHRcdGNvbnN0IG5hdlByb3BlcnR5RGVmaW5pdGlvbiA9IG9NZXRhTW9kZWwuZ2V0T2JqZWN0KGAvJHtlbnRpdHlUeXBlT2JqZWN0Lm5hbWV9LyR7bmF2UHJvcGVydHlOYW1lfWApO1xuXG5cdFx0bGV0IHJlZmVyZW50aWFsQ29uc3RyYWludDogUmVmZXJlbnRpYWxDb25zdHJhaW50W10gPSBbXTtcblx0XHRpZiAobmF2UHJvcGVydHlEZWZpbml0aW9uLiRSZWZlcmVudGlhbENvbnN0cmFpbnQpIHtcblx0XHRcdHJlZmVyZW50aWFsQ29uc3RyYWludCA9IE9iamVjdC5rZXlzKG5hdlByb3BlcnR5RGVmaW5pdGlvbi4kUmVmZXJlbnRpYWxDb25zdHJhaW50KS5tYXAoc291cmNlUHJvcGVydHlOYW1lID0+IHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRzb3VyY2VUeXBlTmFtZTogZW50aXR5VHlwZU9iamVjdC5uYW1lLFxuXHRcdFx0XHRcdHNvdXJjZVByb3BlcnR5OiBzb3VyY2VQcm9wZXJ0eU5hbWUsXG5cdFx0XHRcdFx0dGFyZ2V0VHlwZU5hbWU6IG5hdlByb3BlcnR5RGVmaW5pdGlvbi4kVHlwZSxcblx0XHRcdFx0XHR0YXJnZXRQcm9wZXJ0eTogbmF2UHJvcGVydHlEZWZpbml0aW9uLiRSZWZlcmVudGlhbENvbnN0cmFpbnRbc291cmNlUHJvcGVydHlOYW1lXVxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGNvbnN0IG5hdmlnYXRpb25Qcm9wZXJ0eTogVjROYXZpZ2F0aW9uUHJvcGVydHkgPSB7XG5cdFx0XHRfdHlwZTogXCJOYXZpZ2F0aW9uUHJvcGVydHlcIixcblx0XHRcdG5hbWU6IG5hdlByb3BlcnR5TmFtZSxcblx0XHRcdGZ1bGx5UXVhbGlmaWVkTmFtZTogYCR7ZW50aXR5VHlwZU9iamVjdC5mdWxseVF1YWxpZmllZE5hbWV9LyR7bmF2UHJvcGVydHlOYW1lfWAsXG5cdFx0XHRwYXJ0bmVyOiBuYXZQcm9wZXJ0eURlZmluaXRpb24uJFBhcnRuZXIsXG5cdFx0XHRpc0NvbGxlY3Rpb246IG5hdlByb3BlcnR5RGVmaW5pdGlvbi4kaXNDb2xsZWN0aW9uID8gbmF2UHJvcGVydHlEZWZpbml0aW9uLiRpc0NvbGxlY3Rpb24gOiBmYWxzZSxcblx0XHRcdHRhcmdldFR5cGVOYW1lOiBuYXZQcm9wZXJ0eURlZmluaXRpb24uJFR5cGUsXG5cdFx0XHRyZWZlcmVudGlhbENvbnN0cmFpbnQsXG5cdFx0XHRhbm5vdGF0aW9uczoge31cblx0XHR9O1xuXG5cdFx0dGhpcy5jcmVhdGVBbm5vdGF0aW9uTGlzdHMob01ldGFNb2RlbCwgbmF2UHJvcGVydHlBbm5vdGF0aW9uLCBuYXZpZ2F0aW9uUHJvcGVydHkuZnVsbHlRdWFsaWZpZWROYW1lLCBhbm5vdGF0aW9uTGlzdHMpO1xuXG5cdFx0cmV0dXJuIG5hdmlnYXRpb25Qcm9wZXJ0eTtcblx0fSxcblx0cGFyc2VFbnRpdHlUeXBlKFxuXHRcdG9NZXRhTW9kZWw6IGFueSxcblx0XHRlbnRpdHlTZXROYW1lOiBzdHJpbmcsXG5cdFx0YW5ub3RhdGlvbkxpc3RzOiBBbm5vdGF0aW9uTGlzdFtdLFxuXHRcdGVudGl0eUNvbnRhaW5lck5hbWU6IHN0cmluZ1xuXHQpOiB7IGVudGl0eVR5cGU6IEVudGl0eVR5cGU7IGVudGl0eVNldDogRW50aXR5U2V0IH0ge1xuXHRcdGNvbnN0IGVudGl0eVNldERlZmluaXRpb24gPSBvTWV0YU1vZGVsLmdldE9iamVjdChgLyR7ZW50aXR5U2V0TmFtZX1gKTtcblx0XHRjb25zdCBlbnRpdHlTZXRBbm5vdGF0aW9uID0gb01ldGFNb2RlbC5nZXRPYmplY3QoYC8ke2VudGl0eVNldE5hbWV9QGApO1xuXHRcdGNvbnN0IGVudGl0eVR5cGVBbm5vdGF0aW9uID0gb01ldGFNb2RlbC5nZXRPYmplY3QoYC8ke2VudGl0eVNldE5hbWV9L0BgKTtcblx0XHRjb25zdCBlbnRpdHlUeXBlRGVmaW5pdGlvbiA9IG9NZXRhTW9kZWwuZ2V0T2JqZWN0KGAvJHtlbnRpdHlTZXROYW1lfS9gKTtcblx0XHRjb25zdCBlbnRpdHlLZXlzID0gZW50aXR5VHlwZURlZmluaXRpb24uJEtleTtcblx0XHRjb25zdCBlbnRpdHlUeXBlT2JqZWN0OiBFbnRpdHlUeXBlID0ge1xuXHRcdFx0X3R5cGU6IFwiRW50aXR5VHlwZVwiLFxuXHRcdFx0bmFtZTogZW50aXR5U2V0TmFtZSxcblx0XHRcdGZ1bGx5UXVhbGlmaWVkTmFtZTogZW50aXR5U2V0RGVmaW5pdGlvbi4kVHlwZSxcblx0XHRcdGtleXM6IFtdLFxuXHRcdFx0ZW50aXR5UHJvcGVydGllczogW10sXG5cdFx0XHRuYXZpZ2F0aW9uUHJvcGVydGllczogW10sXG5cdFx0XHRhbm5vdGF0aW9uczoge1xuXHRcdFx0XHRnZXRBbm5vdGF0aW9uKGFubm90YXRpb25OYW1lOiBzdHJpbmcpIHtcblx0XHRcdFx0XHRyZXR1cm4gKGVudGl0eVR5cGVPYmplY3QuYW5ub3RhdGlvbnMgYXMgYW55KVthbm5vdGF0aW9uTmFtZV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Y29uc3QgZW50aXR5U2V0T2JqZWN0OiBFbnRpdHlTZXQgPSB7XG5cdFx0XHRfdHlwZTogXCJFbnRpdHlTZXRcIixcblx0XHRcdG5hbWU6IGVudGl0eVNldE5hbWUsXG5cdFx0XHRuYXZpZ2F0aW9uUHJvcGVydHlCaW5kaW5nOiB7fSxcblx0XHRcdGVudGl0eVR5cGU6IGVudGl0eVNldERlZmluaXRpb24uJFR5cGUsXG5cdFx0XHRmdWxseVF1YWxpZmllZE5hbWU6IGAke2VudGl0eUNvbnRhaW5lck5hbWV9LyR7ZW50aXR5U2V0TmFtZX1gXG5cdFx0fTtcblx0XHR0aGlzLmNyZWF0ZUFubm90YXRpb25MaXN0cyhvTWV0YU1vZGVsLCBlbnRpdHlUeXBlQW5ub3RhdGlvbiwgZW50aXR5VHlwZU9iamVjdC5mdWxseVF1YWxpZmllZE5hbWUsIGFubm90YXRpb25MaXN0cyk7XG5cdFx0dGhpcy5jcmVhdGVBbm5vdGF0aW9uTGlzdHMob01ldGFNb2RlbCwgZW50aXR5U2V0QW5ub3RhdGlvbiwgZW50aXR5U2V0T2JqZWN0LmZ1bGx5UXVhbGlmaWVkTmFtZSwgYW5ub3RhdGlvbkxpc3RzKTtcblx0XHRjb25zdCBlbnRpdHlQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoZW50aXR5VHlwZURlZmluaXRpb24pXG5cdFx0XHQuZmlsdGVyKHByb3BlcnR5TmFtZU9yTm90ID0+IHtcblx0XHRcdFx0aWYgKHByb3BlcnR5TmFtZU9yTm90ICE9IFwiJEtleVwiICYmIHByb3BlcnR5TmFtZU9yTm90ICE9IFwiJGtpbmRcIikge1xuXHRcdFx0XHRcdHJldHVybiBlbnRpdHlUeXBlRGVmaW5pdGlvbltwcm9wZXJ0eU5hbWVPck5vdF0uJGtpbmQgPT09IFwiUHJvcGVydHlcIjtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdC5tYXAocHJvcGVydHlOYW1lID0+IHtcblx0XHRcdFx0cmV0dXJuIHRoaXMucGFyc2VQcm9wZXJ0eShvTWV0YU1vZGVsLCBlbnRpdHlUeXBlT2JqZWN0LCBwcm9wZXJ0eU5hbWUsIGFubm90YXRpb25MaXN0cyk7XG5cdFx0XHR9KTtcblxuXHRcdGNvbnN0IG5hdmlnYXRpb25Qcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoZW50aXR5VHlwZURlZmluaXRpb24pXG5cdFx0XHQuZmlsdGVyKHByb3BlcnR5TmFtZU9yTm90ID0+IHtcblx0XHRcdFx0aWYgKHByb3BlcnR5TmFtZU9yTm90ICE9IFwiJEtleVwiICYmIHByb3BlcnR5TmFtZU9yTm90ICE9IFwiJGtpbmRcIikge1xuXHRcdFx0XHRcdHJldHVybiBlbnRpdHlUeXBlRGVmaW5pdGlvbltwcm9wZXJ0eU5hbWVPck5vdF0uJGtpbmQgPT09IFwiTmF2aWdhdGlvblByb3BlcnR5XCI7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQubWFwKG5hdlByb3BlcnR5TmFtZSA9PiB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnBhcnNlTmF2aWdhdGlvblByb3BlcnR5KG9NZXRhTW9kZWwsIGVudGl0eVR5cGVPYmplY3QsIG5hdlByb3BlcnR5TmFtZSwgYW5ub3RhdGlvbkxpc3RzKTtcblx0XHRcdH0pO1xuXG5cdFx0ZW50aXR5VHlwZU9iamVjdC5rZXlzID0gZW50aXR5S2V5cy5tYXAoKGVudGl0eUtleTogc3RyaW5nKSA9PlxuXHRcdFx0ZW50aXR5UHJvcGVydGllcy5maW5kKChwcm9wZXJ0eTogUHJvcGVydHkpID0+IHByb3BlcnR5Lm5hbWUgPT09IGVudGl0eUtleSlcblx0XHQpO1xuXHRcdGVudGl0eVR5cGVPYmplY3QuZW50aXR5UHJvcGVydGllcyA9IGVudGl0eVByb3BlcnRpZXM7XG5cdFx0ZW50aXR5VHlwZU9iamVjdC5uYXZpZ2F0aW9uUHJvcGVydGllcyA9IG5hdmlnYXRpb25Qcm9wZXJ0aWVzO1xuXG5cdFx0cmV0dXJuIHsgZW50aXR5VHlwZTogZW50aXR5VHlwZU9iamVjdCwgZW50aXR5U2V0OiBlbnRpdHlTZXRPYmplY3QgfTtcblx0fSxcblx0cGFyc2VBY3Rpb24oYWN0aW9uTmFtZTogc3RyaW5nLCBhY3Rpb25SYXdEYXRhOiBNZXRhTW9kZWxBY3Rpb24sIG5hbWVzcGFjZTogc3RyaW5nKTogQWN0aW9uIHtcblx0XHRsZXQgYWN0aW9uRW50aXR5VHlwZTogc3RyaW5nID0gXCJcIjtcblx0XHRsZXQgYWN0aW9uRlFOID0gYCR7YWN0aW9uTmFtZX1gO1xuXHRcdGlmIChhY3Rpb25SYXdEYXRhLiRJc0JvdW5kKSB7XG5cdFx0XHRhY3Rpb25FbnRpdHlUeXBlID0gYWN0aW9uUmF3RGF0YS4kUGFyYW1ldGVyXG5cdFx0XHRcdC5maWx0ZXIocGFyYW0gPT4gcGFyYW0uJE5hbWUgPT09IGFjdGlvblJhd0RhdGEuJEVudGl0eVNldFBhdGgpXG5cdFx0XHRcdC5tYXAocGFyYW0gPT4gcGFyYW0uJFR5cGUpXG5cdFx0XHRcdC5qb2luKFwiXCIpO1xuXHRcdFx0YWN0aW9uRlFOID0gYCR7YWN0aW9uTmFtZX0oJHthY3Rpb25FbnRpdHlUeXBlfSlgO1xuXHRcdH1cblx0XHRjb25zdCBwYXJhbWV0ZXJzID0gYWN0aW9uUmF3RGF0YS4kUGFyYW1ldGVyIHx8IFtdO1xuXHRcdHJldHVybiB7XG5cdFx0XHRfdHlwZTogXCJBY3Rpb25cIixcblx0XHRcdG5hbWU6IGFjdGlvbk5hbWUuc3Vic3RyKG5hbWVzcGFjZS5sZW5ndGggKyAxKSxcblx0XHRcdGZ1bGx5UXVhbGlmaWVkTmFtZTogYWN0aW9uRlFOLFxuXHRcdFx0aXNCb3VuZDogYWN0aW9uUmF3RGF0YS4kSXNCb3VuZCxcblx0XHRcdHNvdXJjZVR5cGU6IGFjdGlvbkVudGl0eVR5cGUsXG5cdFx0XHRyZXR1cm5UeXBlOiBhY3Rpb25SYXdEYXRhLiRSZXR1cm5UeXBlID8gYWN0aW9uUmF3RGF0YS4kUmV0dXJuVHlwZS4kVHlwZSA6IFwiXCIsXG5cdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0X3R5cGU6IFwiQWN0aW9uUGFyYW1ldGVyXCIsXG5cdFx0XHRcdFx0aXNFbnRpdHlTZXQ6IHBhcmFtLiRUeXBlID09PSBhY3Rpb25SYXdEYXRhLiRFbnRpdHlTZXRQYXRoLFxuXHRcdFx0XHRcdGZ1bGx5UXVhbGlmaWVkTmFtZTogYCR7YWN0aW9uRlFOfS8ke3BhcmFtLiROYW1lfWAsXG5cdFx0XHRcdFx0dHlwZTogcGFyYW0uJFR5cGVcblx0XHRcdFx0XHQvLyBUT0RPIG1pc3NpbmcgcHJvcGVydGllcyA/XG5cdFx0XHRcdH07XG5cdFx0XHR9KVxuXHRcdH07XG5cdH0sXG5cdHBhcnNlRW50aXR5VHlwZXMob01ldGFNb2RlbDogYW55KTogUGFyc2VyT3V0cHV0IHtcblx0XHRjb25zdCBvTWV0YU1vZGVsRGF0YSA9IG9NZXRhTW9kZWwuZ2V0T2JqZWN0KFwiLyRcIik7XG5cdFx0Y29uc3Qgb0VudGl0eVNldHMgPSBvTWV0YU1vZGVsLmdldE9iamVjdChcIi9cIik7XG5cdFx0Y29uc3QgYW5ub3RhdGlvbkxpc3RzOiBBbm5vdGF0aW9uTGlzdFtdID0gW107XG5cdFx0Y29uc3QgZW50aXR5VHlwZXM6IEVudGl0eVR5cGVbXSA9IFtdO1xuXHRcdGNvbnN0IGVudGl0eVNldHM6IEVudGl0eVNldFtdID0gW107XG5cdFx0Y29uc3QgZW50aXR5Q29udGFpbmVyTmFtZSA9IG9NZXRhTW9kZWxEYXRhLiRFbnRpdHlDb250YWluZXI7XG5cdFx0T2JqZWN0LmtleXMob0VudGl0eVNldHMpXG5cdFx0XHQuZmlsdGVyKGVudGl0eVNldE5hbWUgPT4ge1xuXHRcdFx0XHRyZXR1cm4gZW50aXR5U2V0TmFtZSAhPT0gXCIka2luZFwiICYmIG9FbnRpdHlTZXRzW2VudGl0eVNldE5hbWVdLiRraW5kID09PSBcIkVudGl0eVNldFwiO1xuXHRcdFx0fSlcblx0XHRcdC5mb3JFYWNoKGVudGl0eVNldE5hbWUgPT4ge1xuXHRcdFx0XHRjb25zdCB7IGVudGl0eVR5cGUsIGVudGl0eVNldCB9ID0gdGhpcy5wYXJzZUVudGl0eVR5cGUob01ldGFNb2RlbCwgZW50aXR5U2V0TmFtZSwgYW5ub3RhdGlvbkxpc3RzLCBlbnRpdHlDb250YWluZXJOYW1lKTtcblx0XHRcdFx0ZW50aXR5VHlwZXMucHVzaChlbnRpdHlUeXBlKTtcblx0XHRcdFx0ZW50aXR5U2V0cy5wdXNoKGVudGl0eVNldCk7XG5cdFx0XHR9KTtcblx0XHRlbnRpdHlTZXRzLmZvckVhY2goZW50aXR5U2V0ID0+IHtcblx0XHRcdGNvbnN0IG5hdlByb3BlcnR5QmluZGluZ3MgPSBvTWV0YU1vZGVsRGF0YVtlbnRpdHlDb250YWluZXJOYW1lXVtlbnRpdHlTZXQubmFtZV0uJE5hdmlnYXRpb25Qcm9wZXJ0eUJpbmRpbmc7XG5cdFx0XHRpZiAobmF2UHJvcGVydHlCaW5kaW5ncykge1xuXHRcdFx0XHRPYmplY3Qua2V5cyhuYXZQcm9wZXJ0eUJpbmRpbmdzKS5mb3JFYWNoKG5hdlByb3BOYW1lID0+IHtcblx0XHRcdFx0XHRjb25zdCB0YXJnZXRFbnRpdHlTZXQgPSBlbnRpdHlTZXRzLmZpbmQoZW50aXR5U2V0TmFtZSA9PiBlbnRpdHlTZXROYW1lLm5hbWUgPT09IG5hdlByb3BlcnR5QmluZGluZ3NbbmF2UHJvcE5hbWVdKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0RW50aXR5U2V0KSB7XG5cdFx0XHRcdFx0XHRlbnRpdHlTZXQubmF2aWdhdGlvblByb3BlcnR5QmluZGluZ1tuYXZQcm9wTmFtZV0gPSB0YXJnZXRFbnRpdHlTZXQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zdCB1bmFsaWFzRm4gPSAoYWxpYXNlZFZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuXHRcdFx0aWYgKCFhbGlhc2VkVmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIGFsaWFzZWRWYWx1ZTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IFthbGlhcywgdmFsdWVdID0gYWxpYXNlZFZhbHVlLnNwbGl0KFwiLlwiKTtcblx0XHRcdGNvbnN0IG5hbWVzcGFjZSA9IE9iamVjdC5rZXlzKFZPQ0FCVUxBUllfQUxJQVMpLmZpbmQob3JpZ2luYWxOYW1lID0+IHtcblx0XHRcdFx0cmV0dXJuIFZPQ0FCVUxBUllfQUxJQVNbb3JpZ2luYWxOYW1lXSA9PT0gYWxpYXM7XG5cdFx0XHR9KTtcblx0XHRcdGlmIChuYW1lc3BhY2UpIHtcblx0XHRcdFx0cmV0dXJuIGAke25hbWVzcGFjZX0uJHt2YWx1ZX1gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGFsaWFzZWRWYWx1ZS5pbmRleE9mKFwiQFwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjb25zdCBbcHJlQWxpYXMsIHBvc3RBbGlhc10gPSBhbGlhc2VkVmFsdWUuc3BsaXQoXCJAXCIpO1xuXHRcdFx0XHRcdHJldHVybiBgJHtwcmVBbGlhc31AJHt1bmFsaWFzRm4ocG9zdEFsaWFzKX1gO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBhbGlhc2VkVmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdGxldCBuYW1lc3BhY2UgPSBcIlwiO1xuXHRcdGNvbnN0IHNjaGVtYUtleXMgPSBPYmplY3Qua2V5cyhvTWV0YU1vZGVsRGF0YSkuZmlsdGVyKG1ldGFtb2RlbEtleSA9PiBvTWV0YU1vZGVsRGF0YVttZXRhbW9kZWxLZXldLiRraW5kID09PSBcIlNjaGVtYVwiKTtcblx0XHRpZiAoc2NoZW1hS2V5cyAmJiBzY2hlbWFLZXlzLmxlbmd0aCA+IDApIHtcblx0XHRcdG5hbWVzcGFjZSA9IHNjaGVtYUtleXNbMF0uc3Vic3RyKDAsIHNjaGVtYUtleXNbMF0ubGVuZ3RoIC0gMSk7XG5cdFx0fSBlbHNlIGlmIChlbnRpdHlUeXBlcyAmJiBlbnRpdHlUeXBlcy5sZW5ndGgpIHtcblx0XHRcdG5hbWVzcGFjZSA9IGVudGl0eVR5cGVzWzBdLmZ1bGx5UXVhbGlmaWVkTmFtZS5yZXBsYWNlKGVudGl0eVR5cGVzWzBdLm5hbWUsIFwiXCIpO1xuXHRcdFx0bmFtZXNwYWNlID0gbmFtZXNwYWNlLnN1YnN0cigwLCBuYW1lc3BhY2UubGVuZ3RoIC0gMSk7XG5cdFx0fVxuXHRcdGNvbnN0IGFjdGlvbnM6IEFjdGlvbltdID0gT2JqZWN0LmtleXMob01ldGFNb2RlbERhdGEpXG5cdFx0XHQuZmlsdGVyKGtleSA9PiB7XG5cdFx0XHRcdHJldHVybiBBcnJheS5pc0FycmF5KG9NZXRhTW9kZWxEYXRhW2tleV0pICYmIG9NZXRhTW9kZWxEYXRhW2tleV0ubGVuZ3RoID4gMCAmJiBvTWV0YU1vZGVsRGF0YVtrZXldWzBdLiRraW5kID09PSBcIkFjdGlvblwiO1xuXHRcdFx0fSlcblx0XHRcdC5yZWR1Y2UoKG91dEFjdGlvbnM6IEFjdGlvbltdLCBhY3Rpb25OYW1lKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGFjdGlvbnMgPSBvTWV0YU1vZGVsRGF0YVthY3Rpb25OYW1lXTtcblx0XHRcdFx0YWN0aW9ucy5mb3JFYWNoKChhY3Rpb246IE1ldGFNb2RlbEFjdGlvbikgPT4ge1xuXHRcdFx0XHRcdG91dEFjdGlvbnMucHVzaCh0aGlzLnBhcnNlQWN0aW9uKGFjdGlvbk5hbWUsIGFjdGlvbiwgbmFtZXNwYWNlKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gb3V0QWN0aW9ucztcblx0XHRcdH0sIFtdKTtcblx0XHQvLyBGSVhNRSBDcmFwcHkgY29kZSB0byBkZWFsIHdpdGggYW5ub3RhdGlvbnMgZm9yIGZ1bmN0aW9uc1xuXHRcdGNvbnN0IGFubm90YXRpb25zID0gb01ldGFNb2RlbERhdGEuJEFubm90YXRpb25zO1xuXHRcdGNvbnN0IGFjdGlvbkFubm90YXRpb25zID0gT2JqZWN0LmtleXMoYW5ub3RhdGlvbnMpLmZpbHRlcih0YXJnZXQgPT4gdGFyZ2V0LmluZGV4T2YoXCIoXCIpICE9PSAtMSk7XG5cdFx0YWN0aW9uQW5ub3RhdGlvbnMuZm9yRWFjaCh0YXJnZXQgPT4ge1xuXHRcdFx0dGhpcy5jcmVhdGVBbm5vdGF0aW9uTGlzdHMob01ldGFNb2RlbCwgb01ldGFNb2RlbERhdGEuJEFubm90YXRpb25zW3RhcmdldF0sIHRhcmdldCwgYW5ub3RhdGlvbkxpc3RzKTtcblx0XHR9KTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0aWRlbnRpZmljYXRpb246IFwibWV0YW1vZGVsUmVzdWx0XCIsXG5cdFx0XHR2ZXJzaW9uOiBcIjQuMFwiLFxuXHRcdFx0c2NoZW1hOiB7XG5cdFx0XHRcdGVudGl0eUNvbnRhaW5lcjoge30sXG5cdFx0XHRcdGVudGl0eVNldHMsXG5cdFx0XHRcdGVudGl0eVR5cGVzLFxuXHRcdFx0XHRhc3NvY2lhdGlvbnM6IFtdLFxuXHRcdFx0XHRhY3Rpb25zLFxuXHRcdFx0XHRuYW1lc3BhY2UsXG5cdFx0XHRcdGFubm90YXRpb25zOiB7XG5cdFx0XHRcdFx0XCJtZXRhbW9kZWxSZXN1bHRcIjogYW5ub3RhdGlvbkxpc3RzXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRyZWZlcmVuY2VzOiBbXSxcblx0XHRcdHVuYWxpYXM6IHVuYWxpYXNGblxuXHRcdH07XG5cdH0sXG5cdGNvbnZlcnRUeXBlcyhvTWV0YU1vZGVsOiBhbnkpIHtcblx0XHRjb25zdCBwYXJzZWRPdXRwdXQgPSB0aGlzLnBhcnNlRW50aXR5VHlwZXMob01ldGFNb2RlbCk7XG5cblx0XHRyZXR1cm4gQW5ub3RhdGlvbkNvbnZlcnRlci5jb252ZXJ0VHlwZXMocGFyc2VkT3V0cHV0KTtcblx0fSxcblx0Y29udmVydFBhZ2Uoc1RlbXBsYXRlOiBUZW1wbGF0ZUNvbnZlcnRlciwgb01ldGFNb2RlbDogYW55LCBvTWFuaWZlc3RTZXR0aW5nczogQmFzZU1hbmlmZXN0U2V0dGluZ3MpIHtcblx0XHRjb25zdCBzZXJ2aWNlT2JqZWN0ID0gdGhpcy5jb252ZXJ0VHlwZXMob01ldGFNb2RlbCk7XG5cdFx0Y29uc3Qgc0VudGl0eVNldCA9IG9NYW5pZmVzdFNldHRpbmdzLmVudGl0eVNldDtcblx0XHRjb25zdCB0YXJnZXRFbnRpdHlTZXQ6IEVudGl0eVNldCB8IHVuZGVmaW5lZCA9IHNlcnZpY2VPYmplY3Quc2NoZW1hLmVudGl0eVNldHMuZmluZChcblx0XHRcdChlbnRpdHlTZXQ6IEVudGl0eVNldCkgPT4gZW50aXR5U2V0Lm5hbWUgPT09IHNFbnRpdHlTZXRcblx0XHQpO1xuXHRcdGlmICh0YXJnZXRFbnRpdHlTZXQpIHtcblx0XHRcdGNvbnN0IG9Db250ZXh0ID0gb01ldGFNb2RlbC5jcmVhdGVCaW5kaW5nQ29udGV4dChcIi9cIiArIHNFbnRpdHlTZXQpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0W3NFbnRpdHlTZXRdOiB0ZW1wbGF0ZUNvbnZlcnRlcltzVGVtcGxhdGVdLmNvbnZlcnRQYWdlKFxuXHRcdFx0XHRcdHRhcmdldEVudGl0eVNldCBhcyBSZXF1aXJlZDxFbnRpdHlTZXQ+LFxuXHRcdFx0XHRcdG9Db250ZXh0LFxuXHRcdFx0XHRcdG9NYW5pZmVzdFNldHRpbmdzIGFzIE9iamVjdFBhZ2VNYW5pZmVzdFNldHRpbmdzLFxuXHRcdFx0XHRcdHNlcnZpY2VPYmplY3QudW5hbGlhc1xuXHRcdFx0XHQpXG5cdFx0XHR9O1xuXHRcdH1cblx0fVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTWV0YU1vZGVsQ29udmVydGVyO1xuIl19