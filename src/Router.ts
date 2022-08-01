import UrlPattern from "url-pattern";
import debug, { Debugger } from "debug";
import RouterResponse from "./RouterResponse";
import RouterRequest from "./RouterRequest";


export type Methods = "ANY" | "GET" | "POST" | "PUT" | "PATCH" | "OPTIONS" | "HEAD" | "DELETE";
export type RouteHandler<ExtraData = any> = (request: RouterRequest<ExtraData>, response: RouterResponse, next?: (proceed: boolean) => void) => any;

const NO_APPEND_SLASH_IF_CHARACTERS = [
    "*",
    ")",
    "?"
];


class RouterPath {
    public rawInput: string;
    public fixed: string;
    public pattern: UrlPattern;
    
    constructor (
        rawInput: string,
        fixed: string
    ) {
        this.rawInput = rawInput;
        this.fixed = fixed;
        this.pattern = new UrlPattern(this.fixed);
    }
}


class Route<ExtraData = any> {
    public router: Router;
    public method: Methods;
    public path: RouterPath;
    public handler: RouteHandler<ExtraData> | Router;
    public isMiddleware: boolean;
    
    constructor (
        router: Router,
        options: {
            inputPath: string,
            method: Methods,
            handler: RouteHandler | Router,
            isMiddleware: boolean
        }
    ) {
        this.router = router;
        this.handler = options.handler;
        this.method = options.method;
        this.isMiddleware = options.isMiddleware;
        this.path = new RouterPath(
            options.inputPath,
            this.isMiddleware ? this.router.fixUsePath(options.inputPath) : this.router.fixHandlerPath(options.inputPath)
        );
    }
    
    matchesPath (path: string) {
        return this.path.pattern.match(path);
    }
}


type RouterOptions = {
    customResponseBuilder?: (routerResponse: RouterResponse) => Response;
}

export default class Router<ExtraDataType = any> {
    public routes: Route<ExtraDataType>[];
    public basePath: string | null;
    public debugger: Debugger;
    public routerOptions: RouterOptions;
    
    constructor () {
        this.routes = [];
        this.basePath = null;
        this.debugger = debug("cloudflare-router");
        this.routerOptions = {};
    }
    
    setCustomResponseBuilder (responseBuilder: RouterOptions["customResponseBuilder"]): this {
        this.routerOptions.customResponseBuilder = responseBuilder;
        
        return this;
    }
    
    use (
        arg0: string | Router<ExtraDataType> | RouteHandler<ExtraDataType>,
        arg1?: Router<ExtraDataType> | RouteHandler<ExtraDataType>
    ) {
        if (typeof arg0 === "string") {
            // It's a base-path
            if (!arg1) {
                this.debugger(`Failed to use router.use, 1st arg is string means 2nd argument needs to be provided!`);
                throw new Error(`Expected 2nd argument for router.use when 1st arg is string`);
            }
            
            this.debugger(`Setting up router.use with sub: ${ arg0 } with handler as Router?: ${ arg1 instanceof Router }`);
            const handler = arg1;
            const fixedUsePath = this.fixUsePath(arg0);
            
            if (handler instanceof Router) {
                handler.basePath = `${ this.basePath || "" }${ fixedUsePath }`;
            }
            
            this.routes.push(new Route<ExtraDataType>(
                this,
                {
                    handler,
                    inputPath: arg0,
                    method: "ANY",
                    isMiddleware: true
                }
            ));
        } else {
            this.routes.push(new Route<ExtraDataType>(
                this,
                {
                    handler: arg0,
                    inputPath: "*",
                    method: "ANY",
                    isMiddleware: true
                }
            ));
        }
        
        this.refreshRoutes();
    }
    
    addPathHandler (options: {
        method: Methods,
        path: string,
        handler: RouteHandler<ExtraDataType>,
        isMiddleware?: boolean
    }) {
        this.routes.push(new Route<ExtraDataType>(
            this,
            {
                handler: options.handler,
                method: options.method,
                inputPath: options.path,
                isMiddleware: options.isMiddleware || false
            }
        ));
    }
    
    get (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "GET",
            isMiddleware: false
        });
    }
    
    post (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "POST"
        });
    }
    
    options (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "OPTIONS"
        });
    }
    
    head (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "HEAD"
        });
    }
    
    delete (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "DELETE"
        });
    }
    
    any (path: string, handler: RouteHandler<ExtraDataType>) {
        this.addPathHandler({
            path,
            handler,
            method: "ANY"
        });
    }
    
    getMatchingRoutesByPath (totalPath: string, fillArray: { route: Route, match: any }[] = []) {
        for (let route of this.routes) {
            const handler = route.handler;
            
            if (handler instanceof Router) {
                handler.getMatchingRoutesByPath(totalPath, fillArray);
            } else {
                const checkMatch = route.matchesPath(totalPath);
                this.debugger(`Match route ${ route.path.fixed } with ${ totalPath }: ${ checkMatch }`);
                
                if (checkMatch) {
                    fillArray.push({
                        route,
                        match: checkMatch
                    });
                } else {
                    if (route.path.fixed === "*") {
                        fillArray.push({
                            route,
                            match: {}
                        });
                    }
                }
            }
        }
        
        return fillArray;
    }
    
    getMatchingRoutesByPathAndMethod (path: string, method: Methods) {
        this.debugger(`Matching routes with path: ${ path } and method: ${ method }`);
        const matchedByPath = this.getMatchingRoutesByPath(path);
        
        this.debugger(`Found ${ matchedByPath.length } for path: ${ path }`);
        const filteredByMethod = matchedByPath
            .filter(matched => [ method, "ANY" ].some(compareMethod => matched.route.method === compareMethod));
        
        this.debugger(`Filtered matching routes by path to ${ filteredByMethod.length } by method!`);
        return filteredByMethod;
    }
    
    fixHandlerPath (inputPath: string) {
        const fixed = `${ this.basePath || "" }${ inputPath.endsWith("/") ? inputPath : !NO_APPEND_SLASH_IF_CHARACTERS.some(char => inputPath.endsWith(char)) ? inputPath + "/" : inputPath }`;
        this.debugger(`Fixed handler path from: ${ inputPath } to: ${ fixed }`);
        return fixed;
    }
    
    fixUsePath (arg0: string) {
        const fixed = `${ this.basePath || "" }/${ arg0.slice(arg0.startsWith("/") ? 1 : 0, arg0.endsWith("/") ? arg0.length - 1 : arg0.length) }`;
        this.debugger(`Fixed use path from: ${ arg0 } to: ${ fixed }`);
        
        return fixed;
    }
    
    refreshRoutes () {
        this.debugger(`Refreshing routes for Router with base-path: ${ this.basePath }`);
        const newRoutes: Route[] = [];
        
        for (let oldRoute of this.routes) {
            if (oldRoute.isMiddleware) {
                if (oldRoute.handler instanceof Router) {
                    oldRoute.handler.refreshRoutes();
                }
                
                newRoutes.push(new Route<ExtraDataType>(
                    this,
                    {
                        handler: oldRoute.handler,
                        method: oldRoute.method,
                        inputPath: oldRoute.path.rawInput,
                        isMiddleware: oldRoute.isMiddleware
                    }
                ));
            } else {
                newRoutes.push(new Route<ExtraDataType>(
                    this,
                    {
                        handler: oldRoute.handler,
                        method: oldRoute.method,
                        inputPath: oldRoute.path.rawInput,
                        isMiddleware: oldRoute.isMiddleware
                    }
                ));
            }
        }
        
        this.debugger(`Successfully updated to ${ newRoutes.length } new routes.`);
        this.routes = newRoutes;
    }
    
    public async processRequest (
        routerRequest: RouterRequest,
        routerResponse: RouterResponse
    ) {
        const foundMatchingRoutes = this.getMatchingRoutesByPath(routerRequest.path);
        
        const middlewareMatches = foundMatchingRoutes
            .filter(matched => matched.route.isMiddleware)
            .filter(matchedMiddleware => !(matchedMiddleware.route.handler instanceof Router));
        
        const responseMatch = foundMatchingRoutes
            .filter(matched => !matched.route.isMiddleware)
            .find(s => !!s);
        
        if (!responseMatch) {
            // throw new Error(`Could not find a response handler for the request with route: ${ routerRequest.method } ${ routerRequest.path }`);
            routerResponse.statusCode(404)
                .status("Not found")
                .text(`Error 404 - not found!`);
            
            // Returning a 404 error instead of throwing an error
            return this.finishResponse(routerRequest, routerResponse);
        }
        
        if (responseMatch.route.handler instanceof Router) {
            throw new Error(`Response handler for route ${ routerRequest.method } ${ routerRequest.path }`);
        }
        
        let allMiddlewaresSuccessful = true;
        
        for (let middlewareMatch of middlewareMatches) {
            const middlewareSuccess = await this.executeMiddleware(
                middlewareMatch.route,
                routerRequest,
                routerResponse
            )
                .catch((e: Error) => e);
            
            if (!middlewareSuccess) {
                allMiddlewaresSuccessful = false;
                break;
            }
            
            if (middlewareSuccess instanceof Error) {
                this.debugger(`Middleware for route ${ middlewareMatch.route.path.fixed } failed with error! ${ middlewareSuccess.name }, ${ middlewareSuccess.message }`);
                allMiddlewaresSuccessful = false;
                break;
            }
        }
        
        if (!allMiddlewaresSuccessful) {
            return this.finishResponse(
                routerRequest,
                routerResponse
            );
        }
        
        routerRequest.matchedParams = responseMatch.match;
        
        await responseMatch.route.handler(
            routerRequest,
            routerResponse
        );
        
        return this.finishResponse(
            routerRequest,
            routerResponse
        );
    }
    
    public finishResponse (
        routerRequest: RouterRequest,
        routerResponse: RouterResponse
    ) {
        const builtResponse = routerResponse.build();
        
        if (this.routerOptions.customResponseBuilder) {
            builtResponse.response = this.routerOptions.customResponseBuilder(routerResponse);
        }
        
        return builtResponse;
    }
    
    public async executeMiddleware (
        middleware: Route,
        routerRequest: RouterRequest,
        routerResponse: RouterResponse
    ): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            const handler = middleware.handler as RouteHandler<ExtraDataType>;
            const hasNextCallback = handler.length === 3;
            
            if (hasNextCallback) {
                handler(
                    routerRequest,
                    routerResponse,
                    (proceed = true) => resolve(proceed)
                );
            } else {
                await (async () => handler(
                    routerRequest,
                    routerResponse
                ));
                
                resolve(true);
            }
        });
    }
    
    public async serveRequest (request: Request, extraData?: ExtraDataType) {
        const routerRequest = new RouterRequest<ExtraDataType>(
            this,
            request,
            {
                extraData: extraData || null
            }
        );
        const routerResponse = new RouterResponse(
            this,
            routerRequest
        );
        
        return this.processRequest(
            routerRequest,
            routerResponse
        );
    }
};
