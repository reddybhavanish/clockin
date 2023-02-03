// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                group: {
                    required: true
                },
                attribute: {
                    required: true
                },
                metadata: {
                    required: true
                }
            }
        }
    });
});
