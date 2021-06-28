import RouterRequest from "./RouterRequest";
import Route from "./Route";


export declare type ResponseBodyType =
    string
    | Blob
    | ArrayBufferView
    | ArrayBuffer
    | FormData
    | URLSearchParams
    | ReadableStream<Uint8Array>
    | null
    | undefined;

/**
 * The result of the response.build() call, which generates the final response from the cloudflare-router library
 */
export type BuiltResponseObject<AdditionalDataType extends unknown> = {
    tasks: Promise<unknown>[];
    response: Response;
    routerResponse: RouterResponse<AdditionalDataType>;
    routerRequest: RouterRequest<AdditionalDataType>;
};


export default class RouterResponse<AdditionalDataType extends unknown> {
    /**
     * Used internally as a temporary thing to hold on values before the .build() method is called
     * @type {{type: "normal" | "redirect" | "custom", status: string, statusCode: number, headers: Record<string, string>, cookies: Record<string, string>, tasks: Promise<unknown>[], body: ResponseBodyType, redirect: {redirectToUrl?: string, redirectStatusCode?: number}, customResponse?: Response}}
     */
    public responseOptions: {
        /**
         * Whether the response is "normal", a redirect or if the user wants to return a custom response
         */
        type: "normal" | "redirect" | "custom";
        /**
         * The status (text) of the response
         */
        status: string;
        /**
         * The status (code) of the response
         */
        statusCode: number;
        /**
         * The headers to be sent to the client
         */
        headers: Record<string, string>;
        /**
         * Any remaining tasks that should be handled even after the request was finished.
         */
        tasks: Promise<unknown>[];
        /**
         * The body of the response tha will be sent to the client
         */
        body: ResponseBodyType;
        
        /**
         * Information regarding the redirect if the type is set to "redirect"
         */
        redirect: {
            /**
             * The URL to redirect to
             */
            redirectToUrl?: string;
            /**
             * The status code of the redirect, default is 302 (temporary)
             */
            redirectStatusCode?: number;
        };
        /**
         * If the user wants to provide a custom response that should be returned instead of processing by
         * cloudflare-router
         */
        customResponse?: Response;
    };
    
    /**
     * The RouterRequest class instance of the request
     * @type {RouterRequest<AdditionalDataType>}
     */
    public routerRequest: RouterRequest<AdditionalDataType>;
    /**
     * The route that the request matched to
     * @type {Route<AdditionalDataType> | null}
     */
    public matchedRoute: Route<AdditionalDataType> | null;
    /**
     * Used as a temporary "cache" to share data between middlewares and the response handler (i.e. auth status)
     * @type {Record<any, any>}
     */
    public locals: Record<any, any>;
    
    /**
     * Creates a RouterResponse class instance.
     * @param {RouterRequest<AdditionalDataType>} routerRequest
     */
    constructor (routerRequest: RouterRequest<AdditionalDataType>) {
        this.responseOptions = {
            type: "normal",
            status: "OK",
            statusCode: 200,
            headers: {},
            tasks: [],
            body: undefined,
            redirect: {}
        };
        
        this.routerRequest = routerRequest;
        this.matchedRoute = null;
        this.locals = {};
    }
    
    /**
     * Sets the route that the RouterRequest matched to
     * @param {Route<AdditionalDataType>} route
     */
    public setMatchedRoute (route: Route<AdditionalDataType>) {
        this.matchedRoute = route;
    }
    
    /**
     * Stringifies the input data into JSON and sends to the client (also automatically sets content-type to json)
     * @param data
     * @returns {this}
     */
    public json (data: unknown): this {
        this.responseOptions.body = JSON.stringify(data);
        this.setContentType("application/json");
        
        return this;
    }
    
    /**
     * Sends "raw" input data to the client (without processing from cloudflare-router), specify content type in 2nd
     * parameter
     * @param {ResponseBodyType} body
     * @param {string} contentType
     * @returns {this}
     */
    public raw (body: ResponseBodyType, contentType: string): this {
        this.responseOptions.body = body;
        this.setContentType(contentType);
        
        return this;
    }
    
    /**
     * Sends the input text to the user (overrides the body property) and automatically sets content type to text.
     * @param {string} text
     * @returns {this}
     */
    public text (text: string): this {
        this.responseOptions.body = text;
        this.setContentType("text/plain");
        
        return this;
    }
    
    /**
     * Sets the status (text) for this response that's sent to the client.
     * @param {string} statusText
     * @returns {this}
     */
    public status (statusText: string): this {
        this.responseOptions.status = statusText;
        
        return this;
    }
    
    /**
     * Sets the status code) for this response that's sent to the client.
     * @param {number} statusCode
     * @returns {this}
     */
    public statusCode (statusCode: number): this {
        this.responseOptions.statusCode = statusCode;
        
        return this;
    }
    
    /**
     * Adds any tasks that should still be complete even after the request has finished.
     * @param {Promise<unknown> | Promise<unknown>[]} tasks
     * @returns {this}
     */
    public addTasks (tasks: Promise<unknown> | Promise<unknown>[]): this {
        tasks = Array.isArray(tasks) ? tasks : [ tasks ];
        this.responseOptions.tasks = [ ...this.responseOptions.tasks, ...tasks ];
        
        return this;
    }
    
    /**
     * Makes the response a redirect response, redirecting the user to the specified link, the default status code
     * is 302 (temporary)
     * @param {string} redirectUrl
     * @param {number} redirectStatusCode
     * @returns {this}
     */
    public redirectTo (redirectUrl: string, redirectStatusCode = 302): this {
        this.responseOptions.type = "redirect";
        this.responseOptions.redirect = {
            redirectStatusCode,
            redirectToUrl: redirectUrl
        };
        
        return this;
    }
    
    /**
     * Sets a custom response if the user wants to return their own processed response object
     * @param {Response} response
     * @returns {this}
     */
    public setCustomResponse (response: Response): this {
        this.responseOptions.customResponse = response;
        
        return this;
    }
    
    /**
     * Sets the content type of the response (does not process the body etc. regardless of content-type provided)
     * @param {string} contentType
     * @returns {this}
     */
    public setContentType (contentType: string): this {
        this.responseOptions.headers["content-type"] = contentType;
        
        return this;
    }
    
    /**
     * Turns the status code, staus text and headers into an object for further processing of the cloudflare-router
     * library
     * @returns {{headers: Headers, statusText: string, status: number}}
     */
    transformResponseOptions () {
        return {
            status: this.responseOptions.statusCode,
            statusText: this.responseOptions.status,
            headers: new Headers(this.responseOptions.headers)
        };
    }
    
    /**
     * Builds a final response data to be returned to the .serveRequest() method.
     * @returns {BuiltResponseObject<AdditionalDataType>}
     */
    build (): BuiltResponseObject<AdditionalDataType> {
        let finalResponse: null | Response = null;
        const mainRouter = this.routerRequest.matchedRoute!.router.getMainRouter();
        
        if (!mainRouter) {
            throw new Error(`Failed to retrieve main router!`);
        }
        
        
        if (mainRouter.customResponseBuilder) {
            finalResponse = mainRouter.customResponseBuilder(this);
        } else if (this.responseOptions.type === "redirect") {
            finalResponse = Response.redirect(
                this.responseOptions.redirect.redirectToUrl!,
                this.responseOptions.redirect.redirectStatusCode!
            );
        } else if (this.responseOptions.type === "normal") {
            finalResponse = new Response(
                this.responseOptions.body,
                this.transformResponseOptions()
            );
        } else {
            finalResponse = this.responseOptions.customResponse!;
        }
        
        return {
            response: finalResponse,
            routerRequest: this.routerRequest,
            routerResponse: this,
            tasks: this.responseOptions.tasks
        } as BuiltResponseObject<AdditionalDataType>;
    }
};
