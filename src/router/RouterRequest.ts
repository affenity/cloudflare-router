import qs from "querystring";
import { Methods } from "./Router";
import Route from "./Route";


export default class RouterRequest<AdditionalDataType extends unknown> {
    public incomingRequest: Request;
    public additionalData: AdditionalDataType | null;
    public url: string;
    public urlData: URL;
    public path: string;
    public query: qs.ParsedUrlQuery;
    public method: Methods;
    public bodyUsed: boolean;
    public body?: unknown | null;
    public headers: Record<string, string>;
    public cookies: Record<string, string>;
    public matchedParams?: Record<string, string>;
    
    public matchedRoute: Route<AdditionalDataType> | null;
    
    
    constructor (incomingRequest: Request, additionalData?: AdditionalDataType) {
        this.incomingRequest = incomingRequest;
        this.additionalData = additionalData || null;
        this.url = RouterRequest.fixRequestUrl(this.incomingRequest.url);
        this.urlData = new URL(this.url);
        this.path = this.urlData.pathname;
        this.query = qs.parse(this.urlData.search.slice(3));
        this.method = (this.incomingRequest.method || "GET").toUpperCase() as Methods;
        this.bodyUsed = this.incomingRequest.bodyUsed;
        this.body = this.incomingRequest.body || null;
        this.headers = {};
        this.cookies = {};
        
        this.matchedRoute = null;
    }
    
    static fixRequestUrl (url: string): string {
        const endIndex = url.indexOf("?") > -1 ? url.indexOf("?") : url.length;
        const endChar = url.charAt(endIndex - 1);
        
        return endChar !== "/" ? [ url.slice(0, endIndex), "/", url.slice(endIndex) ].join("") : url;
    }
    
    setMatchedRoute (route: Route<AdditionalDataType>): void {
        this.matchedRoute = route;
    }
    
    setMatchedParams (params: Record<string, string>): void {
        this.matchedParams = params;
    }
    
    
    /**
     * Parses the headers from the incoming request and adds them to an object
     * All header names will be converted to lower case before adding to the object.
     */
    public parseHeaders (): Record<string, string> {
        const allHeaders = [ ...this.incomingRequest.headers ];
        
        this.headers = {};
        allHeaders.forEach(header => {
            const [ name, value ] = header;
            
            this.headers[name.toLowerCase()] = value;
        });
        
        return this.headers;
    }
};
