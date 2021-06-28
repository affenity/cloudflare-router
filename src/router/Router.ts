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
    customResponseBuilder?: (routerResponse: RouterResponse<AdditionalDataType>) => any;
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
    
    /**
     * If you want to build your own responses from the data collected from your application, you do it here
     * The only argument in the callback function is the RouterResponse instance.
     * @type {RouterOptions<AdditionalDataType>["customResponseBuilder"]}
     */
    public customResponseBuilder: RouterOptions<AdditionalDataType>["customResponseBuilder"];
    
    
    /**
     * Creates a new Router. Only one router can be used for .serveRequest(), attempting to use multiple routers for
     * this will result in an error.
     * @param {RouterOptions<AdditionalDataType>} options
     */
    constructor (options?: RouterOptions<AdditionalDataType>) {
        this.basePath = options?.basePath ?? "/";
        this.isWaterfallHandling = options?.waterfallHandling ?? false;
        this.customResponseBuilder = options?.customResponseBuilder ?? undefined;
        this.routes = [];
        this.parentRouter = options?.parent ?? null;
        this.mainRouter = null;
        this.isMainRouter = false;
    }
    
    /**
     * Used internally when the router.use() method is called to update the descendants of the router (all connected
     * routers and routes)
     * @param {string} newBasePath
     * @param {Router<AdditionalDataType>} parentRouter
     */
    public init (newBasePath: string, parentRouter?: Router<AdditionalDataType>) {
        this.basePath = "/";
        this.basePath = this.fixPath(newBasePath || "/");
        this.parentRouter = parentRouter || null;
        
        this.updateSelfRoutes();
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
        
        // info: DEBUG
        // console.log(`To fix path! Input: ${ inputPath }. Output: ${ fixedPath }`);
        
        return fixedPath;
    }
    
    /**
     * Updates the routes this router has set up. Used internally on router.init() (which is also called internally)
     */
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
    
    /**
     * Used internally as a standardized way of registering routes. Normally you want to use .get() or .post(), but
     * this method is also available. This will only create a route, not apply it to the router. Use
     * router.createRouteAndAdd() to add the route to the router automatically.
     * @param {RouteOptions<AdditionalDataType>} options
     * @returns {Route<AdditionalDataType>}
     */
    public createRoute (options: RouteOptions<AdditionalDataType>): Route<AdditionalDataType> {
        return new Route(
            this,
            options
        );
    }
    
    
    /**
     * Creates a route and adds it to the current router instance. Used internally to standardize the way of creating
     * routes. Normally you'll want to use .get() or .post() to set up routes.
     * @param {RouteOptions<AdditionalDataType>} options
     * @returns {Route<AdditionalDataType>}
     */
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
        
        usePath = this.fixPath(usePath);
        
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
    
    /**
     * Makes it easier to set up a batch of .use "commands". Provide the array with (optional) pathname and the
     * handler for it.
     * @param {{path?: string, handler: RouteHandler<AdditionalDataType>}[]} list
     */
    public useBulk (list: { path?: string; handler: RouteHandler<AdditionalDataType>; }[]): void {
        for (let i = 0; i < list.length; i++) {
            const listEntry = list[i];
            this.use(listEntry.path || listEntry.handler, listEntry.handler);
        }
    }
    
    /**
     * Used internally, which will declare this router as the main router. Note there can only be one main router,
     * otherwise unexpected issues can arise, and will most likely throw errors.
     */
    assignSelfAsMainRouter (): void {
        if (this.mainRouter !== null) {
            throw new Error(`Cannot assign self router as the main router when there is already another router instance considered a main one!`);
        }
        
        this.isMainRouter = true;
        
        // Update all descendants
    }
    
    /**
     * Used internally to recursively look for routes that match the path and method. Will return anything that matches
     * regardless if it's a middleware or not. Anything that's a route will be returned as long as it matches.
     * @param {RouterRequest<AdditionalDataType>} request
     * @returns {MatchingRoute<AdditionalDataType>[]}
     */
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
    
    /**
     * Adds a handler for a request that hits this path using the GET HTTP method.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public get (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "GET",
            isMiddleware: false
        });
    }
    
    /**
     * Adds a handler for a request that hits this path using the POST HTTP method.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public post (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "POST",
            isMiddleware: false
        });
    }
    
    /**
     * Adds a handler for a request that hits this path using the OPTIONS HTTP method.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public options (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "OPTIONS",
            isMiddleware: false
        });
    }
    
    /**
     * Adds a handler for a request that hits this path using the HEAD HTTP method.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public head (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "HEAD",
            isMiddleware: false
        });
    }
    
    /**
     * Adds a handler for a request that hits this path using the DELETE HTTP method.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public delete (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "DELETE",
            isMiddleware: false
        });
    }
    
    /**
     * Adds a handler for a request that hits this path regardless of the method used.
     * @param {string} path
     * @param {RouteHandler<AdditionalDataType>} handler
     */
    public any (path: string, handler: RouteHandler<AdditionalDataType>): void {
        this.createRouteAndAdd({
            path,
            handler,
            method: "ANY",
            isMiddleware: false
        });
    }
    
    /**
     * Used internally for further processing of the request (and getting a response from the application)
     * @param {RouterRequest<AdditionalDataType>} routerRequest
     * @param {RouterResponse<AdditionalDataType>} routerResponse
     * @returns {Promise<BuiltResponseObject<AdditionalDataType>>}
     */
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
            .sort((a, b) => a.route.routeIndex - b.route.routeIndex);
        
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
            routerResponse
        );
        
        return this.finishResponse(routerRequest, routerResponse);
    }
    
    /**
     * Used internally when the response instance is finalized and ready to return the response data.
     * @param {RouterRequest<AdditionalDataType>} _request
     * @param {RouterResponse<AdditionalDataType>} response
     * @returns {Promise<BuiltResponseObject<AdditionalDataType>>}
     */
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
    
    /**
     * Used internally when wanting to execute a middleware (running it, not.. beheading it.. jeez). It returns a
     * promise which contains a boolean indicating the success status. If one middleware is failing or wants to abort
     * further processing, next(true) is used to indicate this.
     * @param {Route<AdditionalDataType>} middleware
     * @param {RouterRequest<AdditionalDataType>} request
     * @param {RouterResponse<AdditionalDataType>} response
     * @returns {Promise<boolean>}
     */
    public async executeMiddleware (
        middleware: Route<AdditionalDataType>,
        request: RouterRequest<AdditionalDataType>,
        response: RouterResponse<AdditionalDataType>
    ): Promise<boolean> {
        return new Promise(async (resolve) => {
            const middlewareHandler = middleware.handler as RouteFunctionalHandler<AdditionalDataType>;
            
            // If length is 4, it means they want to wait until next() is called
            // If it's 3, just await promise and continue!
            const hasNextCallback = middlewareHandler.length === 3;
            
            
            if (hasNextCallback) {
                middlewareHandler(
                    request,
                    response,
                    (proceed = true) => {
                        return resolve(proceed);
                    }
                );
            } else {
                await (async () => middlewareHandler(
                    request,
                    response
                ));
                
                resolve(true);
            }
        });
    }
    
    /**
     * The method to serve the incoming request and pass it on to cloudflare-router for processing. Use only this
     * method unless you know what you're doing.
     * @param {Request} incomingRequest
     * @param {AdditionalDataType} additionalData
     * @returns {Promise<BuiltResponseObject<AdditionalDataType>>}
     */
    public async serveRequest (
        incomingRequest: Request,
        additionalData: AdditionalDataType
    ): Promise<BuiltResponseObject<AdditionalDataType>> {
        if (!this.mainRouter && !this.isMainRouter) {
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
    
    /**
     * Used internally for getting the router which is considered the main router. There can (*should*) only be one
     * main router, otherwise unexpected issues may arise, and errors will most likely be thrown.
     * @returns {Router<AdditionalDataType>}
     */
    public getMainRouter (): Router<AdditionalDataType> {
        if (this.parentRouter) {
            return this.parentRouter.getMainRouter();
        }
        
        if (this.isMainRouter) {
            return this;
        } else {
            throw new Error(`Error! Got to a top-level router that wasn't declared as main router!`);
        }
    }
};
