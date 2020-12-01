const mongodb = require('models/mongodb');
const hash = require('object-hash');
const { resolveSchema } = require('@asymmetrik/node-fhir-server-core');
const { handleError } = require('../../../../models/FHIR/httpMessage');

const base_version  ="4_0_0";

let getEndpoint = base_version => {
    return require(resolveSchema(base_version, 'Endpoint'));
}

const errorMessage = {
    "message" : ""
};

module.exports = async function (req, res) {
    let resFunc = {
        "true" : (data) => {
            return res.status(200).send(data);
        } , 
        "false" : (error) => {
            if (errorMessage.message.code == 11000) {
                return res.status(409).json(handleError.duplicate(errorMessage.message));
            }
            return res.status(500).send(handleError.exception(errorMessage.message));
        }
    }
    let [status , doc]  = await insertEndpoint(req);
    return resFunc[status](doc);
}

async function insertEndpoint(req) {
    return new Promise(async (resolve, reject) => {
        let query = {
            id: req.body.id
        };
        await mongodb.endpoint.findOne(query, function (err, endpoint) {
            if (err) {
                errorMessage.message = err;
                return resolve([false , err]);
            }
            else if (endpoint) {
                return resolve([true , endpoint]);
            } else {
                let data = req.body;
                data.id = hash(data);
                let endpointClass  = getEndpoint(base_version);
                let insertEndpoint = new endpointClass(data);
                let newEndpoint = new mongodb.endpoint(insertEndpoint);
                newEndpoint.save(function (err, doc) {
                    errorMessage.message = err;
                    return resolve(err ? [false,err] : [true, doc.getFHIRField()]);
                });
            }
        });
    });
}