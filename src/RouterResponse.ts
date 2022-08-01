import RouterRequest from "./RouterRequest";
import Router from "./Router";


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

export type BuiltResponse = {
    tasks: Promise<any>[];
    response: Response;
    routerResponse: RouterResponse;
    routerRequest: RouterRequest;
};

export default class RouterResponse {
    public router: Router;
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
    public routerRequest: RouterRequest;
    public locals: Record<any, any>;
    
    constructor (
        router: Router,
        routerRequest: RouterRequest
    ) {
        this.router = router;
        this.routerRequest = routerRequest;
        this.responseOptions = {
            type: "normal",
            status: "OK",
            statusCode: 200,
            headers: {},
            tasks: [],
            body: undefined,
            redirect: {}
        };
        this.locals = {};
        
        this.routerRequest = routerRequest;
    }
    
    public setHeader (name: string, value: string) {
        this.responseOptions[name] = value;
        
        return this;
    }
    
    public json (data: any): this {
        this.responseOptions.body = JSON.stringify(data);
        this.setContentType("application/json");
        
        return this;
    }
    
    public raw (body: ResponseBodyType, contentType: string): this {
        this.responseOptions.body = body;
        this.setContentType(contentType);
        
        return this;
    }
    
    public text (text: string): this {
        this.responseOptions.body = text;
        this.setContentType("text/plain");
        
        return this;
    }
    
    public status (statusText: string): this {
        this.responseOptions.status = statusText;
        
        return this;
    }
    
    public statusCode (statusCode: number): this {
        this.responseOptions.statusCode = statusCode;
        
        return this;
    }
    
    public addTask (task: Promise<any> | Promise<any>[]): this {
        const tasks = Array.isArray(task) ? task : [ task ];
        this.responseOptions.tasks = [ ...this.responseOptions.tasks, ...tasks ];
        
        return this;
    }
    
    public redirect (
        redirectUrl: string,
        statusCode = 302
    ): this {
        this.responseOptions.type = "redirect";
        this.responseOptions.redirect = {
            redirectToUrl: redirectUrl,
            redirectStatusCode: statusCode
        };
        
        return this;
    }
    
    public setCustomResponse (response: Response): this {
        this.responseOptions.type = "custom";
        this.responseOptions.customResponse = response;
        
        return this;
    }
    
    public setContentType (contentType: string): this {
        this.responseOptions.headers["content-type"] = contentType;
        
        return this;
    }
    
    transformResponseOptions () {
        return {
            status: this.responseOptions.statusCode,
            statusText: this.responseOptions.status,
            headers: new Headers(this.responseOptions.headers)
        };
    }
    
    build (): BuiltResponse {
        let finalResponse: null | Response = null;
        
        if (this.router.routerOptions.customResponseBuilder) {
            finalResponse = this.router.routerOptions.customResponseBuilder(this);
        } else if (this.responseOptions.type === "redirect") {
            if (!this.responseOptions.redirect || !this.responseOptions.redirect.redirectToUrl) {
                throw new Error(`No redirect URL provided for redirect!`);
            }
            
            finalResponse = Response.redirect(
                this.responseOptions.redirect.redirectToUrl,
                this.responseOptions.redirect.redirectStatusCode
            );
        } else if (this.responseOptions.type === "normal") {
            finalResponse = new Response(
                this.responseOptions.body,
                this.transformResponseOptions()
            );
        } else {
            if (!this.responseOptions.customResponse) {
                throw new Error(`Attempted to use custom response but no custom response was set!`);
            }
            
            finalResponse = this.responseOptions.customResponse;
        }
        
        if (!finalResponse) {
            throw new Error(`Error when attempting to return final response, no valid final response value!`);
        }
        
        return {
            tasks: this.responseOptions.tasks,
            response: finalResponse,
            routerResponse: this,
            routerRequest: this.routerRequest
        };
    }
};
