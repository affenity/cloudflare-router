Cloudflare-Router
===============
A library for easily processing incoming requests to Cloudflare Workers. Created with TypeScript!

----
[![NPM](https://img.shields.io/npm/v/cloudflare-router.svg?maxAge=3600&style=flat-square)](https://npmjs.com/package/cloudflare-router)
[![CircleCI](https://circleci.com/gh/Visualizememe/cloudflare-router.svg?style=svg)](https://circleci.com/gh/Visualizememe/cloudflare-router)
[![codecov](https://codecov.io/gh/Visualizememe/cloudflare-router/branch/main/graph/badge.svg)](https://codecov.io/gh/Visualizememe/cloudflare-router)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4a69949081d1427db95bf450453adda2)](https://www.codacy.com/gh/Visualizememe/cloudflare-router/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Visualizememe/cloudflare-router&amp;utm_campaign=Badge_Grade)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router?ref=badge_shield)
[![Dependencies Status](https://status.david-dm.org/gh/Visualizememe/cloudflare-router.svg)](https://david-dm.org/Visualizememe/cloudflare-router)

----


This module is super-easy to use, and it's plug-and-play. Literally. All you have to do to start is to tell the module
when you want to process a request, and it will handle everything for you.

### Installing

Simply enter the following command into your terminal:

```
npm install cloudflare-router
```
alternatively
```
yarn add cloudflare-router
```

-----
Here's a short example on how to use cloudflare-router!

```typescript
import { Router } from "cloudflare-router";


const router = new Router();
const api = new Router();

router.use("/api", api);

// -> your-website.com/api/time
api.get("/time", (req, res) => {
    return res
        .statusCode(200)
        .json({
            success: true,
            time: new Date().toISOString()
        });
});

// -> your-website.com/
router.get("/", (req, res) => {
    return res.text("Welcome to my worker!");
});

// -> your-website.com/greet/Martin
router.get("/greet/:name", (req, res) => {
    return res.text(`Hello there, ${ req.matchedParams.name }`);
});


// Connecting it to the "fetch" event
addEventListener("fetch", event => {
    return event.respondWith(
        router.serveRequest(event.request, {/* extra data */ })
            .then(built => built.response)
    );
});

```

### Middlewares and API

Cloudflare-router had the goal to be very similar to express in action, but there are still minor differences.

#### Using middlewares - the API

```TypeScript
const router = new Router();

// This middleware will be called for every request to your-website.com/
// but just that path. 
router.use((req, res, next) => {
    res.locals.middlewareUsed = true;
    
    // If you want it to end at this middleware (no further processing)
    // change it to next(false). For example if auth failed.
    next();
});

/*
    When the above middleware will execute:
    ✔ your-website.com/
    ❌ your-website.com/hi
    ❌ your-website.com/hi/there
 */

// To make it run on every path (and sub-paths, if you can call it that)
// you need to add the path pattern, like this:
router.use("/*", (req, res, next) => {
    res.locals.middlewareUsed = true;
    
    next();
});

/*
    When the above middleware will execute:
    ✔ your-website.com/
    ✔ your-website.com/hi
    ✔ your-website.com/hi/there
 */
```

#### An example of real-world use

*Checking that a request has a valid auth key before processing further*

```typescript
router.use("/api*", (req, res, next) => {
    const isAuthKeyValid = false;
    
    if (!isAuthKeyValid) {
        res
            .statusCode(401)
            .json({
                success: false,
                message: "Invalid auth key!"
            });
        
        // This will stop the request processing at this point
        return next(false);
    }
    
    // Otherwise, we'll let them pass!
    next();
});

router.get("/api/", (req, res) => {
    return res
        .statusCode(200)
        .json({
            success: true,
            message: "You have access to the API!"
        });
});
```

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router?ref=badge_large)
