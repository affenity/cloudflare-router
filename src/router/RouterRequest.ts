import qs from "querystring";
import { Methods } from "./Router";
import Route from "./Route";


export default class RouterRequest<AdditionalDataType extends unknown> {
    /**
     * The actual, "raw" request that was provided in .serveRequest()
     * @type {Request}
     */
    public incomingRequest: Request;
    /**
     * Any additional data that originated from the .serveRequest() method
     * @type {AdditionalDataType | null}
     */
    public additionalData: AdditionalDataType | null;
    /**
     * The URL that the request hit
     * @type {string}
     */
    public url: string;
    /**
     * Data about the URL
     * @type {URL}
     */
    public urlData: URL;
    /**
     * The absolute path that this request was aiming for
     * @type {string}
     */
    public path: string;
    /**
     * Any query parameters that was included in the request URL
     * @type {qs.ParsedUrlQuery}
     */
    public query: qs.ParsedUrlQuery;
    /**
     * The HTTP method of the request.
     * @type {Methods}
     */
    public method: Methods;
    /**
     * Whether the body was used or not
     * @type {boolean}
     */
    public bodyUsed: boolean;
    /**
     * The body (unprocessed) from the incoming request
     * @type {unknown}
     */
    public body?: unknown | null;
    /**
     * The headers originating from the request. All names were lowercased (not values, just the header names)
     * @type {Record<string, string>}
     */
    public headers: Record<string, string>;
    /**
     * If you set up a /hello/:name route, the value of :name will show up in the matchedParams object
     * @type {Record<string, string>}
     */
    public matchedParams?: Record<string, string>;
    
    /**
     * The route that matched to this request (if any)
     * @type {Route<AdditionalDataType> | null}
     */
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
        this.matchedRoute = null;
        
        // Parsing the headers and adding them to the object above
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
     * Sets the route that this request matched with
     * @param {Route<AdditionalDataType>} route
     */
    setMatchedRoute (route: Route<AdditionalDataType>): void {
        this.matchedRoute = route;
    }
    
    /**
     * Sets the params that this request matched with
     * @param {Record<string, string>} params
     */
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
