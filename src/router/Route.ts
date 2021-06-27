import Router, { Methods } from "./Router";
import RoutePath from "./RoutePath";
import RouterRequest from "./RouterRequest";
import RouterResponse from "./RouterResponse";


export interface RouteOptions<AdditionalDataType extends unknown> {
    path: string;
    handler: RouteHandler<AdditionalDataType>;
    method: Methods;
    isMiddleware: boolean;
    routeIndex?: number;
}


export type RouteFunctionalHandler<AdditionalDataType extends unknown> = (
    request: RouterRequest<AdditionalDataType>,
    response: RouterResponse<AdditionalDataType>,
    additionalData: AdditionalDataType,
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
    
    constructor (router: Router<AdditionalDataType>, options: RouteOptions<AdditionalDataType>) {
        this.router = router;
        this.method = options.method;
        this.path = new RoutePath(this, options.path);
        this.handler = options.handler;
        this.isMiddleware = options.isMiddleware || this.isRouteMiddleware();
        this.isHandlerRouter = this.isRouteHandlerRouter();
        
        this.routeIndex = options.routeIndex || lastRouteIndex++;
    }
    
    isRouteMiddleware (): boolean {
        return this.handler instanceof Router ? false : !!this.isMiddleware;
    }
    
    isRouteHandlerRouter (): boolean {
        return this.handler instanceof Router;
    }
    
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
