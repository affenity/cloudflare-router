import UrlPattern from "url-pattern";
import Route from "./Route";


export default class RoutePath<AdditionalDataType> {
    /**
     * The route that this path belongs to
     * @type {Route<AdditionalDataType>}
     */
    public route: Route<AdditionalDataType>;
    /**
     * The URL pattern used for matching incoming requests
     * @type {UrlPattern}
     */
    public urlPattern: UrlPattern;
    /**
     * The path after it's been formatted and fixed properly (i.e. trailing /, etc.)
     * @type {string}
     */
    public fixedPath: string;
    /**
     * The "raw" input path that was provided to this RoutePath instance, before it was "fixed"
     * @type {string}
     */
    public inputPath: string;
    
    constructor (route: Route<AdditionalDataType>, inputPath: string) {
        this.route = route;
        this.inputPath = inputPath;
        this.fixedPath = this.fixPath(this.inputPath);
        this.urlPattern = this.createPatternFromPath(this.fixedPath);
    }
    
    fixPath (inputPath: string): string {
        return this.route.router.fixPath(inputPath);
    }
    
    
    /**
     * If this RoutePath instance matches with a given input (request) path
     * @param {string} inputPath
     * @returns {any }
     */
    matchesInputPath (inputPath: string) {
        const matchResult = this.urlPattern.match(inputPath);
        
        return {
            doesMatch: !!matchResult,
            matchData: matchResult
        };
    }
    
    /**
     * Creates a URL Pattern from the given argument "path"
     * @param {string} path
     * @returns {UrlPattern}
     */
    createPatternFromPath (path: string): UrlPattern {
        return new UrlPattern(path);
    }
};
