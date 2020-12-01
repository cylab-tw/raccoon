
class issue {
    constructor(severity="error" ,code , diagnostics) {
        this.severity = severity;
        this.code = code;
        this.diagnostics = diagnostics;
    }
}
class OperationOutcome	{
    constructor(issues) {
        this.resourceType = "OperationOutcome";
        this.issue = issues;
    }
}


function getDeleteMessage (resource , id) {
    let message = new issue("information" , "informational" ,`delete ${resource}/${id} successfully` );
    let operation = new OperationOutcome([message]);
    return operation;
}

const handleError = {
    "duplicate" : (err) => {
        let errorMessage = new issue("error" , "duplicate" , err.toString());
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "exception" : (err) => {
        let errorMessage = new issue("error" , "exception" , err.toString());
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "not-found" : (err) => {
        let errorMessage = new issue("error" , "not-found" , err.toString());
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "processing" : (err) => {
        let errorMessage = new issue("error" , "processing" , err.toString());
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    }
}


module.exports = {
    getDeleteMessage : getDeleteMessage , 
    handleError : handleError
}