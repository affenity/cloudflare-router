import Route, { RouteFunctionalHandler, RouteHandler, RouteOptions } from "./Route";
import RouterRequest from "./RouterRequest";
import RouterResponse, { BuiltResponseObject } from "./RouterResponse";


export type Methods = "ANY" | "GET" | "POST" | "PUT" | "PATCH" | "OPTIONS" | "HEAD" | "DELETE";
const NO_APPEND_SLASH_IF_CHARACTERS = [
    "*",
    ")",
    "?"
];


export interface RouterOptions<AdditionalDataType extends unknown> {
    basePath?: string;
    waterfallHandling?: boolean;
    parent?: Router<AdditionalDataType>;
    customResponseBuilder?: (routerResponse: RouterResponse<AdditionalDataType>) => Response;
}


export type MatchingRoute<AdditionalDataType> = {
    route: Route<AdditionalDataType>;
    match: Exclude<any, "undefined">;
}


export default class Router<AdditionalDataType extends unknown> {
    public basePath: string;
    public isWaterfallHandling: boolean;
    public routes: Route<AdditionalDataType>[];
    
    /**
     * If this is a sub-router of another Router, this property will be defined with the Router that's connected to this
     * @type {Router<AdditionalDataType> | null}
     */
    public parentRouter: Router<AdditionalDataType> | null;
    
    /**
     * The main router that connects all other routers
     * @type {Router<AdditionalDataType> | null}
     */
    public mainRouter: Router<AdditionalDataType> | null;
    /**
     * All router instances will be assigned to false by default, because only the router that's called
     * using .serve() will be considered the main router.
     * @type {boolean}
     */
    public isMainRouter: boolean;
    
    public customResponseBuilder: RouterOptions<AdditionalDataType>["customResponseBuilder"];
    
    
    constructor (options?: RouterOptions<AdditionalDataType>) {
        this.basePath = options?.basePath ?? "/";
        this.isWaterfallHandling = options?.waterfallHandling ?? false;
        this.routes = [];
        this.parentRouter = options?.parent ?? null;
        this.mainRouter = null;
        this.isMainRouter = false;
    }
    
    public init (newBasePath: string, parentRouter?: Router<AdditionalDataType>) {
        this.basePath = "/";
        this.basePath = this.fixPath(newBasePath || "/");
        this.parentRouter = parentRouter || null;
    }
    
    /**
     * Returns a "fixed" path of the input path, setting up basePath and similar
     * @param {string} inputPath
     * @returns {string}
     */
    fixPath (inputPath: string): string {
        let fixedPath = `${ this.basePath }${ inputPath.startsWith("/") ? inputPath.slice(1) : inputPath }`;
        
        if (!fixedPath.endsWith("/") && !NO_APPEND_SLASH_IF_CHARACTERS.some(char => fixedPath.endsWith(char))) {
            fixedPath += "/";
        }
        
        console.log(`To fix path! Input: ${ inputPath }. Output: ${ fixedPath }`);
        
        return fixedPath;
    }
    
    public updateSelfRoutes () {
        const newRoutes: Route<AdditionalDataType>[] = [];
        
        for (const oldRoute of this.routes) {
            const newRoute = this.createRoute({
                path: oldRoute.path.inputPath,
                method: oldRoute.method,
                handler: oldRoute.handler,
                isMiddleware: oldRoute.isMiddleware,
                routeIndex: oldRoute.routeIndex
            });
            
            newRoutes.push(newRoute);
        }
        
        this.routes = newRoutes;
    }
    
    public createRoute (options: RouteOptions<AdditionalDataType>): Route<AdditionalDataType> {
        return new Route(
            this,
            options
        );
    }
    
    public createRouteAndAdd (options: RouteOptions<AdditionalDataType>): Route<AdditionalDataType> {
        const createdRoute = this.createRoute(options);
        this.routes.push(createdRoute);
        
        return createdRoute;
    }
    
    /**
     * Sets up a middleware for a certain path. Use router.any() to process requests with any method
     * @param {string | RouteHandler<AdditionalDataType>} arg0
     * @param {RouteHandler<AdditionalDataType>} arg1
     */
    public use (arg0: string | RouteHandler<AdditionalDataType>, arg1?: RouteHandler<AdditionalDataType>): void {
        let usePath = "/";
        let useHandler = arg1 || arg0;
        
        if (typeof arg0 === "string") {
            usePath = arg0;
        }
        
        if (useHandler instanceof Router) {
            // Init the corresponding router
            useHandler.init(usePath, this);
        }
        
        this.createRouteAndAdd({
            handler: useHandler as RouteHandler<AdditionalDataType>,
            path: usePath,
            method: "ANY",
            isMiddleware: true
        });
    }
    
    public useBulk (list: { path?: string; handler: RouteHandler<AdditionalDataType>; }[]): void {
        for (let i = 0; i < list.length; i++) {
            const listEntry = list[i];
            this.use(listEntry.path || listEntry.handler, listEntry.handler);
        }
    }
    
    assignSelfAsMainRouter (): void {
        if (this.mainRouter !== null) {
            throw new Error(`Cannot assign self router as the main router when there is already another router instance considered a main one!`);
        }
        
        this.isMainRouter = true;
        
        // Update all descendants
    }
    
    public findMatchingRoutes (request: RouterRequest<AdditionalDataType>): MatchingRoute<AdditionalDataType>[] {
        let foundMatching: MatchingRoute<AdditionalDataType>[] = [];
        
        for (const route of this.routes) {
            if (route.isHandlerRouter) {
                foundMatching = [
                    ...foundMatching,
                    ...(route.handler as Router<AdditionalDataType>).findMatchingRoutes(request)
                ];
            } else {
                const matchRoute = route.matchesRequest(request);
                
                if (matchRoute.pathMatches) {
                    foundMatching.push({
                        route,
                        match: matchRoute.pathMatchData
                    });
                }
            }
        }
        
        return foundMatching;
    }
    
    public get (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "GET",
            isMiddleware: false
        });
    }
    
    public post (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "POST",
            isMiddleware: false
        });
    }
    
    public options (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "OPTIONS",
            isMiddleware: false
        });
    }
    
    public head (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "HEAD",
            isMiddleware: false
        });
    }
    
    public delete (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "DELETE",
            isMiddleware: false
        });
    }
    
    public any (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "ANY",
            isMiddleware: false
        });
    }
    
    public async processRequest (
        routerRequest: RouterRequest<AdditionalDataType>,
        routerResponse: RouterResponse<AdditionalDataType>
    ) {
        // First we find all routes that match the path and method
        const foundMatchingRoutes = this.findMatchingRoutes(routerRequest);
        
        // Then, we find all middlewares from the matching routes, and ensure that they are declared as middlewares
        // in addition to the handler not being a router.
        const foundMiddlewares = foundMatchingRoutes
            .filter(matchingRoute => matchingRoute.route.isMiddleware)
            .filter(matchingRoute => !matchingRoute.route.isHandlerRouter);
        
        // Finally, we find the route which isn't a middleware, as it'd be the final response handler, that would
        // be run once all middlewares are run.
        const responseHandler = foundMatchingRoutes
            .filter(matchingRoute => !matchingRoute.route.isMiddleware)
            .find(s => !!s);
        
        
        // We can't return a response if there was no response handler for the request, so we're creating an error
        if (!responseHandler) {
            throw new Error(`Could not find a response handler for the request!`);
        }
        
        
        // Updating our response/request objects so they're up-to-speed about the incoming request
        routerRequest.setMatchedParams(responseHandler.match);
        routerRequest.setMatchedRoute(responseHandler.route);
        routerResponse.setMatchedRoute(responseHandler.route);
        
        
        // Next up, we're going to sort the middlewares based on their routeIndex, so they're run in the order
        // they are supposed to.
        const orderedMiddlewareList = foundMiddlewares
            .sort((a, b) => b.route.routeIndex - a.route.routeIndex);
        
        let allMiddlewaresSuccessful = true;
        
        for (let i = 0; i < orderedMiddlewareList.length; i++) {
            const middleware = orderedMiddlewareList[i].route;
            const middlewareSuccess = await this.executeMiddleware(
                middleware,
                routerRequest,
                routerResponse
            );
            
            if (!middlewareSuccess) {
                allMiddlewaresSuccessful = false;
                break;
            }
        }
        
        if (!allMiddlewaresSuccessful) {
            return this.finishResponse(routerRequest, routerResponse);
        }
        
        // Finally, as all middlewares are run, we're going to call the response handler
        await (responseHandler.route.handler as RouteFunctionalHandler<AdditionalDataType>)(
            routerRequest,
            routerResponse,
            routerRequest.additionalData!
        );
        
        return this.finishResponse(routerRequest, routerResponse);
    }
    
    public async finishResponse (
        _request: RouterRequest<AdditionalDataType>,
        response: RouterResponse<AdditionalDataType>
    ) {
        const mainRouter = this.getMainRouter();
        const builtResponseOptions = response.build();
        
        if (mainRouter.customResponseBuilder) {
            builtResponseOptions.response = mainRouter.customResponseBuilder(response);
        }
        
        return builtResponseOptions;
    }
    
    public async executeMiddleware (
        middleware: Route<AdditionalDataType>,
        request: RouterRequest<AdditionalDataType>,
        response: RouterResponse<AdditionalDataType>
    ): Promise<boolean> {
        return new Promise(async (resolve) => {
            const middlewareHandler = middleware.handler as RouteFunctionalHandler<AdditionalDataType>;
            
            // If length is 4, it means they want to wait until next() is called
            // If it's 3, just await promise and continue!
            const hasNextCallback = middlewareHandler.length === 4;
            
            
            if (hasNextCallback) {
                middlewareHandler(
                    request,
                    response,
                    request.additionalData!,
                    (abort?: boolean) => {
                        return resolve(!abort);
                    }
                );
            } else {
                await (async () => middlewareHandler(
                    request,
                    response,
                    request.additionalData!
                ));
                
                console.log("finished with middleware");
                resolve(true);
            }
        });
    }
    
    public async serveRequest (
        incomingRequest: Request,
        additionalData: AdditionalDataType
    ): Promise<BuiltResponseObject<AdditionalDataType>> {
        if (!this.isMainRouter) {
            this.assignSelfAsMainRouter();
        }
        
        
        const routerRequest = new RouterRequest(
            incomingRequest,
            additionalData
        );
        const routerResponse = new RouterResponse(
            routerRequest
        );
        
        return this.processRequest(
            routerRequest,
            routerResponse
        );
    }
    
    public getMainRouter (): Router<AdditionalDataType> {
        if (this.parentRouter) {
            return this.parentRouter.getMainRouter();
        } else {
            if (this.isMainRouter) {
                return this;
            } else {
                throw new Error(`Error! Got to a top-level router that wasn't declared as main router!`);
            }
        }
    }
};
