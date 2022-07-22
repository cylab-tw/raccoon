class Bundle  {
    constructor() {
        this.resourceType = "Bundle";
        this.type = "" ;
        this.total = 0 ;
        this.link = [];
        this.entry =[];
    }
    ToJson()
    {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {}); 
    }
}
class entry {
    constructor(fullUrl , resource) {
        this.fullUrl = fullUrl;
        this.resource = resource;
    }
}
class link {
    constructor(relation = "self" , url= "/") {
        this.relation = relation ;
        this.url = url;
    }
}

module.exports = {
    Bundle : Bundle ,
    entry : entry , 
    link : link
};

