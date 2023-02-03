sap.ui.define("sap/fe/core/converters/common/AnnotationConverter", [], function () {
  "use strict";

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var Path = function Path(pathExpression, targetName) {
    _classCallCheck(this, Path);

    this.path = pathExpression.Path;
    this.type = "Path";
    this.$target = targetName;
  };

  function buildObjectMap(parserOutput) {
    var objectMap = {};

    if (parserOutput.schema.entityContainer && parserOutput.schema.entityContainer.fullyQualifiedName) {
      objectMap[parserOutput.schema.entityContainer.fullyQualifiedName] = parserOutput.schema.entityContainer;
    }

    parserOutput.schema.entitySets.forEach(function (entitySet) {
      objectMap[entitySet.fullyQualifiedName] = entitySet;
    });
    parserOutput.schema.actions.forEach(function (action) {
      objectMap[action.fullyQualifiedName] = action;
      action.parameters.forEach(function (parameter) {
        objectMap[parameter.fullyQualifiedName] = parameter;
      });
    });
    parserOutput.schema.entityTypes.forEach(function (entityType) {
      objectMap[entityType.fullyQualifiedName] = entityType;
      entityType.entityProperties.forEach(function (property) {
        objectMap[property.fullyQualifiedName] = property;
      });
      entityType.navigationProperties.forEach(function (navProperty) {
        objectMap[navProperty.fullyQualifiedName] = navProperty;
      });
    });
    Object.keys(parserOutput.schema.annotations).forEach(function (annotationSource) {
      parserOutput.schema.annotations[annotationSource].forEach(function (annotationList) {
        var currentTargetName = parserOutput.unalias(annotationList.target);
        annotationList.annotations.forEach(function (annotation) {
          var annotationFQN = "".concat(currentTargetName, "@").concat(parserOutput.unalias(annotation.term));

          if (annotation.qualifier) {
            annotationFQN += "#".concat(annotation.qualifier);
          }

          objectMap[annotationFQN] = annotation;
          annotation.fullyQualifiedName = annotationFQN;
        });
      });
    });
    return objectMap;
  }

  function combinePath(currentTarget, path) {
    if (path.startsWith("@")) {
      return currentTarget + path;
    } else {
      return currentTarget + "/" + path;
    }
  }

  function resolveTarget(objectMap, currentTarget, path) {
    var pathOnly = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    path = combinePath(currentTarget.fullyQualifiedName, path);
    var pathSplit = path.split("/");
    var currentPath = path;
    var target = pathSplit.reduce(function (currentValue, pathPart) {
      if (!currentValue) {
        currentPath = pathPart;
      } else if (currentValue._type === "EntitySet" && currentValue.entityType) {
        currentPath = combinePath(currentValue.entityType, pathPart);
      } else if (currentValue._type === "NavigationProperty" && currentValue.targetTypeName) {
        currentPath = combinePath(currentValue.targetTypeName, pathPart);
      } else if (currentValue._type === "NavigationProperty" && currentValue.targetType) {
        currentPath = combinePath(currentValue.targetType.fullyQualifiedName, pathPart);
      } else if (currentValue._type === "Property") {
        currentPath = combinePath(currentTarget.fullyQualifiedName.substr(0, currentTarget.fullyQualifiedName.lastIndexOf("/")), pathPart);
      } else if (currentValue._type === "Action" && currentValue.isBound) {
        currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);

        if (!objectMap[currentPath]) {
          currentPath = combinePath(currentValue.sourceType, pathPart);
        }
      } else if (currentValue._type === "ActionParameter" && currentValue.isEntitySet) {
        currentPath = combinePath(currentValue.type, pathPart);
      } else if (currentValue._type === "ActionParameter" && !currentValue.isEntitySet) {
        currentPath = combinePath(currentTarget.fullyQualifiedName.substr(0, currentTarget.fullyQualifiedName.lastIndexOf("/")), pathPart);

        if (!objectMap[currentPath]) {
          var lastIdx = currentTarget.fullyQualifiedName.lastIndexOf("/");

          if (lastIdx === -1) {
            lastIdx = currentTarget.fullyQualifiedName.length;
          }

          currentPath = combinePath(objectMap[currentTarget.fullyQualifiedName.substr(0, lastIdx)].sourceType, pathPart);
        }
      } else {
        currentPath = combinePath(currentValue.fullyQualifiedName, pathPart);
      }

      return objectMap[currentPath];
    }, null);

    if (!target) {// console.log("Missing target " + path);
    }

    if (pathOnly) {
      return currentPath;
    }

    return target;
  }

  function parseValue(propertyValue, parserOutput, currentTarget, objectMap, toResolve) {
    if (propertyValue === undefined) {
      return undefined;
    }

    switch (propertyValue.type) {
      case "String":
        return propertyValue.String;

      case "Int":
        return propertyValue.Int;

      case "Bool":
        return propertyValue.Bool;

      case "Decimal":
        return propertyValue.Decimal;

      case "Date":
        return propertyValue.Date;

      case "EnumMember":
        return propertyValue.EnumMember;

      case "PropertyPath":
        return {
          type: "PropertyPath",
          value: propertyValue.PropertyPath,
          $target: resolveTarget(objectMap, currentTarget, propertyValue.PropertyPath)
        };

      case "NavigationPropertyPath":
        return {
          type: "NavigationPropertyPath",
          value: propertyValue.NavigationPropertyPath,
          $target: resolveTarget(objectMap, currentTarget, propertyValue.NavigationPropertyPath)
        };

      case "AnnotationPath":
        var annotationTarget = resolveTarget(objectMap, currentTarget, parserOutput.unalias(propertyValue.AnnotationPath), true);
        var annotationPath = {
          type: "AnnotationPath",
          value: propertyValue.AnnotationPath,
          $target: annotationTarget
        };
        toResolve.push(annotationPath);
        return annotationPath;

      case "Path":
        var $target = resolveTarget(objectMap, currentTarget, propertyValue.Path, true);
        var path = new Path(propertyValue, $target);
        toResolve.push(path);
        return path;

      case "Record":
        return parseRecord(propertyValue.Record, parserOutput, currentTarget, objectMap, toResolve);

      case "Collection":
        return parseCollection(propertyValue.Collection, parserOutput, currentTarget, objectMap, toResolve);

      case "Apply":
        return propertyValue;
    }
  }

  function parseRecord(recordDefinition, parserOutput, currentTarget, objectMap, toResolve) {
    var annotationTerm = {
      $Type: parserOutput.unalias(recordDefinition.type)
    };
    var annotationContent = {};
    recordDefinition.propertyValues.forEach(function (propertyValue) {
      annotationContent[propertyValue.name] = parseValue(propertyValue.value, parserOutput, currentTarget, objectMap, toResolve);
    });
    return Object.assign(annotationTerm, annotationContent);
  }

  function parseCollection(collectionDefinition, parserOutput, currentTarget, objectMap, toResolve) {
    switch (collectionDefinition.type) {
      case "PropertyPath":
        return collectionDefinition.map(function (propertyPath) {
          return {
            type: "PropertyPath",
            value: propertyPath.PropertyPath,
            $target: resolveTarget(objectMap, currentTarget, propertyPath.PropertyPath)
          };
        });

      case "Path":
        return collectionDefinition.map(function (pathValue) {
          var $target = resolveTarget(objectMap, currentTarget, pathValue.Path, true);
          var path = new Path(pathValue, $target);
          toResolve.push(path);
          return path;
        });

      case "AnnotationPath":
        return collectionDefinition.map(function (annotationPath) {
          var annotationTarget = resolveTarget(objectMap, currentTarget, annotationPath.AnnotationPath, true);
          var annotationCollectionElement = {
            type: "AnnotationPath",
            value: annotationPath.AnnotationPath,
            $target: annotationTarget
          };
          toResolve.push(annotationCollectionElement);
          return annotationCollectionElement;
        });

      case "NavigationPropertyPath":
        return collectionDefinition.map(function (navPropertyPath) {
          return {
            type: "NavigationPropertyPath",
            value: navPropertyPath.NavigationPropertyPath,
            $target: resolveTarget(objectMap, currentTarget, navPropertyPath.NavigationPropertyPath)
          };
        });

      case "Record":
        return collectionDefinition.map(function (recordDefinition) {
          return parseRecord(recordDefinition, parserOutput, currentTarget, objectMap, toResolve);
        });

      case "String":
        return collectionDefinition.map(function (stringValue) {
          return stringValue;
        });

      default:
        if (collectionDefinition.length === 0) {
          return [];
        }

        throw new Error("Unsupported case");
    }
  }

  function convertAnnotation(annotation, parserOutput, currentTarget, objectMap, toResolve) {
    if (annotation.record) {
      var annotationTerm = {
        $Type: parserOutput.unalias(annotation.record.type),
        fullyQualifiedName: annotation.fullyQualifiedName,
        qualifier: annotation.qualifier
      };
      var annotationContent = {};
      annotation.record.propertyValues.forEach(function (propertyValue) {
        annotationContent[propertyValue.name] = parseValue(propertyValue.value, parserOutput, currentTarget, objectMap, toResolve);
      });
      return Object.assign(annotationTerm, annotationContent);
    } else if (!annotation.isCollection) {
      if (annotation.value) {
        return parseValue(annotation.value, parserOutput, currentTarget, objectMap, toResolve);
      } else {
        return true;
      }
    } else if (annotation.collection) {
      var collection = parseCollection(annotation.collection, parserOutput, currentTarget, objectMap, toResolve);
      collection.fullyQualifiedName = annotation.fullyQualifiedName;
      return collection;
    } else {
      throw new Error("Unsupported case");
    }
  }

  function createResolvePathFn(entityType, objectMap) {
    return function (relativePath) {
      return resolveTarget(objectMap, entityType, relativePath);
    };
  }

  function resolveNavigationProperties(parserOutput, objectMap) {
    parserOutput.schema.entityTypes.forEach(function (entityType) {
      entityType.navigationProperties.forEach(function (navProp) {
        if (navProp.targetTypeName) {
          navProp.targetType = objectMap[navProp.targetTypeName];
        } else if (navProp.relationship) {
          var targetAssociation = parserOutput.schema.associations.find(function (association) {
            return association.fullyQualifiedName === navProp.relationship;
          });

          if (targetAssociation) {
            var associationEnd = targetAssociation.associationEnd.find(function (end) {
              return end.role === navProp.toRole;
            });

            if (associationEnd) {
              navProp.targetType = objectMap[associationEnd.type];
            }
          }
        }
      });
      entityType.resolvePath = createResolvePathFn(entityType, objectMap);
    });
  }

  function linkActionsToEntityType(parserOutput, objectMap) {
    parserOutput.schema.actions.forEach(function (action) {
      if (action.isBound) {
        var sourceEntityType = objectMap[action.sourceType];
        action.sourceEntityType = sourceEntityType;

        if (sourceEntityType) {
          if (!sourceEntityType.actions) {
            sourceEntityType.actions = {};
          }

          sourceEntityType.actions[action.name] = action;
          sourceEntityType.actions["".concat(parserOutput.schema.namespace, ".").concat(action.name)] = action;
        }

        var returnEntityType = objectMap[action.returnType];
        action.returnEntityType = returnEntityType;
      }
    });
  }

  function linkEntityTypeToEntitySet(parserOutput, objectMap) {
    parserOutput.schema.entitySets.forEach(function (entitySet) {
      entitySet.entityTypeInstance = objectMap[entitySet.entityType];
    });
  }

  function convertTypes(parserOutput) {
    var objectMap = buildObjectMap(parserOutput);
    resolveNavigationProperties(parserOutput, objectMap);
    linkActionsToEntityType(parserOutput, objectMap);
    linkEntityTypeToEntitySet(parserOutput, objectMap);
    var toResolve = [];
    var unresolvedAnnotations = [];
    Object.keys(parserOutput.schema.annotations).forEach(function (annotationSource) {
      parserOutput.schema.annotations[annotationSource].forEach(function (annotationList) {
        var currentTargetName = parserOutput.unalias(annotationList.target);
        var currentTarget = objectMap[currentTargetName];

        if (!currentTarget) {
          if (currentTargetName.indexOf("@") !== -1) {
            unresolvedAnnotations.push(annotationList);
          }
        } else {
          if (!currentTarget.annotations) {
            currentTarget.annotations = {};
          }

          annotationList.annotations.forEach(function (annotation) {
            var _annotation$term$spli = annotation.term.split("."),
                _annotation$term$spli2 = _slicedToArray(_annotation$term$spli, 2),
                vocAlias = _annotation$term$spli2[0],
                vocTerm = _annotation$term$spli2[1];

            if (!currentTarget.annotations[vocAlias]) {
              currentTarget.annotations[vocAlias] = {};
            }

            if (!currentTarget.annotations._annotations) {
              currentTarget.annotations._annotations = {};
            }

            var vocTermWithQualifier = "".concat(vocTerm).concat(annotation.qualifier ? "#".concat(annotation.qualifier) : "");
            currentTarget.annotations[vocAlias][vocTermWithQualifier] = convertAnnotation(annotation, parserOutput, currentTarget, objectMap, toResolve);

            if (currentTarget.annotations[vocAlias][vocTermWithQualifier] !== null && typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === "object") {
              currentTarget.annotations[vocAlias][vocTermWithQualifier].term = parserOutput.unalias("".concat(vocAlias, ".").concat(vocTerm));
              currentTarget.annotations[vocAlias][vocTermWithQualifier].qualifier = annotation.qualifier;
            }

            currentTarget.annotations._annotations["".concat(vocAlias, ".").concat(vocTermWithQualifier)] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
            objectMap["".concat(currentTargetName, "@").concat(parserOutput.unalias(vocAlias + "." + vocTermWithQualifier))] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
          });
        }
      });
    });
    unresolvedAnnotations.forEach(function (annotationList) {
      var currentTargetName = parserOutput.unalias(annotationList.target);

      var _currentTargetName$sp = currentTargetName.split("@"),
          _currentTargetName$sp2 = _slicedToArray(_currentTargetName$sp, 2),
          baseObj = _currentTargetName$sp2[0],
          annotationPart = _currentTargetName$sp2[1];

      var targetSplit = annotationPart.split("/");
      baseObj = baseObj + "@" + targetSplit[0];
      var currentTarget = targetSplit.slice(1).reduce(function (currentObj, path) {
        if (!currentObj) {
          return null;
        }

        return currentObj[path];
      }, objectMap[baseObj]);

      if (!currentTarget) {// console.log("Missing target again " + currentTargetName);
      } else {
        if (!currentTarget.annotations) {
          currentTarget.annotations = {};
        }

        annotationList.annotations.forEach(function (annotation) {
          var _annotation$term$spli3 = annotation.term.split("."),
              _annotation$term$spli4 = _slicedToArray(_annotation$term$spli3, 2),
              vocAlias = _annotation$term$spli4[0],
              vocTerm = _annotation$term$spli4[1];

          if (!currentTarget.annotations[vocAlias]) {
            currentTarget.annotations[vocAlias] = {};
          }

          if (!currentTarget.annotations._annotations) {
            currentTarget.annotations._annotations = {};
          }

          var vocTermWithQualifier = "".concat(vocTerm).concat(annotation.qualifier ? "#".concat(annotation.qualifier) : "");
          currentTarget.annotations[vocAlias][vocTermWithQualifier] = convertAnnotation(annotation, parserOutput, currentTarget, objectMap, toResolve);

          if (currentTarget.annotations[vocAlias][vocTermWithQualifier] !== null && typeof currentTarget.annotations[vocAlias][vocTermWithQualifier] === "object") {
            currentTarget.annotations[vocAlias][vocTermWithQualifier].term = parserOutput.unalias("".concat(vocAlias, ".").concat(vocTerm));
            currentTarget.annotations[vocAlias][vocTermWithQualifier].qualifier = annotation.qualifier;
          }

          currentTarget.annotations._annotations["".concat(vocAlias, ".").concat(vocTermWithQualifier)] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
          objectMap["".concat(currentTargetName, "@").concat(parserOutput.unalias(vocAlias + "." + vocTermWithQualifier))] = currentTarget.annotations[vocAlias][vocTermWithQualifier];
        });
      }
    });
    toResolve.forEach(function (resolveable) {
      var targetStr = resolveable.$target;
      resolveable.$target = objectMap[targetStr];
    });
    return parserOutput;
  }

  var AnnotationConverter = {
    convertTypes: convertTypes
  };
  return AnnotationConverter;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9zYXAvZmUvY29yZS9jb252ZXJ0ZXJzL2NvbW1vbi9Bbm5vdGF0aW9uQ29udmVydGVyLnRzIl0sIm5hbWVzIjpbIlBhdGgiLCJwYXRoRXhwcmVzc2lvbiIsInRhcmdldE5hbWUiLCJwYXRoIiwidHlwZSIsIiR0YXJnZXQiLCJidWlsZE9iamVjdE1hcCIsInBhcnNlck91dHB1dCIsIm9iamVjdE1hcCIsInNjaGVtYSIsImVudGl0eUNvbnRhaW5lciIsImZ1bGx5UXVhbGlmaWVkTmFtZSIsImVudGl0eVNldHMiLCJmb3JFYWNoIiwiZW50aXR5U2V0IiwiYWN0aW9ucyIsImFjdGlvbiIsInBhcmFtZXRlcnMiLCJwYXJhbWV0ZXIiLCJlbnRpdHlUeXBlcyIsImVudGl0eVR5cGUiLCJlbnRpdHlQcm9wZXJ0aWVzIiwicHJvcGVydHkiLCJuYXZpZ2F0aW9uUHJvcGVydGllcyIsIm5hdlByb3BlcnR5IiwiT2JqZWN0Iiwia2V5cyIsImFubm90YXRpb25zIiwiYW5ub3RhdGlvblNvdXJjZSIsImFubm90YXRpb25MaXN0IiwiY3VycmVudFRhcmdldE5hbWUiLCJ1bmFsaWFzIiwidGFyZ2V0IiwiYW5ub3RhdGlvbiIsImFubm90YXRpb25GUU4iLCJ0ZXJtIiwicXVhbGlmaWVyIiwiY29tYmluZVBhdGgiLCJjdXJyZW50VGFyZ2V0Iiwic3RhcnRzV2l0aCIsInJlc29sdmVUYXJnZXQiLCJwYXRoT25seSIsInBhdGhTcGxpdCIsInNwbGl0IiwiY3VycmVudFBhdGgiLCJyZWR1Y2UiLCJjdXJyZW50VmFsdWUiLCJwYXRoUGFydCIsIl90eXBlIiwidGFyZ2V0VHlwZU5hbWUiLCJ0YXJnZXRUeXBlIiwic3Vic3RyIiwibGFzdEluZGV4T2YiLCJpc0JvdW5kIiwic291cmNlVHlwZSIsImlzRW50aXR5U2V0IiwibGFzdElkeCIsImxlbmd0aCIsInBhcnNlVmFsdWUiLCJwcm9wZXJ0eVZhbHVlIiwidG9SZXNvbHZlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiSW50IiwiQm9vbCIsIkRlY2ltYWwiLCJEYXRlIiwiRW51bU1lbWJlciIsInZhbHVlIiwiUHJvcGVydHlQYXRoIiwiTmF2aWdhdGlvblByb3BlcnR5UGF0aCIsImFubm90YXRpb25UYXJnZXQiLCJBbm5vdGF0aW9uUGF0aCIsImFubm90YXRpb25QYXRoIiwicHVzaCIsInBhcnNlUmVjb3JkIiwiUmVjb3JkIiwicGFyc2VDb2xsZWN0aW9uIiwiQ29sbGVjdGlvbiIsInJlY29yZERlZmluaXRpb24iLCJhbm5vdGF0aW9uVGVybSIsIiRUeXBlIiwiYW5ub3RhdGlvbkNvbnRlbnQiLCJwcm9wZXJ0eVZhbHVlcyIsIm5hbWUiLCJhc3NpZ24iLCJjb2xsZWN0aW9uRGVmaW5pdGlvbiIsIm1hcCIsInByb3BlcnR5UGF0aCIsInBhdGhWYWx1ZSIsImFubm90YXRpb25Db2xsZWN0aW9uRWxlbWVudCIsIm5hdlByb3BlcnR5UGF0aCIsInN0cmluZ1ZhbHVlIiwiRXJyb3IiLCJjb252ZXJ0QW5ub3RhdGlvbiIsInJlY29yZCIsImlzQ29sbGVjdGlvbiIsImNvbGxlY3Rpb24iLCJjcmVhdGVSZXNvbHZlUGF0aEZuIiwicmVsYXRpdmVQYXRoIiwicmVzb2x2ZU5hdmlnYXRpb25Qcm9wZXJ0aWVzIiwibmF2UHJvcCIsInJlbGF0aW9uc2hpcCIsInRhcmdldEFzc29jaWF0aW9uIiwiYXNzb2NpYXRpb25zIiwiZmluZCIsImFzc29jaWF0aW9uIiwiYXNzb2NpYXRpb25FbmQiLCJlbmQiLCJyb2xlIiwidG9Sb2xlIiwicmVzb2x2ZVBhdGgiLCJsaW5rQWN0aW9uc1RvRW50aXR5VHlwZSIsInNvdXJjZUVudGl0eVR5cGUiLCJuYW1lc3BhY2UiLCJyZXR1cm5FbnRpdHlUeXBlIiwicmV0dXJuVHlwZSIsImxpbmtFbnRpdHlUeXBlVG9FbnRpdHlTZXQiLCJlbnRpdHlUeXBlSW5zdGFuY2UiLCJjb252ZXJ0VHlwZXMiLCJ1bnJlc29sdmVkQW5ub3RhdGlvbnMiLCJpbmRleE9mIiwidm9jQWxpYXMiLCJ2b2NUZXJtIiwiX2Fubm90YXRpb25zIiwidm9jVGVybVdpdGhRdWFsaWZpZXIiLCJiYXNlT2JqIiwiYW5ub3RhdGlvblBhcnQiLCJ0YXJnZXRTcGxpdCIsInNsaWNlIiwiY3VycmVudE9iaiIsInJlc29sdmVhYmxlIiwidGFyZ2V0U3RyIiwiQW5ub3RhdGlvbkNvbnZlcnRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7TUFjTUEsSSxHQUtMLGNBQVlDLGNBQVosRUFBNENDLFVBQTVDLEVBQWdFO0FBQUE7O0FBQy9ELFNBQUtDLElBQUwsR0FBWUYsY0FBYyxDQUFDRCxJQUEzQjtBQUNBLFNBQUtJLElBQUwsR0FBWSxNQUFaO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxVQUFmO0FBQ0EsRzs7QUFHRixXQUFTSSxjQUFULENBQXdCQyxZQUF4QixFQUF5RTtBQUN4RSxRQUFNQyxTQUFjLEdBQUcsRUFBdkI7O0FBQ0EsUUFBSUQsWUFBWSxDQUFDRSxNQUFiLENBQW9CQyxlQUFwQixJQUF1Q0gsWUFBWSxDQUFDRSxNQUFiLENBQW9CQyxlQUFwQixDQUFvQ0Msa0JBQS9FLEVBQW1HO0FBQ2xHSCxNQUFBQSxTQUFTLENBQUNELFlBQVksQ0FBQ0UsTUFBYixDQUFvQkMsZUFBcEIsQ0FBb0NDLGtCQUFyQyxDQUFULEdBQW9FSixZQUFZLENBQUNFLE1BQWIsQ0FBb0JDLGVBQXhGO0FBQ0E7O0FBQ0RILElBQUFBLFlBQVksQ0FBQ0UsTUFBYixDQUFvQkcsVUFBcEIsQ0FBK0JDLE9BQS9CLENBQXVDLFVBQUFDLFNBQVMsRUFBSTtBQUNuRE4sTUFBQUEsU0FBUyxDQUFDTSxTQUFTLENBQUNILGtCQUFYLENBQVQsR0FBMENHLFNBQTFDO0FBQ0EsS0FGRDtBQUdBUCxJQUFBQSxZQUFZLENBQUNFLE1BQWIsQ0FBb0JNLE9BQXBCLENBQTRCRixPQUE1QixDQUFvQyxVQUFBRyxNQUFNLEVBQUk7QUFDN0NSLE1BQUFBLFNBQVMsQ0FBQ1EsTUFBTSxDQUFDTCxrQkFBUixDQUFULEdBQXVDSyxNQUF2QztBQUNBQSxNQUFBQSxNQUFN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O1NBSWVjLG1CIiwic291cmNlUm9vdCI6Ii4iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuXHRBY3Rpb24sXG5cdEFubm90YXRpb24sXG5cdEFubm90YXRpb25MaXN0LFxuXHRBbm5vdGF0aW9uUmVjb3JkLFxuXHRFbnRpdHlUeXBlLFxuXHRFeHByZXNzaW9uLFxuXHRQYXJzZXJPdXRwdXQsXG5cdFBhdGhFeHByZXNzaW9uLFxuXHRQcm9wZXJ0eVZhbHVlLFxuXHRWMk5hdmlnYXRpb25Qcm9wZXJ0eSxcblx0VjROYXZpZ2F0aW9uUHJvcGVydHlcbn0gZnJvbSBcIkBzYXAtdXgvdm9jYWJ1bGFyaWVzLXR5cGVzXCI7XG5cbmNsYXNzIFBhdGgge1xuXHRwYXRoOiBzdHJpbmc7XG5cdCR0YXJnZXQ6IHN0cmluZztcblx0dHlwZTogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKHBhdGhFeHByZXNzaW9uOiBQYXRoRXhwcmVzc2lvbiwgdGFyZ2V0TmFtZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5wYXRoID0gcGF0aEV4cHJlc3Npb24uUGF0aDtcblx0XHR0aGlzLnR5cGUgPSBcIlBhdGhcIjtcblx0XHR0aGlzLiR0YXJnZXQgPSB0YXJnZXROYW1lO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkT2JqZWN0TWFwKHBhcnNlck91dHB1dDogUGFyc2VyT3V0cHV0KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG5cdGNvbnN0IG9iamVjdE1hcDogYW55ID0ge307XG5cdGlmIChwYXJzZXJPdXRwdXQuc2NoZW1hLmVudGl0eUNvbnRhaW5lciAmJiBwYXJzZXJPdXRwdXQuc2NoZW1hLmVudGl0eUNvbnRhaW5lci5mdWxseVF1YWxpZmllZE5hbWUpIHtcblx0XHRvYmplY3RNYXBbcGFyc2VyT3V0cHV0LnNjaGVtYS5lbnRpdHlDb250YWluZXIuZnVsbHlRdWFsaWZpZWROYW1lXSA9IHBhcnNlck91dHB1dC5zY2hlbWEuZW50aXR5Q29udGFpbmVyO1xuXHR9XG5cdHBhcnNlck91dHB1dC5zY2hlbWEuZW50aXR5U2V0cy5mb3JFYWNoKGVudGl0eVNldCA9PiB7XG5cdFx0b2JqZWN0TWFwW2VudGl0eVNldC5mdWxseVF1YWxpZmllZE5hbWVdID0gZW50aXR5U2V0O1xuXHR9KTtcblx0cGFyc2VyT3V0cHV0LnNjaGVtYS5hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IHtcblx0XHRvYmplY3RNYXBbYWN0aW9uLmZ1bGx5UXVhbGlmaWVkTmFtZV0gPSBhY3Rpb247XG5cdFx0YWN0aW9uLnBhcmFtZXRlcnMuZm9yRWFjaChwYXJhbWV0ZXIgPT4ge1xuXHRcdFx0b2JqZWN0TWFwW3BhcmFtZXRlci5mdWxseVF1YWxpZmllZE5hbWVdID0gcGFyYW1ldGVyO1xuXHRcdH0pO1xuXHR9KTtcblx0cGFyc2VyT3V0cHV0LnNjaGVtYS5lbnRpdHlUeXBlcy5mb3JFYWNoKGVudGl0eVR5cGUgPT4ge1xuXHRcdG9iamVjdE1hcFtlbnRpdHlUeXBlLmZ1bGx5UXVhbGlmaWVkTmFtZV0gPSBlbnRpdHlUeXBlO1xuXHRcdGVudGl0eVR5cGUuZW50aXR5UHJvcGVydGllcy5mb3JFYWNoKHByb3BlcnR5ID0+IHtcblx0XHRcdG9iamVjdE1hcFtwcm9wZXJ0eS5mdWxseVF1YWxpZmllZE5hbWVdID0gcHJvcGVydHk7XG5cdFx0fSk7XG5cdFx0ZW50aXR5VHlwZS5uYXZpZ2F0aW9uUHJvcGVydGllcy5mb3JFYWNoKG5hdlByb3BlcnR5ID0+IHtcblx0XHRcdG9iamVjdE1hcFtuYXZQcm9wZXJ0eS5mdWxseVF1YWxpZmllZE5hbWVdID0gbmF2UHJvcGVydHk7XG5cdFx0fSk7XG5cdH0pO1xuXHRPYmplY3Qua2V5cyhwYXJzZXJPdXRwdXQuc2NoZW1hLmFubm90YXRpb25zKS5mb3JFYWNoKGFubm90YXRpb25Tb3VyY2UgPT4ge1xuXHRcdHBhcnNlck91dHB1dC5zY2hlbWEuYW5ub3RhdGlvbnNbYW5ub3RhdGlvblNvdXJjZV0uZm9yRWFjaChhbm5vdGF0aW9uTGlzdCA9PiB7XG5cdFx0XHRjb25zdCBjdXJyZW50VGFyZ2V0TmFtZSA9IHBhcnNlck91dHB1dC51bmFsaWFzKGFubm90YXRpb25MaXN0LnRhcmdldCk7XG5cdFx0XHRhbm5vdGF0aW9uTGlzdC5hbm5vdGF0aW9ucy5mb3JFYWNoKGFubm90YXRpb24gPT4ge1xuXHRcdFx0XHRsZXQgYW5ub3RhdGlvbkZRTiA9IGAke2N1cnJlbnRUYXJnZXROYW1lfUAke3BhcnNlck91dHB1dC51bmFsaWFzKGFubm90YXRpb24udGVybSl9YDtcblx0XHRcdFx0aWYgKGFubm90YXRpb24ucXVhbGlmaWVyKSB7XG5cdFx0XHRcdFx0YW5ub3RhdGlvbkZRTiArPSBgIyR7YW5ub3RhdGlvbi5xdWFsaWZpZXJ9YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRvYmplY3RNYXBbYW5ub3RhdGlvbkZRTl0gPSBhbm5vdGF0aW9uO1xuXHRcdFx0XHRhbm5vdGF0aW9uLmZ1bGx5UXVhbGlmaWVkTmFtZSA9IGFubm90YXRpb25GUU47XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSk7XG5cdHJldHVybiBvYmplY3RNYXA7XG59XG5cbmZ1bmN0aW9uIGNvbWJpbmVQYXRoKGN1cnJlbnRUYXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcblx0aWYgKHBhdGguc3RhcnRzV2l0aChcIkBcIikpIHtcblx0XHRyZXR1cm4gY3VycmVudFRhcmdldCArIHBhdGg7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRUYXJnZXQgKyBcIi9cIiArIHBhdGg7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVRhcmdldChvYmplY3RNYXA6IGFueSwgY3VycmVudFRhcmdldDogYW55LCBwYXRoOiBzdHJpbmcsIHBhdGhPbmx5OiBib29sZWFuID0gZmFsc2UpIHtcblx0cGF0aCA9IGNvbWJpbmVQYXRoKGN1cnJlbnRUYXJnZXQuZnVsbHlRdWFsaWZpZWROYW1lLCBwYXRoKTtcblxuXHRjb25zdCBwYXRoU3BsaXQgPSBwYXRoLnNwbGl0KFwiL1wiKTtcblx0bGV0IGN1cnJlbnRQYXRoID0gcGF0aDtcblx0Y29uc3QgdGFyZ2V0ID0gcGF0aFNwbGl0LnJlZHVjZSgoY3VycmVudFZhbHVlOiBhbnksIHBhdGhQYXJ0KSA9PiB7XG5cdFx0aWYgKCFjdXJyZW50VmFsdWUpIHtcblx0XHRcdGN1cnJlbnRQYXRoID0gcGF0aFBhcnQ7XG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VmFsdWUuX3R5cGUgPT09IFwiRW50aXR5U2V0XCIgJiYgY3VycmVudFZhbHVlLmVudGl0eVR5cGUpIHtcblx0XHRcdGN1cnJlbnRQYXRoID0gY29tYmluZVBhdGgoY3VycmVudFZhbHVlLmVudGl0eVR5cGUsIHBhdGhQYXJ0KTtcblx0XHR9IGVsc2UgaWYgKGN1cnJlbnRWYWx1ZS5fdHlwZSA9PT0gXCJOYXZpZ2F0aW9uUHJvcGVydHlcIiAmJiBjdXJyZW50VmFsdWUudGFyZ2V0VHlwZU5hbWUpIHtcblx0XHRcdGN1cnJlbnRQYXRoID0gY29tYmluZVBhdGgoY3VycmVudFZhbHVlLnRhcmdldFR5cGVOYW1lLCBwYXRoUGFydCk7XG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VmFsdWUuX3R5cGUgPT09IFwiTmF2aWdhdGlvblByb3BlcnR5XCIgJiYgY3VycmVudFZhbHVlLnRhcmdldFR5cGUpIHtcblx0XHRcdGN1cnJlbnRQYXRoID0gY29tYmluZVBhdGgoY3VycmVudFZhbHVlLnRhcmdldFR5cGUuZnVsbHlRdWFsaWZpZWROYW1lLCBwYXRoUGFydCk7XG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VmFsdWUuX3R5cGUgPT09IFwiUHJvcGVydHlcIikge1xuXHRcdFx0Y3VycmVudFBhdGggPSBjb21iaW5lUGF0aChcblx0XHRcdFx0Y3VycmVudFRhcmdldC5mdWxseVF1YWxpZmllZE5hbWUuc3Vic3RyKDAsIGN1cnJlbnRUYXJnZXQuZnVsbHlRdWFsaWZpZWROYW1lLmxhc3RJbmRleE9mKFwiL1wiKSksXG5cdFx0XHRcdHBhdGhQYXJ0XG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAoY3VycmVudFZhbHVlLl90eXBlID09PSBcIkFjdGlvblwiICYmIGN1cnJlbnRWYWx1ZS5pc0JvdW5kKSB7XG5cdFx0XHRjdXJyZW50UGF0aCA9IGNvbWJpbmVQYXRoKGN1cnJlbnRWYWx1ZS5mdWxseVF1YWxpZmllZE5hbWUsIHBhdGhQYXJ0KTtcblx0XHRcdGlmICghb2JqZWN0TWFwW2N1cnJlbnRQYXRoXSkge1xuXHRcdFx0XHRjdXJyZW50UGF0aCA9IGNvbWJpbmVQYXRoKGN1cnJlbnRWYWx1ZS5zb3VyY2VUeXBlLCBwYXRoUGFydCk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VmFsdWUuX3R5cGUgPT09IFwiQWN0aW9uUGFyYW1ldGVyXCIgJiYgY3VycmVudFZhbHVlLmlzRW50aXR5U2V0KSB7XG5cdFx0XHRjdXJyZW50UGF0aCA9IGNvbWJpbmVQYXRoKGN1cnJlbnRWYWx1ZS50eXBlLCBwYXRoUGFydCk7XG5cdFx0fSBlbHNlIGlmIChjdXJyZW50VmFsdWUuX3R5cGUgPT09IFwiQWN0aW9uUGFyYW1ldGVyXCIgJiYgIWN1cnJlbnRWYWx1ZS5pc0VudGl0eVNldCkge1xuXHRcdFx0Y3VycmVudFBhdGggPSBjb21iaW5lUGF0aChcblx0XHRcdFx0Y3VycmVudFRhcmdldC5mdWxseVF1YWxpZmllZE5hbWUuc3Vic3RyKDAsIGN1cnJlbnRUYXJnZXQuZnVsbHlRdWFsaWZpZWROYW1lLmxhc3RJbmRleE9mKFwiL1wiKSksXG5cdFx0XHRcdHBhdGhQYXJ0XG5cdFx0XHQpO1xuXHRcdFx0aWYgKCFvYmplY3RNYXBbY3VycmVudFBhdGhdKSB7XG5cdFx0XHRcdGxldCBsYXN0SWR4ID0gY3VycmVudFRhcmdldC5mdWxseVF1YWxpZmllZE5hbWUubGFzdEluZGV4T2YoXCIvXCIpO1xuXHRcdFx0XHRpZiAobGFzdElkeCA9PT0gLTEpIHtcblx0XHRcdFx0XHRsYXN0SWR4ID0gY3VycmVudFRhcmdldC5mdWxseVF1YWxpZmllZE5hbWUubGVuZ3RoO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN1cnJlbnRQYXRoID0gY29tYmluZVBhdGgoXG5cdFx0XHRcdFx0KG9iamVjdE1hcFtjdXJyZW50VGFyZ2V0LmZ1bGx5UXVhbGlmaWVkTmFtZS5zdWJzdHIoMCwgbGFzdElkeCldIGFzIEFjdGlvbikuc291cmNlVHlwZSxcblx0XHRcdFx0XHRwYXRoUGFydFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50UGF0aCA9IGNvbWJpbmVQYXRoKGN1cnJlbnRWYWx1ZS5mdWxseVF1YWxpZmllZE5hbWUsIHBhdGhQYXJ0KTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iamVjdE1hcFtjdXJyZW50UGF0aF07XG5cdH0sIG51bGwpO1xuXHRpZiAoIXRhcmdldCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKFwiTWlzc2luZyB0YXJnZXQgXCIgKyBwYXRoKTtcblx0fVxuXHRpZiAocGF0aE9ubHkpIHtcblx0XHRyZXR1cm4gY3VycmVudFBhdGg7XG5cdH1cblx0cmV0dXJuIHRhcmdldDtcbn1cblxuZnVuY3Rpb24gcGFyc2VWYWx1ZShcblx0cHJvcGVydHlWYWx1ZTogRXhwcmVzc2lvbixcblx0cGFyc2VyT3V0cHV0OiBQYXJzZXJPdXRwdXQsXG5cdGN1cnJlbnRUYXJnZXQ6IGFueSxcblx0b2JqZWN0TWFwOiBhbnksXG5cdHRvUmVzb2x2ZTogUmVzb2x2ZWFibGVbXVxuKSB7XG5cdGlmIChwcm9wZXJ0eVZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cdHN3aXRjaCAocHJvcGVydHlWYWx1ZS50eXBlKSB7XG5cdFx0Y2FzZSBcIlN0cmluZ1wiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWUuU3RyaW5nO1xuXHRcdGNhc2UgXCJJbnRcIjpcblx0XHRcdHJldHVybiBwcm9wZXJ0eVZhbHVlLkludDtcblx0XHRjYXNlIFwiQm9vbFwiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWUuQm9vbDtcblx0XHRjYXNlIFwiRGVjaW1hbFwiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWUuRGVjaW1hbDtcblx0XHRjYXNlIFwiRGF0ZVwiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWUuRGF0ZTtcblx0XHRjYXNlIFwiRW51bU1lbWJlclwiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWUuRW51bU1lbWJlcjtcblx0XHRjYXNlIFwiUHJvcGVydHlQYXRoXCI6XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0eXBlOiBcIlByb3BlcnR5UGF0aFwiLFxuXHRcdFx0XHR2YWx1ZTogcHJvcGVydHlWYWx1ZS5Qcm9wZXJ0eVBhdGgsXG5cdFx0XHRcdCR0YXJnZXQ6IHJlc29sdmVUYXJnZXQob2JqZWN0TWFwLCBjdXJyZW50VGFyZ2V0LCBwcm9wZXJ0eVZhbHVlLlByb3BlcnR5UGF0aClcblx0XHRcdH07XG5cdFx0Y2FzZSBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIjpcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHR5cGU6IFwiTmF2aWdhdGlvblByb3BlcnR5UGF0aFwiLFxuXHRcdFx0XHR2YWx1ZTogcHJvcGVydHlWYWx1ZS5OYXZpZ2F0aW9uUHJvcGVydHlQYXRoLFxuXHRcdFx0XHQkdGFyZ2V0OiByZXNvbHZlVGFyZ2V0KG9iamVjdE1hcCwgY3VycmVudFRhcmdldCwgcHJvcGVydHlWYWx1ZS5OYXZpZ2F0aW9uUHJvcGVydHlQYXRoKVxuXHRcdFx0fTtcblx0XHRjYXNlIFwiQW5ub3RhdGlvblBhdGhcIjpcblx0XHRcdGNvbnN0IGFubm90YXRpb25UYXJnZXQgPSByZXNvbHZlVGFyZ2V0KFxuXHRcdFx0XHRvYmplY3RNYXAsXG5cdFx0XHRcdGN1cnJlbnRUYXJnZXQsXG5cdFx0XHRcdHBhcnNlck91dHB1dC51bmFsaWFzKHByb3BlcnR5VmFsdWUuQW5ub3RhdGlvblBhdGgpLFxuXHRcdFx0XHR0cnVlXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgYW5ub3RhdGlvblBhdGggPSB7XG5cdFx0XHRcdHR5cGU6IFwiQW5ub3RhdGlvblBhdGhcIixcblx0XHRcdFx0dmFsdWU6IHByb3BlcnR5VmFsdWUuQW5ub3RhdGlvblBhdGgsXG5cdFx0XHRcdCR0YXJnZXQ6IGFubm90YXRpb25UYXJnZXRcblx0XHRcdH07XG5cdFx0XHR0b1Jlc29sdmUucHVzaChhbm5vdGF0aW9uUGF0aCk7XG5cdFx0XHRyZXR1cm4gYW5ub3RhdGlvblBhdGg7XG5cdFx0Y2FzZSBcIlBhdGhcIjpcblx0XHRcdGNvbnN0ICR0YXJnZXQgPSByZXNvbHZlVGFyZ2V0KG9iamVjdE1hcCwgY3VycmVudFRhcmdldCwgcHJvcGVydHlWYWx1ZS5QYXRoLCB0cnVlKTtcblx0XHRcdGNvbnN0IHBhdGggPSBuZXcgUGF0aChwcm9wZXJ0eVZhbHVlLCAkdGFyZ2V0KTtcblx0XHRcdHRvUmVzb2x2ZS5wdXNoKHBhdGgpO1xuXHRcdFx0cmV0dXJuIHBhdGg7XG5cdFx0Y2FzZSBcIlJlY29yZFwiOlxuXHRcdFx0cmV0dXJuIHBhcnNlUmVjb3JkKHByb3BlcnR5VmFsdWUuUmVjb3JkLCBwYXJzZXJPdXRwdXQsIGN1cnJlbnRUYXJnZXQsIG9iamVjdE1hcCwgdG9SZXNvbHZlKTtcblx0XHRjYXNlIFwiQ29sbGVjdGlvblwiOlxuXHRcdFx0cmV0dXJuIHBhcnNlQ29sbGVjdGlvbihwcm9wZXJ0eVZhbHVlLkNvbGxlY3Rpb24sIHBhcnNlck91dHB1dCwgY3VycmVudFRhcmdldCwgb2JqZWN0TWFwLCB0b1Jlc29sdmUpO1xuXHRcdGNhc2UgXCJBcHBseVwiOlxuXHRcdFx0cmV0dXJuIHByb3BlcnR5VmFsdWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyc2VSZWNvcmQoXG5cdHJlY29yZERlZmluaXRpb246IEFubm90YXRpb25SZWNvcmQsXG5cdHBhcnNlck91dHB1dDogUGFyc2VyT3V0cHV0LFxuXHRjdXJyZW50VGFyZ2V0OiBhbnksXG5cdG9iamVjdE1hcDogYW55LFxuXHR0b1Jlc29sdmU6IFJlc29sdmVhYmxlW11cbikge1xuXHRjb25zdCBhbm5vdGF0aW9uVGVybTogYW55ID0ge1xuXHRcdCRUeXBlOiBwYXJzZXJPdXRwdXQudW5hbGlhcyhyZWNvcmREZWZpbml0aW9uLnR5cGUpXG5cdH07XG5cdGNvbnN0IGFubm90YXRpb25Db250ZW50OiBhbnkgPSB7fTtcblx0cmVjb3JkRGVmaW5pdGlvbi5wcm9wZXJ0eVZhbHVlcy5mb3JFYWNoKChwcm9wZXJ0eVZhbHVlOiBQcm9wZXJ0eVZhbHVlKSA9PiB7XG5cdFx0YW5ub3RhdGlvbkNvbnRlbnRbcHJvcGVydHlWYWx1ZS5uYW1lXSA9IHBhcnNlVmFsdWUoXG5cdFx0XHRwcm9wZXJ0eVZhbHVlLnZhbHVlLFxuXHRcdFx0cGFyc2VyT3V0cHV0LFxuXHRcdFx0Y3VycmVudFRhcmdldCxcblx0XHRcdG9iamVjdE1hcCxcblx0XHRcdHRvUmVzb2x2ZVxuXHRcdCk7XG5cdH0pO1xuXHRyZXR1cm4gT2JqZWN0LmFzc2lnbihhbm5vdGF0aW9uVGVybSwgYW5ub3RhdGlvbkNvbnRlbnQpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUNvbGxlY3Rpb24oXG5cdGNvbGxlY3Rpb25EZWZpbml0aW9uOiBhbnlbXSxcblx0cGFyc2VyT3V0cHV0OiBQYXJzZXJPdXRwdXQsXG5cdGN1cnJlbnRUYXJnZXQ6IGFueSxcblx0b2JqZWN0TWFwOiBhbnksXG5cdHRvUmVzb2x2ZTogUmVzb2x2ZWFibGVbXVxuKSB7XG5cdHN3aXRjaCAoKGNvbGxlY3Rpb25EZWZpbml0aW9uIGFzIGFueSkudHlwZSkge1xuXHRcdGNhc2UgXCJQcm9wZXJ0eVBhdGhcIjpcblx0XHRcdHJldHVybiBjb2xsZWN0aW9uRGVmaW5pdGlvbi5tYXAocHJvcGVydHlQYXRoID0+IHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR0eXBlOiBcIlByb3BlcnR5UGF0aFwiLFxuXHRcdFx0XHRcdHZhbHVlOiBwcm9wZXJ0eVBhdGguUHJvcGVydHlQYXRoLFxuXHRcdFx0XHRcdCR0YXJnZXQ6IHJlc29sdmVUYXJnZXQob2JqZWN0TWFwLCBjdXJyZW50VGFyZ2V0LCBwcm9wZXJ0eVBhdGguUHJvcGVydHlQYXRoKVxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0Y2FzZSBcIlBhdGhcIjpcblx0XHRcdHJldHVybiBjb2xsZWN0aW9uRGVmaW5pdGlvbi5tYXAocGF0aFZhbHVlID0+IHtcblx0XHRcdFx0Y29uc3QgJHRhcmdldCA9IHJlc29sdmVUYXJnZXQob2JqZWN0TWFwLCBjdXJyZW50VGFyZ2V0LCBwYXRoVmFsdWUuUGF0aCwgdHJ1ZSk7XG5cdFx0XHRcdGNvbnN0IHBhdGggPSBuZXcgUGF0aChwYXRoVmFsdWUsICR0YXJnZXQpO1xuXHRcdFx0XHR0b1Jlc29sdmUucHVzaChwYXRoKTtcblx0XHRcdFx0cmV0dXJuIHBhdGg7XG5cdFx0XHR9KTtcblx0XHRjYXNlIFwiQW5ub3RhdGlvblBhdGhcIjpcblx0XHRcdHJldHVybiBjb2xsZWN0aW9uRGVmaW5pdGlvbi5tYXAoYW5ub3RhdGlvblBhdGggPT4ge1xuXHRcdFx0XHRjb25zdCBhbm5vdGF0aW9uVGFyZ2V0ID0gcmVzb2x2ZVRhcmdldChvYmplY3RNYXAsIGN1cnJlbnRUYXJnZXQsIGFubm90YXRpb25QYXRoLkFubm90YXRpb25QYXRoLCB0cnVlKTtcblx0XHRcdFx0Y29uc3QgYW5ub3RhdGlvbkNvbGxlY3Rpb25FbGVtZW50ID0ge1xuXHRcdFx0XHRcdHR5cGU6IFwiQW5ub3RhdGlvblBhdGhcIixcblx0XHRcdFx0XHR2YWx1ZTogYW5ub3RhdGlvblBhdGguQW5ub3RhdGlvblBhdGgsXG5cdFx0XHRcdFx0JHRhcmdldDogYW5ub3RhdGlvblRhcmdldFxuXHRcdFx0XHR9O1xuXHRcdFx0XHR0b1Jlc29sdmUucHVzaChhbm5vdGF0aW9uQ29sbGVjdGlvbkVsZW1lbnQpO1xuXHRcdFx0XHRyZXR1cm4gYW5ub3RhdGlvbkNvbGxlY3Rpb25FbGVtZW50O1xuXHRcdFx0fSk7XG5cdFx0Y2FzZSBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIjpcblx0XHRcdHJldHVybiBjb2xsZWN0aW9uRGVmaW5pdGlvbi5tYXAobmF2UHJvcGVydHlQYXRoID0+IHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR0eXBlOiBcIk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGhcIixcblx0XHRcdFx0XHR2YWx1ZTogbmF2UHJvcGVydHlQYXRoLk5hdmlnYXRpb25Qcm9wZXJ0eVBhdGgsXG5cdFx0XHRcdFx0JHRhcmdldDogcmVzb2x2ZVRhcmdldChvYmplY3RNYXAsIGN1cnJlbnRUYXJnZXQsIG5hdlByb3BlcnR5UGF0aC5OYXZpZ2F0aW9uUHJvcGVydHlQYXRoKVxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0Y2FzZSBcIlJlY29yZFwiOlxuXHRcdFx0cmV0dXJuIGNvbGxlY3Rpb25EZWZpbml0aW9uLm1hcChyZWNvcmREZWZpbml0aW9uID0+IHtcblx0XHRcdFx0cmV0dXJuIHBhcnNlUmVjb3JkKHJlY29yZERlZmluaXRpb24sIHBhcnNlck91dHB1dCwgY3VycmVudFRhcmdldCwgb2JqZWN0TWFwLCB0b1Jlc29sdmUpO1xuXHRcdFx0fSk7XG5cdFx0Y2FzZSBcIlN0cmluZ1wiOlxuXHRcdFx0cmV0dXJuIGNvbGxlY3Rpb25EZWZpbml0aW9uLm1hcChzdHJpbmdWYWx1ZSA9PiB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmdWYWx1ZTtcblx0XHRcdH0pO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHRpZiAoY29sbGVjdGlvbkRlZmluaXRpb24ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiBbXTtcblx0XHRcdH1cblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIGNhc2VcIik7XG5cdH1cbn1cblxudHlwZSBSZXNvbHZlYWJsZSA9IHtcblx0JHRhcmdldDogc3RyaW5nO1xufTtcblxuZnVuY3Rpb24gY29udmVydEFubm90YXRpb24oXG5cdGFubm90YXRpb246IEFubm90YXRpb24sXG5cdHBhcnNlck91dHB1dDogUGFyc2VyT3V0cHV0LFxuXHRjdXJyZW50VGFyZ2V0OiBhbnksXG5cdG9iamVjdE1hcDogYW55LFxuXHR0b1Jlc29sdmU6IFJlc29sdmVhYmxlW11cbik6IGFueSB7XG5cdGlmIChhbm5vdGF0aW9uLnJlY29yZCkge1xuXHRcdGNvbnN0IGFubm90YXRpb25UZXJtOiBhbnkgPSB7XG5cdFx0XHQkVHlwZTogcGFyc2VyT3V0cHV0LnVuYWxpYXMoYW5ub3RhdGlvbi5yZWNvcmQudHlwZSksXG5cdFx0XHRmdWxseVF1YWxpZmllZE5hbWU6IGFubm90YXRpb24uZnVsbHlRdWFsaWZpZWROYW1lLFxuXHRcdFx0cXVhbGlmaWVyOiBhbm5vdGF0aW9uLnF1YWxpZmllclxuXHRcdH07XG5cdFx0Y29uc3QgYW5ub3RhdGlvbkNvbnRlbnQ6IGFueSA9IHt9O1xuXHRcdGFubm90YXRpb24ucmVjb3JkLnByb3BlcnR5VmFsdWVzLmZvckVhY2goKHByb3BlcnR5VmFsdWU6IFByb3BlcnR5VmFsdWUpID0+IHtcblx0XHRcdGFubm90YXRpb25Db250ZW50W3Byb3BlcnR5VmFsdWUubmFtZV0gPSBwYXJzZVZhbHVlKFxuXHRcdFx0XHRwcm9wZXJ0eVZhbHVlLnZhbHVlLFxuXHRcdFx0XHRwYXJzZXJPdXRwdXQsXG5cdFx0XHRcdGN1cnJlbnRUYXJnZXQsXG5cdFx0XHRcdG9iamVjdE1hcCxcblx0XHRcdFx0dG9SZXNvbHZlXG5cdFx0XHQpO1xuXHRcdH0pO1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKGFubm90YXRpb25UZXJtLCBhbm5vdGF0aW9uQ29udGVudCk7XG5cdH0gZWxzZSBpZiAoIWFubm90YXRpb24uaXNDb2xsZWN0aW9uKSB7XG5cdFx0aWYgKGFubm90YXRpb24udmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZVZhbHVlKGFubm90YXRpb24udmFsdWUsIHBhcnNlck91dHB1dCwgY3VycmVudFRhcmdldCwgb2JqZWN0TWFwLCB0b1Jlc29sdmUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoYW5ub3RhdGlvbi5jb2xsZWN0aW9uKSB7XG5cdFx0Y29uc3QgY29sbGVjdGlvbjogYW55ID0gcGFyc2VDb2xsZWN0aW9uKFxuXHRcdFx0YW5ub3RhdGlvbi5jb2xsZWN0aW9uLFxuXHRcdFx0cGFyc2VyT3V0cHV0LFxuXHRcdFx0Y3VycmVudFRhcmdldCxcblx0XHRcdG9iamVjdE1hcCxcblx0XHRcdHRvUmVzb2x2ZVxuXHRcdCk7XG5cdFx0Y29sbGVjdGlvbi5mdWxseVF1YWxpZmllZE5hbWUgPSBhbm5vdGF0aW9uLmZ1bGx5UXVhbGlmaWVkTmFtZTtcblx0XHRyZXR1cm4gY29sbGVjdGlvbjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBjYXNlXCIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJlc29sdmVQYXRoRm4oZW50aXR5VHlwZTogRW50aXR5VHlwZSwgb2JqZWN0TWFwOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XG5cdHJldHVybiBmdW5jdGlvbihyZWxhdGl2ZVBhdGg6IHN0cmluZyk6IGFueSB7XG5cdFx0cmV0dXJuIHJlc29sdmVUYXJnZXQob2JqZWN0TWFwLCBlbnRpdHlUeXBlLCByZWxhdGl2ZVBhdGgpO1xuXHR9O1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTmF2aWdhdGlvblByb3BlcnRpZXMocGFyc2VyT3V0cHV0OiBQYXJzZXJPdXRwdXQsIG9iamVjdE1hcDogUmVjb3JkPHN0cmluZywgYW55Pik6IHZvaWQge1xuXHRwYXJzZXJPdXRwdXQuc2NoZW1hLmVudGl0eVR5cGVzLmZvckVhY2goZW50aXR5VHlwZSA9PiB7XG5cdFx0ZW50aXR5VHlwZS5uYXZpZ2F0aW9uUHJvcGVydGllcy5mb3JFYWNoKG5hdlByb3AgPT4ge1xuXHRcdFx0aWYgKChuYXZQcm9wIGFzIFY0TmF2aWdhdGlvblByb3BlcnR5KS50YXJnZXRUeXBlTmFtZSkge1xuXHRcdFx0XHQobmF2UHJvcCBhcyBWNE5hdmlnYXRpb25Qcm9wZXJ0eSkudGFyZ2V0VHlwZSA9XG5cdFx0XHRcdFx0b2JqZWN0TWFwWyhuYXZQcm9wIGFzIFY0TmF2aWdhdGlvblByb3BlcnR5KS50YXJnZXRUeXBlTmFtZV07XG5cdFx0XHR9IGVsc2UgaWYgKChuYXZQcm9wIGFzIFYyTmF2aWdhdGlvblByb3BlcnR5KS5yZWxhdGlvbnNoaXApIHtcblx0XHRcdFx0Y29uc3QgdGFyZ2V0QXNzb2NpYXRpb24gPSBwYXJzZXJPdXRwdXQuc2NoZW1hLmFzc29jaWF0aW9ucy5maW5kKFxuXHRcdFx0XHRcdGFzc29jaWF0aW9uID0+IGFzc29jaWF0aW9uLmZ1bGx5UXVhbGlmaWVkTmFtZSA9PT0gKG5hdlByb3AgYXMgVjJOYXZpZ2F0aW9uUHJvcGVydHkpLnJlbGF0aW9uc2hpcFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0QXNzb2NpYXRpb24pIHtcblx0XHRcdFx0XHRjb25zdCBhc3NvY2lhdGlvbkVuZCA9IHRhcmdldEFzc29jaWF0aW9uLmFzc29jaWF0aW9uRW5kLmZpbmQoXG5cdFx0XHRcdFx0XHRlbmQgPT4gZW5kLnJvbGUgPT09IChuYXZQcm9wIGFzIFYyTmF2aWdhdGlvblByb3BlcnR5KS50b1JvbGVcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdGlmIChhc3NvY2lhdGlvbkVuZCkge1xuXHRcdFx0XHRcdFx0KG5hdlByb3AgYXMgVjJOYXZpZ2F0aW9uUHJvcGVydHkpLnRhcmdldFR5cGUgPSBvYmplY3RNYXBbYXNzb2NpYXRpb25FbmQudHlwZV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0ZW50aXR5VHlwZS5yZXNvbHZlUGF0aCA9IGNyZWF0ZVJlc29sdmVQYXRoRm4oZW50aXR5VHlwZSwgb2JqZWN0TWFwKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGxpbmtBY3Rpb25zVG9FbnRpdHlUeXBlKHBhcnNlck91dHB1dDogUGFyc2VyT3V0cHV0LCBvYmplY3RNYXA6IFJlY29yZDxzdHJpbmcsIGFueT4pOiB2b2lkIHtcblx0cGFyc2VyT3V0cHV0LnNjaGVtYS5hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IHtcblx0XHRpZiAoYWN0aW9uLmlzQm91bmQpIHtcblx0XHRcdGNvbnN0IHNvdXJjZUVudGl0eVR5cGUgPSBvYmplY3RNYXBbYWN0aW9uLnNvdXJjZVR5cGVdO1xuXHRcdFx0YWN0aW9uLnNvdXJjZUVudGl0eVR5cGUgPSBzb3VyY2VFbnRpdHlUeXBlO1xuXHRcdFx0aWYgKHNvdXJjZUVudGl0eVR5cGUpIHtcblx0XHRcdFx0aWYgKCFzb3VyY2VFbnRpdHlUeXBlLmFjdGlvbnMpIHtcblx0XHRcdFx0XHRzb3VyY2VFbnRpdHlUeXBlLmFjdGlvbnMgPSB7fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzb3VyY2VFbnRpdHlUeXBlLmFjdGlvbnNbYWN0aW9uLm5hbWVdID0gYWN0aW9uO1xuXHRcdFx0XHRzb3VyY2VFbnRpdHlUeXBlLmFjdGlvbnNbYCR7cGFyc2VyT3V0cHV0LnNjaGVtYS5uYW1lc3BhY2V9LiR7YWN0aW9uLm5hbWV9YF0gPSBhY3Rpb247XG5cdFx0XHR9XG5cdFx0XHRjb25zdCByZXR1cm5FbnRpdHlUeXBlID0gb2JqZWN0TWFwW2FjdGlvbi5yZXR1cm5UeXBlXTtcblx0XHRcdGFjdGlvbi5yZXR1cm5FbnRpdHlUeXBlID0gcmV0dXJuRW50aXR5VHlwZTtcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBsaW5rRW50aXR5VHlwZVRvRW50aXR5U2V0KHBhcnNlck91dHB1dDogUGFyc2VyT3V0cHV0LCBvYmplY3RNYXA6IFJlY29yZDxzdHJpbmcsIGFueT4pOiB2b2lkIHtcblx0cGFyc2VyT3V0cHV0LnNjaGVtYS5lbnRpdHlTZXRzLmZvckVhY2goZW50aXR5U2V0ID0+IHtcblx0XHRlbnRpdHlTZXQuZW50aXR5VHlwZUluc3RhbmNlID0gb2JqZWN0TWFwW2VudGl0eVNldC5lbnRpdHlUeXBlXTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUeXBlcyhwYXJzZXJPdXRwdXQ6IFBhcnNlck91dHB1dCk6IFBhcnNlck91dHB1dCB7XG5cdGNvbnN0IG9iamVjdE1hcCA9IGJ1aWxkT2JqZWN0TWFwKHBhcnNlck91dHB1dCk7XG5cdHJlc29sdmVOYXZpZ2F0aW9uUHJvcGVydGllcyhwYXJzZXJPdXRwdXQsIG9iamVjdE1hcCk7XG5cdGxpbmtBY3Rpb25zVG9FbnRpdHlUeXBlKHBhcnNlck91dHB1dCwgb2JqZWN0TWFwKTtcblx0bGlua0VudGl0eVR5cGVUb0VudGl0eVNldChwYXJzZXJPdXRwdXQsIG9iamVjdE1hcCk7XG5cdGNvbnN0IHRvUmVzb2x2ZTogUmVzb2x2ZWFibGVbXSA9IFtdO1xuXHRjb25zdCB1bnJlc29sdmVkQW5ub3RhdGlvbnM6IEFubm90YXRpb25MaXN0W10gPSBbXTtcblx0T2JqZWN0LmtleXMocGFyc2VyT3V0cHV0LnNjaGVtYS5hbm5vdGF0aW9ucykuZm9yRWFjaChhbm5vdGF0aW9uU291cmNlID0+IHtcblx0XHRwYXJzZXJPdXRwdXQuc2NoZW1hLmFubm90YXRpb25zW2Fubm90YXRpb25Tb3VyY2VdLmZvckVhY2goYW5ub3RhdGlvbkxpc3QgPT4ge1xuXHRcdFx0Y29uc3QgY3VycmVudFRhcmdldE5hbWUgPSBwYXJzZXJPdXRwdXQudW5hbGlhcyhhbm5vdGF0aW9uTGlzdC50YXJnZXQpIGFzIHN0cmluZztcblx0XHRcdGNvbnN0IGN1cnJlbnRUYXJnZXQgPSBvYmplY3RNYXBbY3VycmVudFRhcmdldE5hbWVdO1xuXHRcdFx0aWYgKCFjdXJyZW50VGFyZ2V0KSB7XG5cdFx0XHRcdGlmIChjdXJyZW50VGFyZ2V0TmFtZS5pbmRleE9mKFwiQFwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHR1bnJlc29sdmVkQW5ub3RhdGlvbnMucHVzaChhbm5vdGF0aW9uTGlzdCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICghY3VycmVudFRhcmdldC5hbm5vdGF0aW9ucykge1xuXHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnMgPSB7fTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhbm5vdGF0aW9uTGlzdC5hbm5vdGF0aW9ucy5mb3JFYWNoKGFubm90YXRpb24gPT4ge1xuXHRcdFx0XHRcdGNvbnN0IFt2b2NBbGlhcywgdm9jVGVybV0gPSBhbm5vdGF0aW9uLnRlcm0uc3BsaXQoXCIuXCIpO1xuXHRcdFx0XHRcdGlmICghY3VycmVudFRhcmdldC5hbm5vdGF0aW9uc1t2b2NBbGlhc10pIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdID0ge307XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghY3VycmVudFRhcmdldC5hbm5vdGF0aW9ucy5fYW5ub3RhdGlvbnMpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnMuX2Fubm90YXRpb25zID0ge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3Qgdm9jVGVybVdpdGhRdWFsaWZpZXIgPSBgJHt2b2NUZXJtfSR7YW5ub3RhdGlvbi5xdWFsaWZpZXIgPyBgIyR7YW5ub3RhdGlvbi5xdWFsaWZpZXJ9YCA6IFwiXCJ9YDtcblx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl0gPSBjb252ZXJ0QW5ub3RhdGlvbihcblx0XHRcdFx0XHRcdGFubm90YXRpb24sXG5cdFx0XHRcdFx0XHRwYXJzZXJPdXRwdXQsXG5cdFx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LFxuXHRcdFx0XHRcdFx0b2JqZWN0TWFwLFxuXHRcdFx0XHRcdFx0dG9SZXNvbHZlXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl0gIT09IG51bGwgJiZcblx0XHRcdFx0XHRcdHR5cGVvZiBjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl0gPT09IFwib2JqZWN0XCJcblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdW3ZvY1Rlcm1XaXRoUXVhbGlmaWVyXS50ZXJtID0gcGFyc2VyT3V0cHV0LnVuYWxpYXMoXG5cdFx0XHRcdFx0XHRcdGAke3ZvY0FsaWFzfS4ke3ZvY1Rlcm19YFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdW3ZvY1Rlcm1XaXRoUXVhbGlmaWVyXS5xdWFsaWZpZXIgPSBhbm5vdGF0aW9uLnF1YWxpZmllcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y3VycmVudFRhcmdldC5hbm5vdGF0aW9ucy5fYW5ub3RhdGlvbnNbYCR7dm9jQWxpYXN9LiR7dm9jVGVybVdpdGhRdWFsaWZpZXJ9YF0gPVxuXHRcdFx0XHRcdFx0Y3VycmVudFRhcmdldC5hbm5vdGF0aW9uc1t2b2NBbGlhc11bdm9jVGVybVdpdGhRdWFsaWZpZXJdO1xuXHRcdFx0XHRcdG9iamVjdE1hcFtgJHtjdXJyZW50VGFyZ2V0TmFtZX1AJHtwYXJzZXJPdXRwdXQudW5hbGlhcyh2b2NBbGlhcyArIFwiLlwiICsgdm9jVGVybVdpdGhRdWFsaWZpZXIpfWBdID1cblx0XHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdW3ZvY1Rlcm1XaXRoUXVhbGlmaWVyXTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXHR1bnJlc29sdmVkQW5ub3RhdGlvbnMuZm9yRWFjaChhbm5vdGF0aW9uTGlzdCA9PiB7XG5cdFx0Y29uc3QgY3VycmVudFRhcmdldE5hbWUgPSBwYXJzZXJPdXRwdXQudW5hbGlhcyhhbm5vdGF0aW9uTGlzdC50YXJnZXQpIGFzIHN0cmluZztcblx0XHRsZXQgW2Jhc2VPYmosIGFubm90YXRpb25QYXJ0XSA9IGN1cnJlbnRUYXJnZXROYW1lLnNwbGl0KFwiQFwiKTtcblx0XHRjb25zdCB0YXJnZXRTcGxpdCA9IGFubm90YXRpb25QYXJ0LnNwbGl0KFwiL1wiKTtcblx0XHRiYXNlT2JqID0gYmFzZU9iaiArIFwiQFwiICsgdGFyZ2V0U3BsaXRbMF07XG5cdFx0Y29uc3QgY3VycmVudFRhcmdldCA9IHRhcmdldFNwbGl0LnNsaWNlKDEpLnJlZHVjZSgoY3VycmVudE9iaiwgcGF0aCkgPT4ge1xuXHRcdFx0aWYgKCFjdXJyZW50T2JqKSB7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGN1cnJlbnRPYmpbcGF0aF07XG5cdFx0fSwgb2JqZWN0TWFwW2Jhc2VPYmpdKTtcblx0XHRpZiAoIWN1cnJlbnRUYXJnZXQpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiTWlzc2luZyB0YXJnZXQgYWdhaW4gXCIgKyBjdXJyZW50VGFyZ2V0TmFtZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICghY3VycmVudFRhcmdldC5hbm5vdGF0aW9ucykge1xuXHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zID0ge307XG5cdFx0XHR9XG5cdFx0XHRhbm5vdGF0aW9uTGlzdC5hbm5vdGF0aW9ucy5mb3JFYWNoKGFubm90YXRpb24gPT4ge1xuXHRcdFx0XHRjb25zdCBbdm9jQWxpYXMsIHZvY1Rlcm1dID0gYW5ub3RhdGlvbi50ZXJtLnNwbGl0KFwiLlwiKTtcblx0XHRcdFx0aWYgKCFjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXSkge1xuXHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdID0ge307XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zLl9hbm5vdGF0aW9ucykge1xuXHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnMuX2Fubm90YXRpb25zID0ge307XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCB2b2NUZXJtV2l0aFF1YWxpZmllciA9IGAke3ZvY1Rlcm19JHthbm5vdGF0aW9uLnF1YWxpZmllciA/IGAjJHthbm5vdGF0aW9uLnF1YWxpZmllcn1gIDogXCJcIn1gO1xuXHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl0gPSBjb252ZXJ0QW5ub3RhdGlvbihcblx0XHRcdFx0XHRhbm5vdGF0aW9uLFxuXHRcdFx0XHRcdHBhcnNlck91dHB1dCxcblx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LFxuXHRcdFx0XHRcdG9iamVjdE1hcCxcblx0XHRcdFx0XHR0b1Jlc29sdmVcblx0XHRcdFx0KTtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnNbdm9jQWxpYXNdW3ZvY1Rlcm1XaXRoUXVhbGlmaWVyXSAhPT0gbnVsbCAmJlxuXHRcdFx0XHRcdHR5cGVvZiBjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl0gPT09IFwib2JqZWN0XCJcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0Y3VycmVudFRhcmdldC5hbm5vdGF0aW9uc1t2b2NBbGlhc11bdm9jVGVybVdpdGhRdWFsaWZpZXJdLnRlcm0gPSBwYXJzZXJPdXRwdXQudW5hbGlhcyhcblx0XHRcdFx0XHRcdGAke3ZvY0FsaWFzfS4ke3ZvY1Rlcm19YFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0Y3VycmVudFRhcmdldC5hbm5vdGF0aW9uc1t2b2NBbGlhc11bdm9jVGVybVdpdGhRdWFsaWZpZXJdLnF1YWxpZmllciA9IGFubm90YXRpb24ucXVhbGlmaWVyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN1cnJlbnRUYXJnZXQuYW5ub3RhdGlvbnMuX2Fubm90YXRpb25zW2Ake3ZvY0FsaWFzfS4ke3ZvY1Rlcm1XaXRoUXVhbGlmaWVyfWBdID1cblx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl07XG5cdFx0XHRcdG9iamVjdE1hcFtgJHtjdXJyZW50VGFyZ2V0TmFtZX1AJHtwYXJzZXJPdXRwdXQudW5hbGlhcyh2b2NBbGlhcyArIFwiLlwiICsgdm9jVGVybVdpdGhRdWFsaWZpZXIpfWBdID1cblx0XHRcdFx0XHRjdXJyZW50VGFyZ2V0LmFubm90YXRpb25zW3ZvY0FsaWFzXVt2b2NUZXJtV2l0aFF1YWxpZmllcl07XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXHR0b1Jlc29sdmUuZm9yRWFjaChyZXNvbHZlYWJsZSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0U3RyID0gcmVzb2x2ZWFibGUuJHRhcmdldDtcblx0XHRyZXNvbHZlYWJsZS4kdGFyZ2V0ID0gb2JqZWN0TWFwW3RhcmdldFN0cl07XG5cdH0pO1xuXG5cdHJldHVybiBwYXJzZXJPdXRwdXQ7XG59XG5cbmNvbnN0IEFubm90YXRpb25Db252ZXJ0ZXIgPSB7XG5cdGNvbnZlcnRUeXBlc1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQW5ub3RhdGlvbkNvbnZlcnRlcjtcbiJdfQ==