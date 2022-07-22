function sendServerWrongMessage (res , value) {
    let message = {
        "Details" : value, 
        "HttpStatus" : 500,
        "Message" : "Server Wrong",
        "Method" : "GET"
    };
    res.status(500).json(message);
    res.end();
}

function sendBadRequestMessage (res , value) {
    let message = {
        "Details" : value, 
        "HttpStatus" : 400,
        "Message" : "Bad request",
        "Method" : "GET"
    };
    res.status(400).json(message);
    res.end();
}

function sendNotFoundMessage (req , res){
    let message = {
        "Details" : "Accessing an inexistent Item\r\n", 
        "HttpStatus" : 404,
        "Message" : "Not Found",
        "Method" : "GET"
    };
    let notFoundStr = [];
    for (let i in req.query) {
        notFoundStr.push(`${i}:${req.query[i]}`);
    }
    message.Details += notFoundStr.join(',\r\n');
    res.status(404).json(message);
    res.end(); 
}

module.exports =  {
    sendBadRequestMessage : sendBadRequestMessage , 
    sendNotFoundMessage : sendNotFoundMessage ,
    sendServerWrongMessage : sendServerWrongMessage
};

