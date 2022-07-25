const humanNameSchema = require('../FHIRmodel/HumanName');
const identifierSchema = require('../FHIRmodel/Identifier');
const contactPointSchema = require('../FHIRmodel/ContactPoint');
const addressSchema = require('../FHIRmodel/Address');
const fs = require('fs');
const _ = require("lodash"); // eslint-disable-line @typescript-eslint/naming-convention
module.exports = function (mongodb) {
    require('mongoose-schema-jsonschema')(mongodb);
    const organizationSchema = mongodb.Schema({
        resourceType: {
            type: String,
            default: "Organization"
        },
        id: {
            type: String,
            index: true,
            unique: true
        },
        identifier: {
            type: [identifierSchema],
            default: void 0
        },
        active: {
            type: Boolean,
            default: void 0
        },
        name: {
            type: String,
            default: void 0
        },
        alias: {
            type: [String],
            default: void 0
        },
        telecom: {
            type: [contactPointSchema],
            default: void 0
        },
        address: {
            type: [addressSchema],
            default: void 0
        }
    });
    organizationSchema.methods.getFHIRField = function () {
        let result = this.toObject();
        delete result._id;
        let version = result.__v;
        if (version >= 0) {
            _.set(result, 'meta.versionId', version.toString());
        }
        delete result.__v;
        return result;
    };
    organizationSchema.post('findOneAndUpdate', async function (result) {
        if (result.value) {
            result.value.__v++;
            await result.value.save();
        } else {
            result.__v++;
            await result.save();
        }
        return result;
    });
    //fs.writeFileSync("./data/organization.json", JSON.stringify(organizationSchema.jsonSchema(), null, 4), { flag: "w+" });
    const organization = mongodb.model('organization', organizationSchema, 'organization');
    return organization;
};

