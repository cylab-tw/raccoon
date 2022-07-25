
class OperationOutcomeIssue {
    constructor(severity = "error", code, diagnostics) {
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
    let message = new OperationOutcomeIssue(
        "information",
        "informational",
        `delete ${resource}/${id} successfully`
    );
    let operation = new OperationOutcome([message]);
    return operation;
}

const handleError = {
    "duplicate" : (err) => {
        let errorMessage = new OperationOutcomeIssue(
            "error",
            "duplicate",
            err.toString()
        );
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "exception" : (err) => {
        let errorMessage = new OperationOutcomeIssue(
            "error",
            "exception",
            err.toString()
        );
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "not-found" : (err) => {
        let errorMessage = new OperationOutcomeIssue("error" , "not-found" , err.toString());
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    } ,
    "processing" : (err) => {
        let errorMessage = new OperationOutcomeIssue(
            "error",
            "processing",
            err.toString()
        );
        let operation = new OperationOutcome([errorMessage]);
        return operation;
    }
};


module.exports = {
    getDeleteMessage : getDeleteMessage , 
    handleError : handleError
};