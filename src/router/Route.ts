import Router, { Methods } from "./Router";
import RoutePath from "./RoutePath";
import RouterRequest from "./RouterRequest";
import RouterResponse from "./RouterResponse";


export interface RouteOptions<AdditionalDataType extends unknown> {
    /**
     * The relative path for the route. The Route class instance will automatically fetch the basepath
     * and make the path accurate.
     */
    path: string;
    /**
     * The handler that will process matching requests
     */
    handler: RouteHandler<AdditionalDataType>;
    /**
     * Which method this route will handle ("ANY" will handle all methods)
     */
    method: Methods;
    /**
     * If this is a middleware (don't provide this unless you know what you're doing)
     */
    isMiddleware: boolean;
    /**
     * Used internally when updating routes, which happens when you use router.use()
     */
    routeIndex?: number;
}


/**
 * The handler for a certain route
 */
export type RouteFunctionalHandler<AdditionalDataType extends unknown> = (
    request: RouterRequest<AdditionalDataType>,
    response: RouterResponse<AdditionalDataType>,
    next?: (abort?: boolean) => void
) => void;
export type RouteHandler<AdditionalDataType extends unknown> =
    Router<AdditionalDataType>
    | RouteFunctionalHandler<AdditionalDataType>;


let lastRouteIndex = 0;


export default class Route<AdditionalDataType extends unknown> {
    /**
     * The Router class instance responsible for creating this route
     * @type {Router<AdditionalDataType>}
     */
    public router: Router<AdditionalDataType>;
    
    /**
     * The method that this route accepts
     * @type {Methods}
     */
    public method: Methods;
    /**
     * The route's path object
     * @type {RoutePath}
     */
    public path: RoutePath<AdditionalDataType>;
    /**
     * The Router/function that will handle the route when matched
     * @type {RouteHandler<AdditionalDataType>}
     */
    public handler: RouteHandler<AdditionalDataType>;
    /**
     * If this is a middleware (as in it will do something before the final non-middleware route, AKA pre-processing).
     * @type {boolean}
     */
    public isMiddleware: boolean;
    /**
     * If the handler to this route is a Router.
     * @type {boolean}
     */
    public isHandlerRouter: boolean;
    /**
     * The "index" for this route, counted globally. It's used to know which order to execute middlewares in.
     * @type {number}
     */
    public routeIndex: number;
    
    /**
     * Creates a Route class instance
     * @param {Router<AdditionalDataType>} router
     * @param {RouteOptions<AdditionalDataType>} options
     */
    constructor (router: Router<AdditionalDataType>, options: RouteOptions<AdditionalDataType>) {
        this.router = router;
        this.method = options.method;
        this.path = new RoutePath(this, options.path);
        this.handler = options.handler;
        this.isMiddleware = options.isMiddleware || this.isRouteMiddleware();
        this.isHandlerRouter = this.isRouteHandlerRouter();
        
        this.routeIndex = options.routeIndex || lastRouteIndex++;
    }
    
    /**
     * Returns whether this route is used as a middleware or not, by programmatically checking if the handler
     * is an instance of the Router object.
     * @returns {boolean}
     */
    isRouteMiddleware (): boolean {
        return this.handler instanceof Router ? false : !!this.isMiddleware;
    }
    
    /**
     * Returns whether the handler for this route is an instance of the Router object.
     * @returns {boolean}
     */
    isRouteHandlerRouter (): boolean {
        return this.handler instanceof Router;
    }
    
    /**
     * Returns information about the match from an incoming request, such as if it matches the path & method, and
     * any data from the UrlPattern API.
     * @param {RouterRequest<AdditionalDataType>} request
     * @returns {{pathMatchData: any, pathMatches: boolean, methodMatches: boolean}}
     */
    matchesRequest (request: RouterRequest<AdditionalDataType>) {
        const pathMatchResult = this.path.matchesInputPath(request.path);
        const methodMatches = this.method === "ANY" ? true : (this.method.toUpperCase() === request.method.toUpperCase());
        
        return {
            pathMatches: pathMatchResult.doesMatch && methodMatches,
            pathMatchData: pathMatchResult.matchData,
            methodMatches
        };
    }
};
