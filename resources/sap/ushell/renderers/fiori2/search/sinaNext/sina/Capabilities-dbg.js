// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                fuzzy: {
                    required: false,
                    default: false
                }
            }
        }

    });

});
