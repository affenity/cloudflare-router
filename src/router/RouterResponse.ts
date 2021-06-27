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

export type BuiltResponseObject<AdditionalDataType extends unknown> = {
    tasks: Promise<unknown>[];
    response: Response;
    routerResponse: RouterResponse<AdditionalDataType>;
    routerRequest: RouterRequest<AdditionalDataType>;
};

export default class RouterResponse<AdditionalDataType extends unknown> {
    public responseOptions: {
        type: "normal" | "redirect" | "custom";
        status: string;
        statusCode: number;
        headers: Record<string, string>;
        cookies: Record<string, string>;
        tasks: Promise<unknown>[];
        body: ResponseBodyType;
        
        redirect: {
            redirectToUrl?: string;
            redirectStatusCode?: number;
        };
        customResponse?: Response;
    };
    public routerRequest: RouterRequest<AdditionalDataType>;
    public matchedRoute: Route<AdditionalDataType> | null;
    
    constructor (routerRequest: RouterRequest<AdditionalDataType>) {
        this.responseOptions = {
            type: "normal",
            status: "OK",
            statusCode: 200,
            headers: {},
            cookies: {},
            tasks: [],
            body: undefined,
            redirect: {}
        };
        
        this.routerRequest = routerRequest;
        this.matchedRoute = null;
    }
    
    public setMatchedRoute (route: Route<AdditionalDataType>) {
        this.matchedRoute = route;
    }
    
    public json (data: unknown): this {
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
    
    public addTasks (tasks: Promise<unknown> | Promise<unknown>[]): this {
        tasks = Array.isArray(tasks) ? tasks : [ tasks ];
        this.responseOptions.tasks = [ ...this.responseOptions.tasks, ...tasks ];
        
        return this;
    }
    
    public setCookie (name: string, value: string, _options: any): this {
        this.responseOptions.cookies[name] = value;
        
        return this;
    }
    
    public redirectTo (redirectUrl: string, redirectStatusCode = 302): this {
        this.responseOptions.type = "redirect";
        this.responseOptions.redirect = {
            redirectStatusCode,
            redirectToUrl: redirectUrl
        };
        
        return this;
    }
    
    public setCustomResponse (response: Response): this {
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
    
    build (): BuiltResponseObject<AdditionalDataType> {
        let finalResponse: null | Response = null;
        
        if (this.responseOptions.type === "redirect") {
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
