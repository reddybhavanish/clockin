// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                id: {
                    required: true
                },
                metadata: {
                    required: true
                },
                groups: {
                    required: false,
                    defaul: function () {
                        return [];
                    }
                }
            }
        },

        toString: function () {
            return this.id;
        }

    });

});
