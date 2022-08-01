import Router, { Methods } from "./Router";
import { parse, ParsedUrlQuery } from "querystring";


export default class RouterRequest {
    public router: Router;
    public rawRequest: Request;
    public url: string;
    public urlData: URL;
    public path: string;
    public query: ParsedUrlQuery;
    public method: Methods;
    public bodyUsed: boolean;
    public body: any;
    public headers: Record<string, string>;
    public matchedParams: Record<string, string> | null;
    
    constructor (
        router: Router,
        rawRequest: Request
    ) {
        this.router = router;
        this.rawRequest = rawRequest;
        this.url = RouterRequest.fixRequestUrl(this.rawRequest.url);
        this.urlData = new URL(this.url);
        this.path = this.urlData.pathname;
        this.query = parse(this.urlData.search.slice(3));
        this.method = (this.rawRequest.method as Methods || "GET").toUpperCase() as Methods;
        this.bodyUsed = this.rawRequest.bodyUsed;
        this.body = this.rawRequest.body;
        this.headers = {};
        this.matchedParams = null;
        
        this.parseHeaders();
    }
    
    /**
     * Fixes the request URL to make sure it can be processed by the other parts of this library
     * @param {string} url
     * @returns {string}
     */
    static fixRequestUrl (url: string): string {
        const endIndex = url.indexOf("?") > -1 ? url.indexOf("?") : url.length;
        const endChar = url.charAt(endIndex - 1);
        
        return endChar !== "/" ? [ url.slice(0, endIndex), "/", url.slice(endIndex) ].join("") : url;
    }
    
    
    /**
     * Parses the headers from the incoming request and adds them to an object
     * All header names will be converted to lower case before adding to the object.
     */
    public parseHeaders (): Record<string, string> {
        const allHeaders = [ ...this.rawRequest.headers ];
        
        this.headers = {};
        allHeaders.forEach(header => {
            const [ name, value ] = header;
            
            this.headers[name.toLowerCase()] = value;
        });
        
        return this.headers;
    }
};
