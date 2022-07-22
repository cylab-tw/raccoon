class Bundle  {
    constructor() {
        this.resourceType = "Bundle";
        this.type = "" ;
        this.total = 0 ;
        this.link = [];
        this.entry =[];
    }
    toJson()
    {
        return Object.getOwnPropertyNames(this).reduce((a, b) => {
            a[b] = this[b];
            return a;
        }, {}); 
    }
}
class BundleEntry {
    constructor(fullUrl , resource) {
        this.fullUrl = fullUrl;
        this.resource = resource;
    }
}
class BundleLink {
    constructor(relation = "self" , url= "/") {
        this.relation = relation ;
        this.url = url;
    }
}

module.exports = {
    Bundle: Bundle,
    entry: BundleLink,
    link: BundleEntry
};

