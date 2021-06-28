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

In order to tell the module when it should process a request (or more specifically ,telling the *router*):

```JavaScript
const { Router } = require("cloudflare-router");
const router = new Router();
const apiRouter = new Router();

// Connecting routers
router.use("/api", apiRouter);

// Setting up paths
router.get("/", (req, res) => res.text("Hello, world!"));
apiRouter.get("/", (req, res) => res.text("Welcome to the API!"));
apiRouter.get("/welcome/:name", (req, res) => res.text(`Welcome, ${req.params.name}`));

// Listening for requests
addEventListener("fetch", event => {
    // Minimal boilerplate required
    event.respondWith(
        router.serve(event.request)
            .then(res => res.response)
    );
});

```

### Installing

Simply enter the following command into your terminal:

```
npm install cloudflare-router
```

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FVisualizememe%2Fcloudflare-router?ref=badge_large)
